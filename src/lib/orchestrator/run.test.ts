import { describe, it, expect, vi } from 'vitest';
import { runModel, type RunStatus } from './run';
import type { DesignRequest, IllustrationResult, Insured, Quote } from '$lib/domain';
import { createQuote } from '$lib/domain';
import { makeInsured } from '$lib/testing/fixtures';

function insured(overrides: Partial<Insured>): Insured {
	return makeInsured({
		id: 'i',
		firstName: 'A',
		lastName: 'B',
		gender: 'Male',
		dateOfBirth: '1975-06-15',
		currentSalary: '200000',
		planMembership: 'BOTH',
		...overrides
	});
}

function quoteWith(census: Insured[]): Quote {
	const quote = createQuote({ id: 'q', companyName: 'Acme', corporateTaxRate: 0.21 });
	quote.census = census;
	return quote;
}

function illustrationFor(premium: string): IllustrationResult {
	return {
		years: [
			{
				policyYear: 1,
				age: 51,
				premium,
				accountValue: '1000.00',
				cashSurrenderValue: '900.00',
				deathBenefit: '500000.00'
			}
		],
		gptAdjusted: false,
		mecAdjusted: false,
		solvedAnnualPremium: premium,
		guideline: { singlePremium: '0.00', levelPremiumA: '0.00', levelPremiumB: '0.00' }
	};
}

describe('runModel (FR23, AR9, AR12)', () => {
	const asOf = '2027-06-15';

	it('designs all four options for a SERP+COLI participant, Option 1 only for COLI-only', async () => {
		const census = [
			insured({ id: 'a', planMembership: 'BOTH' }),
			insured({ id: 'b', planMembership: 'COLI' }), // no SERP benefit → nothing to distribute
			insured({ id: 'serpOnly', planMembership: 'SERP' }) // excluded from COLI design
		];
		const requests: DesignRequest[] = [];
		const illustrate = vi.fn(async (request: DesignRequest) => {
			requests.push(request);
			return illustrationFor('5000.00');
		});

		const statuses: RunStatus[] = [];
		const progress: Array<[number, number]> = [];
		const output = await runModel({
			quote: quoteWith(census),
			asOf,
			illustrate,
			onStatus: (s) => statuses.push(s),
			onProgress: (c, t) => progress.push([c, t])
		});

		// 'a' gets all four options; 'b' has no benefit stream so only Option 1; 'serpOnly' none.
		expect(output.designed.filter((d) => d.insuredId === 'a').map((d) => d.strategyId)).toEqual([
			'cost-recovery',
			'benefit-distribution',
			'premium-deposit',
			'premium-recovery'
		]);
		expect(output.designed.filter((d) => d.insuredId === 'b').map((d) => d.strategyId)).toEqual([
			'cost-recovery'
		]);
		expect(output.designed.some((d) => d.insuredId === 'serpOnly')).toBe(false);
		// The plan-level crediting rate reaches every illustration (default 0.0575).
		expect(requests.every((r) => r.creditedRate === 0.0575)).toBe(true);
		expect(statuses).toEqual(['computing', 'designing']);
		// Progress counts options, not participants: 4 for 'a' + 1 for 'b'.
		expect(progress.at(-1)).toEqual([5, 5]);
	});

	it('chains Option 3 and Option 4 off Option 2 solved premium', async () => {
		const requests: DesignRequest[] = [];
		// Option 2 solves 9000; the recovery solve comes back under it, so the floor applies.
		const illustrate = vi.fn(async (request: DesignRequest) => {
			requests.push(request);
			const isRecoverySolve = request.solve?.target === 'premium_recovery';
			return illustrationFor(isRecoverySolve ? '4000.00' : '9000.00');
		});

		await runModel({
			quote: quoteWith([insured({ id: 'a', planMembership: 'BOTH' })]),
			asOf,
			illustrate
		});

		// Option 3 specifies Option 2's premium rather than solving its own.
		const deposit = requests[2];
		expect(deposit.solve).toBeUndefined();
		expect(deposit.premiumPeriods?.[0]).toMatchObject({ kind: 'specify', amount: '9000.00' });
		// Option 4 solves first, comes in under Option 2, and is re-run at the floor.
		expect(requests[3].solve?.target).toBe('premium_recovery');
		expect(requests).toHaveLength(5);
		expect(requests[4].solve).toBeUndefined();
		expect(requests[4].premiumPeriods?.[0]).toMatchObject({ kind: 'specify', amount: '9000.00' });
	});

	it('sends the product type on every option — the engine defaults to VUL without it', async () => {
		const requests: DesignRequest[] = [];
		const illustrate = vi.fn(async (request: DesignRequest) => {
			requests.push(request);
			return illustrationFor('5000.00');
		});
		const quote = quoteWith([insured({ id: 'a', planMembership: 'BOTH' })]);
		quote.modelSettings = { ...quote.modelSettings, productType: 'IUL' };

		await runModel({ quote, asOf, illustrate });

		expect(requests).toHaveLength(4);
		expect(requests.every((r) => r.productType === 'IUL')).toBe(true);
	});

	it('stops the chain when Option 2 is infeasible rather than anchoring 3 and 4 to it', async () => {
		// An infeasible solve still returns 200 with a best-effort premium that can be wildly out
		// of range. Options 3 and 4 carry no solve of their own, so building them on it would
		// produce two designs that look clean while resting on a failed solve.
		const requests: DesignRequest[] = [];
		const illustrate = vi.fn(async (request: DesignRequest) => {
			requests.push(request);
			const result = illustrationFor('99999999.00');
			return request.solve
				? { ...result, solve: { feasible: request.solve.target === 'specify' ? false : true } }
				: result;
		});

		const output = await runModel({
			quote: quoteWith([insured({ id: 'a', planMembership: 'BOTH' })]),
			asOf,
			illustrate
		});

		// Option 1 and the failed Option 2 are kept — the infeasibility must stay visible.
		expect(output.designed.map((d) => d.strategyId)).toEqual([
			'cost-recovery',
			'benefit-distribution'
		]);
		expect(requests).toHaveLength(2);
	});

	it('leaves Option 4 on its own solve when it already funds above Option 2', async () => {
		const requests: DesignRequest[] = [];
		const illustrate = vi.fn(async (request: DesignRequest) => {
			requests.push(request);
			const isRecoverySolve = request.solve?.target === 'premium_recovery';
			return illustrationFor(isRecoverySolve ? '12000.00' : '9000.00');
		});

		await runModel({
			quote: quoteWith([insured({ id: 'a', planMembership: 'BOTH' })]),
			asOf,
			illustrate
		});

		// No floored re-run: four calls, not five.
		expect(requests).toHaveLength(4);
	});

	it('splits the tax-adjusted death benefit equally across COLI participants', async () => {
		// 0% growth/discount, 60% benefit; the exact numbers are covered by engine tests — here
		// we just assert the two Option 1 faces are equal (equal split) and total DB is positive.
		const census = [
			insured({ id: 'a', planMembership: 'BOTH' }),
			insured({ id: 'b', planMembership: 'BOTH' })
		];
		const illustrate = vi.fn(async () => illustrationFor('5000.00'));
		const output = await runModel({ quote: quoteWith(census), asOf, illustrate });

		const costRecovery = output.designed.filter((d) => d.strategyId === 'cost-recovery');
		expect(costRecovery).toHaveLength(2);
		expect(costRecovery[0].faceAmount.eq(costRecovery[1].faceAmount)).toBe(true);
		expect(output.totalDeathBenefit.gt(0)).toBe(true);
	});

	it('returns designs in census order regardless of scheduling (reproducible, NFR11)', async () => {
		const census = ['a', 'b', 'c', 'd'].map((id) => insured({ id, planMembership: 'COLI' }));
		// Resolve the later participants first, so completion order is the reverse of census order.
		let call = 0;
		const illustrate = vi.fn(async () => {
			const delay = (4 - call++) * 5;
			await new Promise((resolve) => setTimeout(resolve, delay));
			return illustrationFor('5000.00');
		});

		const output = await runModel({
			quote: quoteWith(census),
			asOf,
			illustrate,
			concurrency: 4
		});

		expect(output.designed.map((d) => d.insuredId)).toEqual(['a', 'b', 'c', 'd']);
	});

	it('handles a census with no COLI participants (no illustration calls)', async () => {
		const illustrate = vi.fn(async () => illustrationFor('0.00'));
		const output = await runModel({
			quote: quoteWith([insured({ id: 's', planMembership: 'SERP' })]),
			asOf,
			illustrate
		});
		expect(illustrate).not.toHaveBeenCalled();
		expect(output.designed).toEqual([]);
	});

	it('fails fast: the first error aborts the remaining calls (Story 3.8, FR25)', async () => {
		const census = [
			insured({ id: 'a', planMembership: 'BOTH' }),
			insured({ id: 'b', planMembership: 'BOTH' })
		];
		const illustrate = vi.fn(async () => {
			throw Object.assign(new Error('engine down'), { kind: 'connectivity' });
		});

		await expect(
			// Concurrency 1 makes the assertion exact: with a pool, participants already in flight
			// when the first error lands will have issued their own call too.
			runModel({ quote: quoteWith(census), asOf, illustrate, concurrency: 1 })
		).rejects.toThrow('engine down');
		// The second participant is never started — remaining work is abandoned.
		expect(illustrate).toHaveBeenCalledTimes(1);
	});

	it('aborts in-flight work in other participants when one fails', async () => {
		const census = ['a', 'b', 'c', 'd'].map((id) => insured({ id, planMembership: 'COLI' }));
		const aborted: boolean[] = [];
		let call = 0;
		const illustrate = vi.fn((_request: DesignRequest, signal?: AbortSignal) => {
			const index = call++;
			// The first call fails immediately; the others hang until their signal aborts.
			if (index === 0) return Promise.reject(new Error('engine down'));
			return new Promise<IllustrationResult>((_, reject) => {
				signal?.addEventListener('abort', () => {
					aborted.push(true);
					reject(new Error('aborted'));
				});
			});
		});

		await expect(
			runModel({ quote: quoteWith(census), asOf, illustrate, concurrency: 4 })
		).rejects.toThrow('engine down');
		// The three concurrent participants were cancelled rather than left running.
		expect(aborted).toHaveLength(3);
	});

	it('fails the call on a per-call timeout (no silent hang, NFR10)', async () => {
		// A call that only settles when its signal aborts; with a tiny timeout it is aborted.
		const illustrate = vi.fn(
			(_request, signal?: AbortSignal) =>
				new Promise<never>((_, reject) => {
					signal?.addEventListener('abort', () => reject(new Error('aborted by timeout')));
				})
		);
		await expect(
			runModel({
				quote: quoteWith([insured({ id: 'a', planMembership: 'BOTH' })]),
				asOf,
				illustrate,
				timeoutMs: 5
			})
		).rejects.toThrow('aborted by timeout');
	});

	it('never mutates the input quote, even on failure (FR26)', async () => {
		const quote = quoteWith([insured({ id: 'a', planMembership: 'BOTH' })]);
		const before = JSON.stringify(quote);
		const illustrate = vi.fn(async () => {
			throw new Error('boom');
		});
		await runModel({ quote, asOf, illustrate }).catch(() => {});
		expect(JSON.stringify(quote)).toBe(before);
	});
});
