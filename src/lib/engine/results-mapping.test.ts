import { describe, it, expect } from 'vitest';
import { computeLiability } from './compute-liability';
import { toResults } from './results-mapping';
import type { Insured, ModelSettings } from '$lib/domain';
import { ResultsSchema } from '$lib/domain';
import * as v from 'valibot';

const settings: ModelSettings = {
	retirementAge: 65,
	assumedDeathBenefitAge: 84,
	benefitWaitingPeriod: 0,
	salaryGrowthRate: 0,
	npvDiscountRate: 0,
	fasAveragingPeriod: 3
};

const insured: Insured = {
	id: 'i1',
	firstName: 'Jane',
	lastName: 'Doe',
	gender: 'F',
	dateOfBirth: '1967-06-15',
	dateOfHire: '2005-01-01',
	currentSalary: '100000',
	benefitPercentage: 0.6,
	riskClass: 'Standard Non Tobacco',
	planMembership: 'SERP'
};

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
