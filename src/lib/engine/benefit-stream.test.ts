import { describe, it, expect } from 'vitest';
import { Big } from '$lib/money/money';
import { composeAnnualBenefit, benefitStream } from './benefit-stream';

describe('composeAnnualBenefit (FR13, additive bases)', () => {
	/** A single-basis %FAS plan: fixed and unit-credit terms zero. */
	const percentOnly = {
		finalAverageSalary: new Big('100000'),
		fixedBenefit: new Big('0'),
		benefitPercentage: 0.6,
		unitCredit: 0,
		creditedServiceYears: 0
	};

	it('computes Factor × FAS when only the percentage basis is set', () => {
		expect(composeAnnualBenefit(percentOnly).toString()).toBe('60000');
	});

	it('is zero when every basis is zero', () => {
		expect(composeAnnualBenefit({ ...percentOnly, benefitPercentage: 0 }).toString()).toBe('0');
	});

	it('adds the fixed-dollar basis on top of the percentage basis', () => {
		// 25,000 fixed + 60% × 100,000 = 85,000
		expect(composeAnnualBenefit({ ...percentOnly, fixedBenefit: new Big('25000') }).toString()).toBe(
			'85000'
		);
	});

	it('adds the unit-credit basis: unitCredit × service × FAS', () => {
		// 1.5% × 30 yrs × 100,000 = 45,000
		expect(
			composeAnnualBenefit({
				...percentOnly,
				benefitPercentage: 0,
				unitCredit: 0.015,
				creditedServiceYears: 30
			}).toString()
		).toBe('45000');
	});

	it('sums all three bases additively', () => {
		// 10,000 fixed + 20% × 100,000 + 1% × 25 × 100,000 = 10,000 + 20,000 + 25,000 = 55,000
		expect(
			composeAnnualBenefit({
				finalAverageSalary: new Big('100000'),
				fixedBenefit: new Big('10000'),
				benefitPercentage: 0.2,
				unitCredit: 0.01,
				creditedServiceYears: 25
			}).toString()
		).toBe('55000');
	});

	it('keeps full precision (no rounding)', () => {
		// 123456.78 * 0.65 = 80246.907
		expect(composeAnnualBenefit({ ...percentOnly, finalAverageSalary: new Big('123456.78'), benefitPercentage: 0.65 }).toString()).toBe(
			'80246.907'
		);
	});
});

describe('benefitStream (FR14, AR19 boundary timing)', () => {
	const base = {
		annualBenefit: new Big('60000'),
		retirementAge: 65,
		benefitWaitingPeriod: 0,
		assumedDeathBenefitAge: 84
	};

	it('pays from retirement through the assumed death age inclusive', () => {
		const stream = benefitStream(base);
		expect(stream).toHaveLength(20); // ages 65..84 inclusive
		expect(stream[0].age).toBe(65); // first payment year
		expect(stream[stream.length - 1].age).toBe(84); // final payment year
	});

	it('pays the level annual benefit every year', () => {
		const stream = benefitStream(base);
		expect(stream.every((y) => y.amount.eq(new Big('60000')))).toBe(true);
	});

	it('delays the first payment by the waiting period', () => {
		const stream = benefitStream({ ...base, benefitWaitingPeriod: 2 });
		expect(stream[0].age).toBe(67); // 65 + 2
		expect(stream[stream.length - 1].age).toBe(84);
		expect(stream).toHaveLength(18); // ages 67..84
	});

	it('produces an empty stream when the first payment age is past the death age', () => {
		expect(benefitStream({ ...base, retirementAge: 85 })).toEqual([]);
	});

	it('pays a single year when retirement equals the death age', () => {
		const stream = benefitStream({ ...base, retirementAge: 84 });
		expect(stream).toHaveLength(1);
		expect(stream[0].age).toBe(84);
	});

	it('throws on a negative waiting period', () => {
		expect(() => benefitStream({ ...base, benefitWaitingPeriod: -1 })).toThrow();
	});

	it('escalates payments by COLA — level year 1, compounding thereafter', () => {
		const stream = benefitStream({ ...base, colaScale: 0.02 });
		expect(stream[0].amount.toString()).toBe('60000'); // year 1 is level
		expect(stream[1].amount.toString()).toBe('61200'); // 60000 × 1.02
		expect(stream[2].amount.toString()).toBe('62424'); // 60000 × 1.02^2
	});

	it('caps the payout at maxBenefitYears', () => {
		// LE gives 20 payments (65..84); a 10-year max truncates to ages 65..74.
		const stream = benefitStream({ ...base, maxBenefitYears: 10 });
		expect(stream).toHaveLength(10);
		expect(stream[stream.length - 1].age).toBe(74);
	});

	it('extends past the assumed death age to honour a period-certain minimum', () => {
		// Retire 82, LE 84 → 3 LE-based payments; a 5-year minimum pays ages 82..86.
		const stream = benefitStream({ ...base, retirementAge: 82, minBenefitYears: 5 });
		expect(stream).toHaveLength(5);
		expect(stream[stream.length - 1].age).toBe(86); // two years past the assumed death age
	});

	it('does not manufacture a stream from the minimum when benefits never commence', () => {
		// First payment age (85) is past the assumed death age (84): no benefit, min irrelevant.
		expect(benefitStream({ ...base, retirementAge: 85, minBenefitYears: 5 })).toEqual([]);
	});

	it('clamps within [min, max] when the LE-based count already sits inside the band', () => {
		const stream = benefitStream({ ...base, minBenefitYears: 5, maxBenefitYears: 20 });
		expect(stream).toHaveLength(20); // 20 LE payments, unchanged
	});

	it('is deterministic for identical inputs', () => {
		const a = benefitStream(base);
		const b = benefitStream(base);
		expect(a.map((y) => `${y.age}:${y.amount.toString()}`)).toEqual(
			b.map((y) => `${y.age}:${y.amount.toString()}`)
		);
	});
});
