import { describe, it, expect } from 'vitest';
import { computeLiability } from './compute-liability';
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

	it('is deterministic for identical inputs (NFR1)', () => {
		const a = computeLiability({ census: [insured()], settings, asOf });
		const b = computeLiability({ census: [insured()], settings, asOf });
		expect(a.aggregate.totalBenefitCost.toString()).toBe(b.aggregate.totalBenefitCost.toString());
		expect(a.aggregate.netPresentValue.toString()).toBe(b.aggregate.netPresentValue.toString());
	});
});
