import { describe, it, expect } from 'vitest';
import { Big } from '$lib/money/money';
import {
	survivorBenefitAtAge,
	survivorBenefitForSalary,
	survivorBenefitStream,
	survivorScheduleMultiple,
	type SurvivorSchedule
} from './survivor-benefit';

/** 100% of salary for 1 year, then 50% for the next 2 — the source sample's schedule. */
const SCHEDULE: SurvivorSchedule = {
	tier1Pct: 1,
	tier1Years: 1,
	tier2Pct: 0.5,
	tier2Years: 2
};

describe('survivorScheduleMultiple', () => {
	it('sums each tier percentage times its duration', () => {
		// 1.0 × 1 + 0.5 × 2 = 2.0 years of salary
		expect(survivorScheduleMultiple(SCHEDULE).toString()).toBe('2');
	});

	it('is zero when the schedule pays nothing', () => {
		expect(
			survivorScheduleMultiple({ tier1Pct: 0, tier1Years: 0, tier2Pct: 0, tier2Years: 0 }).eq(0)
		).toBe(true);
	});

	it('handles a single-tier schedule', () => {
		expect(
			survivorScheduleMultiple({
				tier1Pct: 1,
				tier1Years: 3,
				tier2Pct: 0,
				tier2Years: 0
			}).toString()
		).toBe('3');
	});
});

describe('survivorBenefitForSalary', () => {
	it('freezes the base at salary on the date of death', () => {
		// The schedule pays over three years, but all of it off the same frozen salary.
		expect(survivorBenefitForSalary(new Big('201760'), SCHEDULE).toString()).toBe('403520');
	});
});

describe('survivorBenefitStream (FR11)', () => {
	// Born mid-1967, valued mid-2026 → age nearest birthday 59; NRA 70.
	const base = {
		currentSalary: new Big('201760'),
		dateOfBirth: '1967-06-15',
		asOf: '2026-04-02',
		retirementAge: 70,
		salaryGrowthRate: 0.03,
		schedule: SCHEDULE
	};

	it('reproduces the source statement figures', () => {
		const stream = survivorBenefitStream(base);
		// Death this year, at age 59: 201,760 × 2.0
		expect(survivorBenefitAtAge(stream, 59).toFixed(0)).toBe('403520');
		// Death in the year before NRA, at age 69: salary grown 10 years, × 2.0
		expect(survivorBenefitAtAge(stream, 69).toFixed(0)).toBe('542297');
	});

	it('stops at NRA — the last year carrying a benefit is NRA - 1', () => {
		const stream = survivorBenefitStream(base);
		expect(stream[0].age).toBe(59);
		expect(stream[stream.length - 1].age).toBe(69);
		expect(stream.some((year) => year.age >= 70)).toBe(false);
	});

	it('reports zero at and after retirement age', () => {
		const stream = survivorBenefitStream(base);
		// The benefit is pre-retirement only; the retirement benefit takes over at NRA.
		expect(survivorBenefitAtAge(stream, 70).eq(0)).toBe(true);
		expect(survivorBenefitAtAge(stream, 85).eq(0)).toBe(true);
	});

	it('grows the base with salary, compounding annually', () => {
		const stream = survivorBenefitStream(base);
		const atSixty = survivorBenefitAtAge(stream, 60);
		// One year of 3% growth on the age-59 amount.
		expect(atSixty.toFixed(2)).toBe(new Big('403520').times(1.03).toFixed(2));
	});

	it('is empty for a participant already at or past retirement age', () => {
		// No pre-retirement window remains, so a pre-retirement death cannot occur.
		expect(survivorBenefitStream({ ...base, retirementAge: 59 })).toEqual([]);
		expect(survivorBenefitStream({ ...base, retirementAge: 50 })).toEqual([]);
	});

	it('pays nothing across every year when the schedule is empty', () => {
		const stream = survivorBenefitStream({
			...base,
			schedule: { tier1Pct: 0, tier1Years: 0, tier2Pct: 0, tier2Years: 0 }
		});
		expect(stream.length).toBeGreaterThan(0);
		expect(stream.every((year) => year.amount.eq(0))).toBe(true);
	});
});
