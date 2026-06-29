import { describe, it, expect } from 'vitest';
import { Big } from '$lib/money/money';
import { annualBenefit, benefitStream } from './benefit-stream';

describe('annualBenefit (FR13)', () => {
	it('computes Factor × FAS', () => {
		expect(annualBenefit(new Big('100000'), 0.6).toString()).toBe('60000');
	});

	it('is zero at a 0% factor', () => {
		expect(annualBenefit(new Big('100000'), 0).toString()).toBe('0');
	});

	it('keeps full precision (no rounding)', () => {
		// 123456.78 * 0.65 = 80246.907
		expect(annualBenefit(new Big('123456.78'), 0.65).toString()).toBe('80246.907');
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

	it('is deterministic for identical inputs', () => {
		const a = benefitStream(base);
		const b = benefitStream(base);
		expect(a.map((y) => `${y.age}:${y.amount.toString()}`)).toEqual(
			b.map((y) => `${y.age}:${y.amount.toString()}`)
		);
	});
});
