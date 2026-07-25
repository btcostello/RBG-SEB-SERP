/**
 * Accounting module — STUB tests.
 *
 * The GAAP figures are not built, so there is nothing to assert about them yet. What these lock
 * down is the module's *seam*: the real axis derivation (plan year → calendar year), the
 * life-of-program horizon, the per-option / per-participant keying, and — most importantly — that
 * every monetary figure comes back `null` so the stub can never print a fabricated number.
 */
import { describe, expect, it } from 'vitest';
import type { Results } from '$lib/domain';
import { makeInsured, makeSettings } from '$lib/testing/fixtures';
import { computeAccounting, lifeOfProgramHorizon } from './accounting-projection';

const company = { name: 'Acme', corporateTaxRate: 0.21 };
const refDate = '2026-01-01';

/** A results snapshot: one SERP+COLI life with a short benefit stream and a short COLI stream. */
function makeResults(): Results {
	return {
		perParticipant: [
			{
				insuredId: 'i1',
				finalAverageSalary: '100000.00',
				annualBenefit: '60000.00',
				// Benefit at attained ages 66–67; the fixture DOB makes current age 59 at refDate.
				benefitStream: [
					{ age: 66, amount: '60000.00' },
					{ age: 67, amount: '60000.00' }
				],
				totalBenefitCost: '120000.00',
				netPresentValue: '120000.00',
				designs: {
					'cost-recovery': {
						faceAmount: '100000.00',
						firstYearPremium: '5000.00',
						illustrationYears: [
							{
								policyYear: 1,
								age: 60,
								premium: '5000.00',
								accountValue: '4000.00',
								cashSurrenderValue: '0.00',
								deathBenefit: '100000.00'
							},
							{
								policyYear: 2,
								age: 61,
								premium: '5000.00',
								accountValue: '9000.00',
								cashSurrenderValue: '3000.00',
								deathBenefit: '100000.00'
							}
						]
					}
				}
			}
		],
		aggregate: { totalBenefitCost: '120000.00', netPresentValue: '120000.00' },
		asOf: refDate
	};
}

const params = () => ({
	results: makeResults(),
	census: [makeInsured({ id: 'i1', planMembership: 'BOTH', dateOfBirth: '1967-06-15' })],
	company,
	settings: makeSettings(),
	refDate
});

describe('lifeOfProgramHorizon', () => {
	it('is the last plan year across both benefit and illustration streams', () => {
		// Current age 59 at 2026-01-01; benefit at age 67 → plan year 8. Illustration reaches year 2.
		expect(lifeOfProgramHorizon(makeResults(), params().census, refDate)).toBe(8);
	});

	it('is zero for an empty snapshot', () => {
		const empty: Results = {
			perParticipant: [],
			aggregate: { totalBenefitCost: '0.00', netPresentValue: '0.00' }
		};
		expect(lifeOfProgramHorizon(empty, [], refDate)).toBe(0);
	});
});

describe('computeAccounting (stub)', () => {
	it('reports itself as not built', () => {
		expect(computeAccounting(params()).status).toBe('not-built');
	});

	it('derives the real plan-year → calendar-year axis over the full horizon', () => {
		const result = computeAccounting(params());
		expect(result.referenceYear).toBe(2026);
		expect(result.serp).toHaveLength(result.horizonPlanYears);
		expect(result.serp[0]).toMatchObject({ planYear: 1, calendarYear: 2026 });
		expect(result.serp.at(-1)).toMatchObject({ planYear: 8, calendarYear: 2033 });
	});

	it('keys a COLI series for each option the run designed, over the same axis', () => {
		const result = computeAccounting(params());
		expect(Object.keys(result.coliByOption)).toEqual(['cost-recovery']);
		expect(result.coliByOption['cost-recovery']).toHaveLength(result.horizonPlanYears);
	});

	it('keys a pension allocation for each SERP participant', () => {
		const result = computeAccounting(params());
		expect(result.byParticipant).toEqual([
			{ insuredId: 'i1', pensionExpense: null, percentOfTotal: null }
		]);
	});

	it('leaves every monetary figure null — the stub never fabricates a number', () => {
		const result = computeAccounting(params());
		const moneyFields = [
			'serviceCost',
			'interestCost',
			'priorServiceCostAmortization',
			'pensionExpense',
			'pboBoy',
			'pboEoy',
			'unrecognizedPriorServiceCostEoy',
			'aociEoy',
			'unfundedAccruedPensionCostEoy',
			'benefitTaxDeduction',
			'deferredTaxAssetEoy',
			'netSerpEarningsImpact'
		] as const;
		for (const year of result.serp) {
			for (const field of moneyFields) expect(year[field]).toBeNull();
		}
		for (const year of result.coliByOption['cost-recovery']) {
			expect(year.premium).toBeNull();
			expect(year.coliEarningsImpact).toBeNull();
			expect(year.combinedEarningsImpact).toBeNull();
		}
	});
});
