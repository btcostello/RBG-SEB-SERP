import { describe, it, expect } from 'vitest';
import { Big } from '$lib/money/money';
import { computeLiability } from './compute-liability';
import { toResults, assembleResults } from './results-mapping';
import type { IllustrationResult } from '$lib/domain';
import { ResultsSchema } from '$lib/domain';
import * as v from 'valibot';
import type { DesignedPolicy } from '$lib/orchestrator/run';
import { makeInsured, makeSettings } from '$lib/testing/fixtures';

const settings = makeSettings();
const insured = makeInsured();

describe('toResults', () => {
	it('maps Big engine results to a valid domain Results snapshot with cent strings (AR2)', () => {
		const liability = computeLiability({ census: [insured], settings, asOf: '2027-06-15' });
		const results = toResults(liability);

		// Conforms to the domain schema (so it serializes/persists cleanly).
		expect(v.safeParse(ResultsSchema, results).success).toBe(true);

		const p = results.perParticipant[0];
		expect(p.finalAverageSalary).toBe('100000.00');
		expect(p.annualBenefit).toBe('60000.00');
		expect(p.totalBenefitCost).toBe('1200000.00');
		expect(p.netPresentValue).toBe('1200000.00');
		expect(p.benefitStream).toHaveLength(20);
		expect(p.benefitStream[0]).toEqual({ age: 65, amount: '60000.00' });

		expect(results.aggregate.totalBenefitCost).toBe('1200000.00');
		expect(results.aggregate.netPresentValue).toBe('1200000.00');
	});
});

describe('assembleResults (FR20, FR21)', () => {
	function illustration(premium: string): IllustrationResult {
		return {
			years: [
				{
					policyYear: 1,
					age: 61,
					premium,
					accountValue: '1000.00',
					cashSurrenderValue: '900.00',
					deathBenefit: '474000.00'
				}
			],
			gptAdjusted: true,
			mecAdjusted: false,
			solvedAnnualPremium: premium,
			guideline: { singlePremium: '50000.00', levelPremiumA: '6000.00', levelPremiumB: '6500.00' }
		};
	}

	it('merges SERP liability with COLI asset design and aggregates DB + first-year premium', () => {
		const liability = computeLiability({
			census: [insured],
			settings,
			asOf: '2027-06-15'
		});
		const designed: DesignedPolicy[] = [
			{ insuredId: 'i1', faceAmount: new Big('474000'), illustration: illustration('5000.00') }
		];

		const results = assembleResults({
			liability,
			totalDeathBenefit: new Big('948000'),
			designed
		});

		expect(v.safeParse(ResultsSchema, results).success).toBe(true);
		const p = results.perParticipant.find((x) => x.insuredId === 'i1');
		expect(p?.faceAmount).toBe('474000.00');
		expect(p?.firstYearPremium).toBe('5000.00');
		expect(p?.cashSurrenderValue).toBe('900.00');
		expect(p?.gptAdjusted).toBe(true);
		expect(p?.mecAdjusted).toBe(false);
		// The full illustration stream is persisted (not just year 1's single-point values).
		expect(p?.illustrationYears).toHaveLength(1);
		expect(p?.illustrationYears?.[0]).toMatchObject({ policyYear: 1, premium: '5000.00' });
		expect(results.aggregate.totalDeathBenefit).toBe('948000.00');
		expect(results.aggregate.totalFirstYearPremium).toBe('5000.00');
	});

	it('creates a zero-liability entry for a COLI-only participant', () => {
		const liability = computeLiability({ census: [], settings, asOf: '2027-06-15' });
		const designed: DesignedPolicy[] = [
			{
				insuredId: 'coliOnly',
				faceAmount: new Big('100000'),
				illustration: illustration('3000.00')
			}
		];
		const results = assembleResults({ liability, totalDeathBenefit: new Big('100000'), designed });
		const p = results.perParticipant.find((x) => x.insuredId === 'coliOnly');
		expect(p?.totalBenefitCost).toBe('0.00');
		expect(p?.faceAmount).toBe('100000.00');
	});
});
