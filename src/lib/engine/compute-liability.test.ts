import { describe, it, expect } from 'vitest';
import { computeLiability, creditedServiceYears } from './compute-liability';
import type { Insured } from '$lib/domain';
import { makeInsured, makeSettings } from '$lib/testing/fixtures';

// The fixture's flat 0% growth, 0-year waiting, 3-year FAS keeps the arithmetic clean and exact.
const settings = makeSettings();

function insured(overrides: Partial<Insured> = {}): Insured {
	return makeInsured(overrides); // dob 1967-06-15 → age 60 as of 2027-06-15
}

const asOf = '2027-06-15';

describe('computeLiability (FR15, FR16, NFR5)', () => {
	it('composes salary -> FAS -> benefit -> stream -> total/NPV for a SERP participant', () => {
		const result = computeLiability({ census: [insured()], settings, asOf });
		expect(result.perParticipant).toHaveLength(1);
		const p = result.perParticipant[0];
		expect(p.finalAverageSalary.toString()).toBe('100000'); // flat salary
		expect(p.annualBenefit.toString()).toBe('60000'); // 100000 * 0.6
		expect(p.benefitStream).toHaveLength(20); // ages 65..84
		expect(p.totalBenefitCost.toString()).toBe('1200000'); // 60000 * 20
		expect(p.netPresentValue.toString()).toBe('1200000'); // 0% discount
	});

	it('aggregates total cost and NPV across SERP participants (FR16)', () => {
		const census = [
			insured({ id: 'a', currentSalary: '100000' }),
			insured({ id: 'b', currentSalary: '200000' })
		];
		const result = computeLiability({ census, settings, asOf });
		expect(result.perParticipant).toHaveLength(2);
		// 1,200,000 + 2,400,000
		expect(result.aggregate.totalBenefitCost.toString()).toBe('3600000');
		expect(result.aggregate.netPresentValue.toString()).toBe('3600000');
	});

	it('excludes COLI-only participants from SERP liability', () => {
		const census = [
			insured({ id: 'serp', planMembership: 'SERP' }),
			insured({ id: 'coli', planMembership: 'COLI' })
		];
		const result = computeLiability({ census, settings, asOf });
		expect(result.perParticipant.map((p) => p.insuredId)).toEqual(['serp']);
	});

	it('includes BOTH (COLI+SERP) participants in SERP liability', () => {
		const result = computeLiability({
			census: [insured({ id: 'both', planMembership: 'BOTH' })],
			settings,
			asOf
		});
		expect(result.perParticipant.map((p) => p.insuredId)).toEqual(['both']);
	});

	it('treats the discount rate as data — a positive rate lowers NPV without code change (NFR15)', () => {
		const discounted = computeLiability({
			census: [insured()],
			settings: { ...settings, npvDiscountRate: 0.05 },
			asOf
		});
		expect(discounted.aggregate.netPresentValue.lt(discounted.aggregate.totalBenefitCost)).toBe(
			true
		);
	});

	it('adds a fixed-dollar benefit additively on top of the %FAS benefit', () => {
		// 24,000 fixed + 60% × 100,000 = 84,000/yr
		const result = computeLiability({
			census: [insured({ benefitAmount: '24000' })],
			settings,
			asOf
		});
		expect(result.perParticipant[0].annualBenefit.toString()).toBe('84000');
	});

	it('adds a unit-credit benefit: unitCredit × credited service × FAS', () => {
		// Retire 65 at age 60 → 5 future years; All Years basis, hired 2005-01-01 (22 completed
		// years to 2027-06-15) → 27 credited years. 1% × 27 × 100,000 = 27,000, plus 60% × 100,000.
		const result = computeLiability({
			census: [insured({ benefitPercentage: 0.6, unitCredit: 0.01, serviceBasis: 'All Years' })],
			settings,
			asOf
		});
		expect(creditedServiceYears(insured({ serviceBasis: 'All Years' }), asOf)).toBe(27);
		expect(result.perParticipant[0].annualBenefit.toString()).toBe('87000');
	});

	it('credits only future service under the Future Service basis', () => {
		// Age 60, retire 65 → 5 future years, regardless of hire date.
		expect(creditedServiceYears(insured({ serviceBasis: 'Future Service' }), asOf)).toBe(5);
	});

	it('applies COLA escalation to the benefit stream (raising total cost above level)', () => {
		const level = computeLiability({ census: [insured()], settings, asOf });
		const escalated = computeLiability({ census: [insured({ colaScale: 0.02 })], settings, asOf });
		expect(escalated.perParticipant[0].benefitStream[0].amount.toString()).toBe('60000'); // level yr 1
		expect(escalated.perParticipant[0].totalBenefitCost.gt(level.perParticipant[0].totalBenefitCost)).toBe(true);
	});

	it('clamps the payout to maxBenefitYears', () => {
		// LE 84, retire 65 → 20 payments; a 10-year cap gives 10 × 60,000 = 600,000.
		const result = computeLiability({
			census: [insured({ maxBenefitYears: 10 })],
			settings,
			asOf
		});
		expect(result.perParticipant[0].benefitStream).toHaveLength(10);
		expect(result.perParticipant[0].totalBenefitCost.toString()).toBe('600000');
	});

	it('is deterministic for identical inputs (NFR1)', () => {
		const a = computeLiability({ census: [insured()], settings, asOf });
		const b = computeLiability({ census: [insured()], settings, asOf });
		expect(a.aggregate.totalBenefitCost.toString()).toBe(b.aggregate.totalBenefitCost.toString());
		expect(a.aggregate.netPresentValue.toString()).toBe(b.aggregate.netPresentValue.toString());
	});
});
