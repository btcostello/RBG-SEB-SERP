import { describe, it, expect, vi } from 'vitest';
import { runModel, type RunStatus } from './run';
import type { DesignRequest, IllustrationResult, Insured, Quote } from '$lib/domain';
import { createQuote } from '$lib/domain';

function insured(overrides: Partial<Insured>): Insured {
	return {
		id: 'i',
		firstName: 'A',
		lastName: 'B',
		gender: 'M',
		dateOfBirth: '1975-06-15',
		dateOfHire: '2005-01-01',
		currentSalary: '200000',
		benefitPercentage: 0.6,
		riskClass: 'Standard Non Tobacco',
		planMembership: 'BOTH',
		...overrides
	};
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

	it('computes then issues one sequential illustration call per COLI participant', async () => {
		const census = [
			insured({ id: 'a', planMembership: 'BOTH' }),
			insured({ id: 'b', planMembership: 'COLI' }),
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

		// One call per COLI participant (a, b) — not the SERP-only member.
		expect(illustrate).toHaveBeenCalledTimes(2);
		expect(output.designed.map((d) => d.insuredId)).toEqual(['a', 'b']);
		// Each request carries the solve target and a face from the equal split.
		expect(requests.every((r) => r.solve?.when === 100)).toBe(true);
		// Status transitions: computing then designing (done is emitted by the caller).
		expect(statuses).toEqual(['computing', 'designing']);
		// Progress ends at total/total.
		expect(progress.at(-1)).toEqual([2, 2]);
	});

	it('splits the tax-adjusted death benefit equally across COLI participants', async () => {
		// 0% growth/discount, 60% benefit; the exact numbers are covered by engine tests — here
		// we just assert the two faces are equal (equal split) and the total DB is positive.
		// BOTH = SERP (so there's a liability to fund) + COLI (so they get an illustration).
		const census = [
			insured({ id: 'a', planMembership: 'BOTH' }),
			insured({ id: 'b', planMembership: 'BOTH' })
		];
		const illustrate = vi.fn(async () => illustrationFor('5000.00'));
		const output = await runModel({ quote: quoteWith(census), asOf, illustrate });

		expect(output.designed).toHaveLength(2);
		expect(output.designed[0].faceAmount.eq(output.designed[1].faceAmount)).toBe(true);
		expect(output.totalDeathBenefit.gt(0)).toBe(true);
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
});
