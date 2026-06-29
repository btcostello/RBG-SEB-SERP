/**
 * Salary projection (FR11, NFR3–NFR5).
 *
 * Pure, deterministic, side-effect-free. Given a current salary and a salary growth rate, it
 * projects a year-by-year salary path from the insured's current age (age nearest birthday as
 * of the valuation date) through retirement age.
 *
 * salary(age) = currentSalary × (1 + growthRate) ^ (age − currentAge)
 *
 * All arithmetic is big.js with NO intermediate rounding — values stay full-precision until a
 * deliberate rounding step at an output boundary (NFR5). `Big` is imported from the money
 * module so the centralized rounding policy is loaded.
 *
 * Note: date of hire is part of the insured but is not needed to project salary by age; the
 * path length is driven by current age → retirement age (age-nearest-birthday timing, NFR4).
 */
import { Big } from '$lib/money/money';
import { ageNearestBirthday } from '$lib/dates/age';

/** One year of the projected salary path. `salary` is a full-precision `Big` (not rounded). */
export interface SalaryYear {
	age: number;
	salary: Big;
}

export interface ProjectSalaryParams {
	/** Current annual salary as a `Big`. */
	currentSalary: Big;
	/** Insured date of birth, ISO YYYY-MM-DD. */
	dateOfBirth: string;
	/** Valuation date, ISO YYYY-MM-DD — current age is taken nearest-birthday as of this date. */
	asOf: string;
	/** Age at which the projection ends (benefits begin). */
	retirementAge: number;
	/** Annual salary growth rate (e.g. 0.03 for 3%). */
	salaryGrowthRate: number;
}

/**
 * Project the year-by-year salary path from current age to retirement age (inclusive).
 *
 * If the insured is already at or past retirement age, the path contains a single entry at the
 * current age with the current salary (no projection forward).
 */
export function projectSalary(params: ProjectSalaryParams): SalaryYear[] {
	const { currentSalary, dateOfBirth, asOf, retirementAge, salaryGrowthRate } = params;

	const currentAge = ageNearestBirthday(dateOfBirth, asOf);
	const onePlusGrowth = new Big(1).plus(salaryGrowthRate);
	const lastAge = Math.max(currentAge, retirementAge);

	const path: SalaryYear[] = [];
	for (let age = currentAge; age <= lastAge; age++) {
		const yearsOfGrowth = age - currentAge;
		// pow(n) is exact for integer n; no rounding (NFR5).
		path.push({ age, salary: currentSalary.times(onePlusGrowth.pow(yearsOfGrowth)) });
	}
	return path;
}
