/**
 * Accounting module tests.
 *
 * Two things are locked down: the module's *seam* (real plan-year → calendar-year axis, the
 * life-of-program horizon, per-option / per-participant keying, SERP figures still `null`), and
 * the *built* COLI earnings side — the operator formula `ΔAV − premium + death benefit at LE`
 * with the account value released at death, so lifetime earnings net to `death benefit − premiums`.
 */
import { describe, expect, it } from 'vitest';
import type { IllustrationYear, Results } from '$lib/domain';
import { makeInsured, makeSettings } from '$lib/testing/fixtures';
import {
	coliEarningsByOption,
	computeAccounting,
	lifeOfProgramHorizon
} from './accounting-projection';

const company = { name: 'Acme', corporateTaxRate: 0.21 };
const refDate = '2026-01-01';

/** An illustration year with only the fields the COLI calc reads. */
function illYear(
	o: Partial<IllustrationYear> & { policyYear: number; age: number }
): IllustrationYear {
	return {
		premium: '0.00',
		accountValue: '0.00',
		cashSurrenderValue: '0.00',
		deathBenefit: '0.00',
		...o
	};
}

/**
 * One SERP+COLI life. Death assumed at LE 84, which the illustration reaches at age 84 (policy
 * year 3). Premiums 10k in years 1–2; account value 8k → 17k → 25k; death benefit 100k.
 *
 * Expected per-year COLI earnings (ΔAV − premium + DB, AV released at death):
 *   yr1: 8,000 − 10,000            = −2,000
 *   yr2: (17,000−8,000) − 10,000   = −1,000
 *   yr3: (0−17,000) − 0 + 100,000  = 83,000   ← death year: AV released, DB recognized
 *   lifetime: −2,000 −1,000 +83,000 = 80,000  = DB 100,000 − premiums 20,000  ✓
 */
function makeResults(): Results {
	return {
		perParticipant: [
			{
				insuredId: 'i1',
				finalAverageSalary: '100000.00',
				// No SERP benefit at all, so the pension side stays zero and these tests isolate the
				// COLI side and the axis. The accounting layer derives its own expected stream from
				// annualBenefit rather than reading benefitStream, so leaving a 60,000 benefit here
				// with an empty stream would be internally inconsistent — and would produce an
				// obligation these assertions do not expect.
				annualBenefit: '0.00',
				benefitStream: [],
				totalBenefitCost: '0.00',
				netPresentValue: '0.00',
				designs: {
					'cost-recovery': {
						faceAmount: '100000.00',
						firstYearPremium: '10000.00',
						illustrationYears: [
							illYear({
								policyYear: 1,
								age: 82,
								premium: '10000.00',
								accountValue: '8000.00',
								deathBenefit: '100000.00'
							}),
							illYear({
								policyYear: 2,
								age: 83,
								premium: '10000.00',
								accountValue: '17000.00',
								deathBenefit: '100000.00'
							}),
							illYear({
								policyYear: 3,
								age: 84,
								premium: '0.00',
								accountValue: '25000.00',
								deathBenefit: '100000.00'
							})
						]
					}
				}
			}
		],
		aggregate: { totalBenefitCost: '0.00', netPresentValue: '0.00' },
		asOf: refDate
	};
}

/**
 * No survivor benefit either, so the SERP obligation really is nil and these tests isolate the
 * COLI side. The fixture's default tiers grant two years of salary on a pre-retirement death,
 * which the expected stream correctly values even when the retirement benefit is zero — see the
 * dedicated test for that below.
 */
const census = [
	makeInsured({
		id: 'i1',
		planMembership: 'BOTH',
		lifeExpectancy: 84,
		survivorTier1Pct: 0,
		survivorTier1Years: 0,
		survivorTier2Pct: 0,
		survivorTier2Years: 0
	})
];
const params = () => ({
	results: makeResults(),
	census,
	company,
	settings: makeSettings(),
	refDate
});

describe('lifeOfProgramHorizon', () => {
	it('is the last plan year across both benefit and illustration streams', () => {
		// No benefit stream here; the illustration reaches policy year 3.
		expect(lifeOfProgramHorizon(makeResults(), census, refDate)).toBe(3);
	});

	it('is zero for an empty snapshot', () => {
		const empty: Results = {
			perParticipant: [],
			aggregate: { totalBenefitCost: '0.00', netPresentValue: '0.00' }
		};
		expect(lifeOfProgramHorizon(empty, [], refDate)).toBe(0);
	});
});

describe('coliEarningsByOption (COLI earnings recognition)', () => {
	it('applies ΔAV − premium + DB, releasing the account value at the LE year', () => {
		const coli = coliEarningsByOption(makeResults(), census, 2026, 3);
		const rows = coli['cost-recovery'];
		expect(rows.map((r) => r.coliEarningsImpact)).toEqual(['-2000.00', '-1000.00', '83000.00']);
		// Death year: AV released to −prior, death benefit recognized.
		expect(rows[2]).toMatchObject({
			accountValueChange: '-17000.00',
			premium: '0.00',
			deathProceeds: '100000.00'
		});
	});

	it('nets lifetime COLI earnings to death benefit − premiums (no account-value double count)', () => {
		const rows = coliEarningsByOption(makeResults(), census, 2026, 3)['cost-recovery'];
		const lifetime = rows.reduce((sum, r) => sum + Number(r.coliEarningsImpact), 0);
		expect(lifetime).toBe(80000); // DB 100,000 − premiums 20,000
	});

	it('recognizes no death benefit when the policy never reaches its LE age (honest loss)', () => {
		const lapsed = makeResults();
		// Truncate the stream before the LE age; only premiums and AV changes remain.
		lapsed.perParticipant[0].designs!['cost-recovery'].illustrationYears = [
			illYear({
				policyYear: 1,
				age: 82,
				premium: '10000.00',
				accountValue: '8000.00',
				deathBenefit: '100000.00'
			})
		];
		const rows = coliEarningsByOption(lapsed, census, 2026, 3)['cost-recovery'];
		expect(rows[0]).toMatchObject({ deathProceeds: '0.00', coliEarningsImpact: '-2000.00' });
		// No contributions past the (unreached) death year.
		expect(rows[1].coliEarningsImpact).toBe('0.00');
		expect(rows[2].coliEarningsImpact).toBe('0.00');
	});
});

describe('computeAccounting (partial: COLI built, SERP pending)', () => {
	it('reports itself as partially built', () => {
		expect(computeAccounting(params()).status).toBe('partial');
	});

	it('derives the real plan-year → calendar-year axis over the full horizon', () => {
		const result = computeAccounting(params());
		expect(result.referenceYear).toBe(2026);
		expect(result.serp).toHaveLength(result.horizonPlanYears);
		expect(result.serp[0]).toMatchObject({ planYear: 1, calendarYear: 2026 });
		expect(result.serp.at(-1)).toMatchObject({ planYear: 3, calendarYear: 2028 });
	});

	it('populates the COLI series for each option the run designed', () => {
		const result = computeAccounting(params());
		expect(Object.keys(result.coliByOption)).toEqual(['cost-recovery']);
		expect(result.coliByOption['cost-recovery']).toHaveLength(result.horizonPlanYears);
		expect(result.coliByOption['cost-recovery'][2].coliEarningsImpact).toBe('83000.00');
	});

	it('allocates the reference-year pension expense per SERP participant (zero here — no benefit stream)', () => {
		const result = computeAccounting(params());
		expect(result.byParticipant).toEqual([
			{
				insuredId: 'i1',
				serviceCost: '0.00',
				priorServiceCostAmortization: '0.00',
				interestCost: '0.00',
				pensionExpense: '0.00',
				percentOfTotal: null // consolidated total is zero, so no meaningful share
			}
		]);
	});

	it('computes the SERP pension figures (zero here — the one life has no benefit stream)', () => {
		const result = computeAccounting(params());
		// The built pension columns resolve to values (0.00 for an empty benefit stream), not null.
		const builtFields = [
			'serviceCost',
			'interestCost',
			'priorServiceCostAmortization',
			'pensionExpense',
			'pboBoy',
			'pboEoy',
			'grossBenefitPayments',
			'annualUnfundedAccruedPensionCost',
			'unfundedAccruedPensionCostEoy',
			'unrecognizedPriorServiceCostBoy',
			'unrecognizedPriorServiceCostEoy',
			'benefitTaxDeduction',
			'netSerpEarningsImpact'
		] as const;
		for (const field of builtFields) expect(result.serp[0][field]).toBe('0.00');
		// The balance-sheet items are built too, and are zero on a zero obligation.
		expect(result.serp[0].aociEoy).toBe('0.00');
		expect(result.serp[0].aociNetOfTaxEoy).toBe('0.00');
		expect(result.serp[0].deferredTaxAssetEoy).toBe('0.00');
	});

	it('values a survivor benefit even when there is no retirement benefit', () => {
		// Dying before retirement is not the absence of a benefit — the plan pays the beneficiary.
		// A participant with no retirement benefit but a live survivor schedule still carries an
		// obligation, and weighting the retirement branch away without this one would understate it.
		const withSurvivor = computeAccounting({
			...params(),
			census: [makeInsured({ id: 'i1', planMembership: 'BOTH', lifeExpectancy: 84 })]
		});
		expect(Number(withSurvivor.serp[0].pboEoy)).toBeGreaterThan(0);
		expect(Number(withSurvivor.serp[0].serviceCost)).toBeGreaterThan(0);

		// And the isolated fixture, with the schedule switched off, carries none.
		expect(Number(computeAccounting(params()).serp[0].pboEoy)).toBe(0);
	});

	it('fills the combined column [5] = net SERP [3] + COLI [4]', () => {
		const result = computeAccounting(params());
		// Net SERP is 0 (no benefit stream), so combined equals COLI: 83,000 in the death year.
		expect(result.coliByOption['cost-recovery'][2].combinedEarningsImpact).toBe('83000.00');
	});
});

describe('discount rate split — accounting rate is independent of the liability NPV rate', () => {
	// A participant WITH a post-retirement benefit stream, so the PBO (and thus interest cost) is
	// non-zero and actually responds to the accounting discount rate.
	function resultsWithStream(): Results {
		return {
			perParticipant: [
				{
					insuredId: 'i1',
					finalAverageSalary: '100000.00',
					annualBenefit: '60000.00',
					benefitStream: [
						{ age: 65, amount: '60000.00' },
						{ age: 66, amount: '60000.00' },
						{ age: 67, amount: '60000.00' }
					],
					totalBenefitCost: '180000.00',
					netPresentValue: '180000.00'
				}
			],
			aggregate: { totalBenefitCost: '180000.00', netPresentValue: '180000.00' },
			asOf: refDate
		};
	}
	const base = () => ({ results: resultsWithStream(), census, company, refDate });

	it('carries AOCI as the unamortised prior service cost, and the DTA as PBO x tax rate', () => {
		// The two relationships the post-FAS 158 balance sheet rests on. The same arithmetic holds in
		// the source report: prior service cost 3,806,707 at 21% gives a 799,408 deferred tax
		// benefit, and a 3,862,213 obligation gives an 811,064 deferred tax asset.
		const result = computeAccounting({
			...base(),
			settings: makeSettings({ accountingDiscountRate: 0.0575 })
		});
		const taxRate = company.corporateTaxRate;
		expect(Number(result.serp[0].pboEoy)).toBeGreaterThan(0);
		// Within a cent: the module rounds once from full precision, while these recompute from a
		// figure that has already been rounded.
		const withinACent = (a: string | null, b: number) => Math.abs(Number(a) - b) <= 0.01;
		for (const year of result.serp.slice(0, 5)) {
			expect(year.aociEoy).toBe(year.unrecognizedPriorServiceCostEoy);
			expect(withinACent(year.aociNetOfTaxEoy, Number(year.aociEoy) * (1 - taxRate))).toBe(true);
			expect(withinACent(year.deferredTaxAssetEoy, Number(year.pboEoy) * taxRate)).toBe(true);
		}
	});

	it('SERP interest cost responds to the accounting rate (not the liability NPV rate)', () => {
		const zeroAcct = computeAccounting({
			...base(),
			settings: makeSettings({ npvDiscountRate: 0.05, accountingDiscountRate: 0 })
		});
		const posAcct = computeAccounting({
			...base(),
			settings: makeSettings({ npvDiscountRate: 0, accountingDiscountRate: 0.05 })
		});
		// A 0% accounting rate accrues no interest on the PBO; a 5% rate does.
		expect(zeroAcct.byParticipant[0].interestCost).toBe('0.00');
		expect(Number(posAcct.byParticipant[0].interestCost)).toBeGreaterThan(0);
	});

	it('changing ONLY the liability NPV rate leaves every SERP accounting figure unchanged', () => {
		const a = computeAccounting({
			...base(),
			settings: makeSettings({ npvDiscountRate: 0, accountingDiscountRate: 0.04 })
		});
		const b = computeAccounting({
			...base(),
			settings: makeSettings({ npvDiscountRate: 0.09, accountingDiscountRate: 0.04 })
		});
		expect(b.serp).toEqual(a.serp);
		expect(b.byParticipant).toEqual(a.byParticipant);
	});

	it('falls back to the liability rate when the accounting rate is unset (pre-split quotes)', () => {
		const explicit = computeAccounting({
			...base(),
			settings: makeSettings({ npvDiscountRate: 0.06, accountingDiscountRate: 0.06 })
		});
		const fallback = computeAccounting({
			...base(),
			settings: makeSettings({ npvDiscountRate: 0.06 }) // accountingDiscountRate absent
		});
		expect(fallback.serp).toEqual(explicit.serp);
		expect(fallback.byParticipant).toEqual(explicit.byParticipant);
	});
});
