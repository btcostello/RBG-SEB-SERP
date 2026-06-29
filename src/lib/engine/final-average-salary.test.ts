import { describe, it, expect } from 'vitest';
import { Big } from '$lib/money/money';
import { formatMoney } from '$lib/money/money';
import { finalAverageSalary } from './final-average-salary';
import type { SalaryYear } from './salary-projection';

function path(...salaries: string[]): SalaryYear[] {
	return salaries.map((s, i) => ({ age: 60 + i, salary: new Big(s) }));
}

describe('finalAverageSalary (FR12)', () => {
	it('averages the trailing N years of the path', () => {
		// last 3 of [100000, 110000, 121000] -> 331000 / 3
		const fas = finalAverageSalary(path('100000', '110000', '121000'), 3);
		expect(formatMoney(fas)).toBe('110333.33');
	});

	it('averages only the trailing window when the path is longer', () => {
		const fas = finalAverageSalary(path('50000', '100000', '110000', '121000'), 2);
		// last 2: (110000 + 121000) / 2 = 115500
		expect(fas.toString()).toBe('115500');
	});

	it('returns the last salary for a 1-year averaging period', () => {
		const fas = finalAverageSalary(path('100000', '110000', '121000'), 1);
		expect(fas.toString()).toBe('121000');
	});

	it('averages all available years when the period exceeds the path length', () => {
		const fas = finalAverageSalary(path('100000', '120000'), 5);
		expect(fas.toString()).toBe('110000');
	});

	it('does not round prematurely (full precision division, NFR5)', () => {
		const fas = finalAverageSalary(path('100000', '100000', '100001'), 3);
		// 300001 / 3 = 100000.33333... kept to Big.DP precision
		expect(fas.toString()).toBe('100000.33333333333333333333');
	});

	it('throws on an empty path', () => {
		expect(() => finalAverageSalary([], 3)).toThrow();
	});

	it('throws on a non-positive averaging period', () => {
		expect(() => finalAverageSalary(path('100000'), 0)).toThrow();
	});
});
