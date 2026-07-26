import { describe, it, expect } from 'vitest';
import { deriveReport, formatPercent, longDate, shortDate, wholeDollars } from './report-data';
import { DEFAULT_MODEL_SETTINGS, SCHEMA_VERSION, type Quote } from '$lib/domain';
import { makeInsured } from '$lib/testing/fixtures';

describe('report formatters', () => {
	it('formats whole dollars with grouping (half-up at the display boundary)', () => {
		expect(wholeDollars('1234567.89')).toBe('$1,234,568');
		expect(wholeDollars('999.49')).toBe('$999');
		expect(wholeDollars('0.00')).toBe('$0');
	});

	it('formats rates as percentages', () => {
		expect(formatPercent(0.6)).toBe('60%');
		expect(formatPercent(0.03)).toBe('3%');
		expect(formatPercent(0.035)).toBe('3.5%');
		expect(formatPercent(0)).toBe('0%');
	});

	it('formats dates', () => {
		expect(longDate('2026-07-09')).toBe('July 9, 2026');
		expect(shortDate('1972-01-04')).toBe('1/4/1972');
	});
});

function buildQuote(): Quote {
	return {
		schemaVersion: SCHEMA_VERSION,
		id: 'q1',
		company: { name: 'Acme Widgets', corporateTaxRate: 0.21 },
		modelSettings: { ...DEFAULT_MODEL_SETTINGS },
		census: [
			makeInsured({
				id: 'a',
				firstName: 'Alice',
				lastName: 'Anders',
				gender: 'Female',
				dateOfBirth: '1976-03-15',
				dateOfHire: '2010-06-01',
				currentSalary: '400000.00',
				benefitPercentage: 0.6,
				riskClass: 'Preferred Non Tobacco',
				planMembership: 'BOTH'
			}),
			makeInsured({
				id: 'b',
				firstName: 'Bob',
				lastName: 'Baker',
				gender: 'Male',
				dateOfBirth: '1980-09-01',
				dateOfHire: '2015-01-15',
				currentSalary: '300000.00',
				benefitPercentage: 0.4,
				riskClass: 'Standard Non Tobacco',
				planMembership: 'SERP'
			})
		],
		results: {
			perParticipant: [
				{
					insuredId: 'a',
					finalAverageSalary: '500000.00',
					annualBenefit: '300000.00',
					benefitStream: [
						{ age: 65, amount: '300000.00' },
						{ age: 66, amount: '300000.00' }
					],
					totalBenefitCost: '600000.00',
					netPresentValue: '600000.00',
					faceAmount: '1000000.00',
					firstYearPremium: '50000.00',
					accountValue: '40000.00',
					cashSurrenderValue: '30000.00',
					deathBenefit: '1000000.00',
					gptAdjusted: false,
					mecAdjusted: true
				},
				{
					insuredId: 'b',
					finalAverageSalary: '350000.00',
					annualBenefit: '140000.00',
					benefitStream: [{ age: 65, amount: '140000.00' }],
					totalBenefitCost: '140000.00',
					netPresentValue: '140000.00'
				}
			],
			aggregate: {
				totalBenefitCost: '740000.00',
				netPresentValue: '740000.00',
				totalDeathBenefit: '1000000.00',
				totalFirstYearPremium: '50000.00'
			},
			asOf: '2026-07-09'
		}
	};
}

describe('deriveReport', () => {
	const today = '2026-12-31';

	it('uses the results asOf date over today', () => {
		const model = deriveReport(buildQuote(), today);
		expect(model.asOf).toBe('2026-07-09');
		expect(model.runDate).toBe('July 9, 2026');
	});

	it('counts plan populations and sums covered payroll over SERP participants', () => {
		const model = deriveReport(buildQuote(), today);
		expect(model.numSerp).toBe(2);
		expect(model.numColi).toBe(1);
		expect(model.coveredPayroll).toBe('$700,000');
		expect(model.censusPayroll).toBe('$700,000');
	});

	it('derives the tax math from the aggregate cost and corporate tax rate', () => {
		const model = deriveReport(buildQuote(), today);
		expect(model.totalBenefitCost).toBe('$740,000');
		expect(model.taxDeduction).toBe('$155,400'); // 740,000 × 0.21
		expect(model.afterTaxCost).toBe('$584,600'); // 740,000 × 0.79
		expect(model.totalDeathBenefit).toBe('$1,000,000');
	});

	it('shows a benefit percentage range when SERP percentages differ', () => {
		const model = deriveReport(buildQuote(), today);
		expect(model.benefitPercentDisplay).toBe('40%–60%');
	});

	it('builds projection rows for SERP participants and policy rows for COLI participants', () => {
		const model = deriveReport(buildQuote(), today);
		expect(model.projections.map((p) => p.name)).toEqual(['Alice Anders', 'Bob Baker']);
		expect(model.projections[0].paymentYears).toBe(2);
		expect(model.policies.map((p) => p.name)).toEqual(['Alice Anders']);
		expect(model.policies[0].mecAdjusted).toBe(true);
	});

	it('orders sample chips by annual benefit, largest first', () => {
		const model = deriveReport(buildQuote(), today);
		expect(model.samples[0].name).toBe('Alice Anders');
		expect(model.samples[0].annualBenefit).toBe('$300,000');
	});

	it('derives the payout window from the model settings', () => {
		const model = deriveReport(buildQuote(), today);
		// retirement 65 + waiting 0 → first payment 65; through 84 inclusive = 20 payments
		expect(model.firstPaymentAge).toBe(65);
		expect(model.payoutYears).toBe(20);
	});

	/**
	 * A quote whose one COLI life carries a design reaching its LE age, so the accounting module's
	 * COLI earnings series (page 5.2 column [4]) has something to bind. Death at LE 84 (policy year
	 * 3); premiums 10k in years 1–2; AV 8k → 17k → 25k; death benefit 100k. Reference year 2026.
	 */
	function buildQuoteWithDesign(infeasible = false): Quote {
		return {
			schemaVersion: SCHEMA_VERSION,
			id: 'q2',
			company: { name: 'Acme', corporateTaxRate: 0.21 },
			modelSettings: { ...DEFAULT_MODEL_SETTINGS },
			census: [makeInsured({ id: 'a', planMembership: 'BOTH', lifeExpectancy: 84 })],
			results: {
				perParticipant: [
					{
						insuredId: 'a',
						finalAverageSalary: '100000.00',
						annualBenefit: '60000.00',
						benefitStream: [],
						totalBenefitCost: '0.00',
						netPresentValue: '0.00',
						designs: {
							'cost-recovery': {
								faceAmount: '100000.00',
								firstYearPremium: '10000.00',
								illustrationYears: [
									{ policyYear: 1, age: 82, premium: '10000.00', accountValue: '8000.00', cashSurrenderValue: '0.00', deathBenefit: '100000.00' },
									{ policyYear: 2, age: 83, premium: '10000.00', accountValue: '17000.00', cashSurrenderValue: '0.00', deathBenefit: '100000.00' },
									{ policyYear: 3, age: 84, premium: '0.00', accountValue: '25000.00', cashSurrenderValue: '0.00', deathBenefit: '100000.00' }
								]
							}
						}
					}
				],
				aggregate: {
					totalBenefitCost: '0.00',
					netPresentValue: '0.00',
					byOption: {
						'cost-recovery': {
							totalFaceAmount: '100000.00',
							totalFirstYearPremium: '10000.00',
							policyCount: 1,
							...(infeasible ? { infeasibleCount: 1 } : {})
						}
					}
				},
				asOf: '2026-01-01'
			}
		};
	}

	it('binds COLI [4] and combined [5] from the accounting module for a feasible option', () => {
		const model = deriveReport(buildQuoteWithDesign(), today);
		const led = model.earningsLedgerByOption['cost-recovery'];
		expect(led).toBeDefined();
		expect(led.coliByYear[2026]).toBe('(2,000)'); // year 1: 8,000 AV − 10,000 premium
		expect(led.coliByYear[2028]).toBe('83,000'); // LE year: AV released + 100,000 death benefit
		expect(led.coliTotal).toBe('80,000'); // life of program: 100,000 DB − 20,000 premiums
		// This life has no benefit stream, so net SERP is 0 and combined [5] equals COLI [4].
		expect(led.combinedByYear[2026]).toBe('(2,000)');
		expect(led.combinedTotal).toBe('80,000');
	});

	it('binds the SERP columns [1][2][3] (option-independent, zero for an empty benefit stream)', () => {
		const model = deriveReport(buildQuoteWithDesign(), today);
		expect(model.earningsLedgerSerp).not.toBeNull();
		expect(model.earningsLedgerSerp?.col1ByYear[2026]).toBe('0');
		expect(model.earningsLedgerSerp?.col1Total).toBe('0');
	});

	it('suppresses the per-option columns for an infeasible solve, but still shows the SERP columns', () => {
		const model = deriveReport(buildQuoteWithDesign(true), today);
		expect(model.earningsLedgerByOption['cost-recovery']).toBeUndefined();
		expect(model.earningsLedgerSerp).not.toBeNull(); // SERP is option-independent
	});

	it('binds the 6.5 audit trail — nine SERP columns per calendar year', () => {
		const model = deriveReport(buildQuoteWithDesign(), today);
		expect(model.auditTrail).not.toBeNull();
		const row = model.auditTrail?.byYear[2026];
		expect(row).toHaveLength(9);
		// This life has no benefit stream, so every audit-trail column is zero.
		expect(row?.every((v) => v === '0')).toBe(true);
	});

	it('has no earnings ledger or audit trail before a run', () => {
		const quote = buildQuoteWithDesign();
		quote.results = null;
		const model = deriveReport(quote, today);
		expect(model.earningsLedgerByOption).toEqual({});
		expect(model.earningsLedgerSerp).toBeNull();
		expect(model.auditTrail).toBeNull();
	});
});
