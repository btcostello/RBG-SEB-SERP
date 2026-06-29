import { describe, it, expect } from 'vitest';
import { Big } from '$lib/money/money';
import { projectSalary } from './salary-projection';

describe('projectSalary (FR11, NFR4)', () => {
	// DOB 1967-06-15, asOf 2027-06-15 -> age nearest birthday 60. Retire at 65 -> ages 60..65.
	const base = {
		currentSalary: new Big('100000'),
		dateOfBirth: '1967-06-15',
		asOf: '2027-06-15',
		retirementAge: 65,
		salaryGrowthRate: 0.03
	};

	it('produces a path from current age to retirement age inclusive', () => {
		const path = projectSalary(base);
		expect(path.map((y) => y.age)).toEqual([60, 61, 62, 63, 64, 65]);
	});

	it('grows salary geometrically with no intermediate rounding (NFR3, NFR5)', () => {
		const path = projectSalary({ ...base, salaryGrowthRate: 0.1 });
		// 100000 * 1.1^k, exact
		expect(path[0].salary.toString()).toBe('100000');
		expect(path[1].salary.toString()).toBe('110000');
		expect(path[2].salary.toString()).toBe('121000');
		expect(path[5].salary.toString()).toBe('161051'); // 1.1^5 = 1.61051
	});

	it('keeps salary flat at 0% growth', () => {
		const path = projectSalary({ ...base, salaryGrowthRate: 0 });
		expect(path.every((y) => y.salary.eq(new Big('100000')))).toBe(true);
	});

	it('uses age nearest birthday for the starting age', () => {
		// asOf ~7 months past the 60th birthday -> nearest birthday is 61.
		const path = projectSalary({ ...base, asOf: '2028-02-15' });
		expect(path[0].age).toBe(61);
	});

	it('returns a single entry when already at/past retirement age', () => {
		const path = projectSalary({ ...base, asOf: '2032-06-15' }); // age 65
		expect(path).toHaveLength(1);
		expect(path[0].age).toBe(65);
		expect(path[0].salary.toString()).toBe('100000');
	});

	it('is deterministic — identical inputs give identical results (NFR1)', () => {
		const a = projectSalary(base);
		const b = projectSalary(base);
		expect(a.map((y) => `${y.age}:${y.salary.toString()}`)).toEqual(
			b.map((y) => `${y.age}:${y.salary.toString()}`)
		);
	});
});
