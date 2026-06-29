/**
 * Final average salary (FAS) — FR12.
 *
 * Pure and deterministic. Averages the trailing `averagingPeriod` years of a projected salary
 * path (the final years up to and including retirement). big.js division uses the configured
 * high precision (Big.DP), so there is no premature rounding to cents (NFR5); rounding happens
 * only at an output boundary.
 *
 * If the path is shorter than the averaging period (e.g. an insured close to retirement), the
 * available trailing years are averaged.
 */
import { Big } from '$lib/money/money';
import type { SalaryYear } from './salary-projection';

export function finalAverageSalary(path: SalaryYear[], averagingPeriod: number): Big {
	if (path.length === 0) {
		throw new Error('finalAverageSalary: salary path is empty');
	}
	if (!Number.isInteger(averagingPeriod) || averagingPeriod < 1) {
		throw new Error(
			`finalAverageSalary: averagingPeriod must be a positive integer, got ${averagingPeriod}`
		);
	}

	const count = Math.min(averagingPeriod, path.length);
	const trailing = path.slice(path.length - count);
	const sum = trailing.reduce((acc, year) => acc.plus(year.salary), new Big(0));
	return sum.div(count);
}
