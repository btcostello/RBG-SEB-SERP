/**
 * SERP pension accounting — service-cost approach tests.
 *
 * Worked example (discount rate 0, so PV = undiscounted and the arithmetic is exact):
 *   benefit stream 100,000 at ages 65 and 66; NRA 65; current age 55; past service 20 years.
 *   pvAtNRA = 200,000 ; pboToday = 200,000 (0% discount)
 *   future service = 65 − 55 = 10 ; total service = 20 + 10 = 30
 *   prior service cost = 200,000 × 20/30 = 133,333.33…
 *   future obligation  = 200,000 × 10/30 =  66,666.66…
 *   annual service cost = 200,000 / 30    =   6,666.66…
 */
import { describe, expect, it } from 'vitest';
import { Big } from '$lib/money/money';
import {
	averageFutureServiceYears,
	discountToToday,
	pvBenefitsAtNRA,
	serpPensionForParticipant,
	type BenefitStreamYear
} from './serp-pension';

const stream: BenefitStreamYear[] = [
	{ age: 65, amount: '100000.00' },
	{ age: 66, amount: '100000.00' }
];

describe('pvBenefitsAtNRA', () => {
	it('sums the stream undiscounted at a 0% rate', () => {
		expect(pvBenefitsAtNRA(stream, 0, 65).toString()).toBe('200000');
	});

	it('discounts payments after NRA back to it', () => {
		// 100,000 at age 65 (undiscounted) + 100,000 at 66 / 1.05 = 100,000 + 95,238.095…
		expect(pvBenefitsAtNRA(stream, 0.05, 65).toFixed(2)).toBe('195238.10');
	});
});

describe('discountToToday', () => {
	it('is a no-op at a 0% rate', () => {
		expect(discountToToday(new Big(200000), 0, 65, 55).toString()).toBe('200000');
	});

	it('discounts the NRA value back over the years to retirement', () => {
		// 200,000 / 1.05^10 = 122,782.65…
		expect(discountToToday(new Big(200000), 0.05, 65, 55).toFixed(2)).toBe('122782.65');
	});
});

describe('serpPensionForParticipant', () => {
	const base = { stream, discountRate: 0, nra: 65, currentAge: 55, pastServiceYears: 20 };

	it('computes the PBO and its past/future split by service years (step 3)', () => {
		const p = serpPensionForParticipant(base);
		expect(p.pvAtNRA.toString()).toBe('200000');
		expect(p.pboToday.toString()).toBe('200000');
		expect(p.futureServiceYears).toBe(10);
		expect(p.totalServiceYears).toBe(30);
		expect(p.priorServiceCost.toFixed(2)).toBe('133333.33');
		expect(p.futureServiceObligation.toFixed(2)).toBe('66666.67');
		expect(p.annualServiceCost.toFixed(2)).toBe('6666.67');
	});

	it('the past and future obligation shares sum back to the PBO', () => {
		const p = serpPensionForParticipant(base);
		expect(p.priorServiceCost.plus(p.futureServiceObligation).toFixed(2)).toBe('200000.00');
	});

	it('treats a participant at/past NRA as fully prior service, nothing left to earn', () => {
		const p = serpPensionForParticipant({ ...base, currentAge: 65, pastServiceYears: 30 });
		expect(p.futureServiceYears).toBe(0);
		expect(p.totalServiceYears).toBe(30);
		expect(p.priorServiceCost.toString()).toBe('200000'); // all of it
		expect(p.futureServiceObligation.toString()).toBe('0'); // no future service cost recognised
		// annualServiceCost stays the accrual rate (PBO / total service); it is simply applied over
		// zero remaining years, so no future service cost is recognised.
		expect(p.annualServiceCost.toFixed(2)).toBe('6666.67');
	});

	it('does not divide by zero when there is no service at all', () => {
		const p = serpPensionForParticipant({ ...base, currentAge: 65, pastServiceYears: 0 });
		expect(p.totalServiceYears).toBe(0);
		expect(p.annualServiceCost.toString()).toBe('0');
		expect(p.priorServiceCost.toString()).toBe('0');
	});
});

describe('averageFutureServiceYears', () => {
	it('averages future service across participants (the amortisation period)', () => {
		const a = serpPensionForParticipant({ stream, discountRate: 0, nra: 65, currentAge: 55, pastServiceYears: 20 }); // 10
		const b = serpPensionForParticipant({ stream, discountRate: 0, nra: 65, currentAge: 45, pastServiceYears: 10 }); // 20
		expect(averageFutureServiceYears([a, b])).toBe(15);
	});

	it('is zero with no participants', () => {
		expect(averageFutureServiceYears([])).toBe(0);
	});
});
