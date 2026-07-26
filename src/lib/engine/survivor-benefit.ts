/**
 * Pre-retirement survivor benefit (FR11, NFR3–NFR5).
 *
 * Pure, deterministic, side-effect-free. Answers: if the participant died in a given year, what
 * is the total paid to their beneficiary?
 *
 * The schedule is durational and defined per participant:
 *   tier 1 percentage of salary for `tier1Years` years, then
 *   tier 2 percentage of salary for the next `tier2Years` years.
 *
 * Two properties follow from the plan definition and drive the shape here:
 *
 * - **The base is salary at the time of death, and it does not move afterwards.** Payments run
 *   for several years after death, but they are all a percentage of the same frozen salary, so
 *   the total is simply `salary × multiple` — no post-death growth.
 * - **The benefit ends at normal retirement age.** This is a *pre-retirement* survivor benefit;
 *   from NRA onward the retirement benefit takes over and the survivor benefit is zero. The
 *   last year carrying a benefit is therefore NRA − 1.
 *
 * All arithmetic is big.js with NO intermediate rounding — values stay full-precision until a
 * deliberate rounding step at an output boundary (NFR5).
 */
import { Big } from '$lib/money/money';
import { projectSalary } from './salary-projection';

/** The durational survivor schedule, as captured per participant on {@link Insured}. */
export interface SurvivorSchedule {
	/** Fraction of salary paid during tier 1 (e.g. 1.0 for 100%). */
	tier1Pct: number;
	tier1Years: number;
	/** Fraction of salary paid during tier 2 (e.g. 0.5 for 50%). */
	tier2Pct: number;
	tier2Years: number;
}

/** One year of the survivor stream: the total payable if death occurred at this age. */
export interface SurvivorYear {
	age: number;
	/** Full-precision `Big` (not rounded). */
	amount: Big;
}

/**
 * Total years of salary the schedule pays out, as a multiple.
 *
 * `tier1Pct × tier1Years + tier2Pct × tier2Years` — e.g. 100% for 1 year plus 50% for 2 years
 * is a multiple of 2.0, so a death benefit of twice the salary at death.
 */
export function survivorScheduleMultiple(schedule: SurvivorSchedule): Big {
	return new Big(schedule.tier1Pct)
		.times(schedule.tier1Years)
		.plus(new Big(schedule.tier2Pct).times(schedule.tier2Years));
}

/** Total survivor benefit for a death at the given salary. */
export function survivorBenefitForSalary(salary: Big, schedule: SurvivorSchedule): Big {
	return salary.times(survivorScheduleMultiple(schedule));
}

export interface SurvivorBenefitStreamParams {
	currentSalary: Big;
	/** Insured date of birth, ISO YYYY-MM-DD. */
	dateOfBirth: string;
	/** Valuation date, ISO YYYY-MM-DD — current age is taken nearest-birthday as of this date. */
	asOf: string;
	/** Normal retirement age. The survivor benefit ends here, so the stream stops at NRA − 1. */
	retirementAge: number;
	salaryGrowthRate: number;
	schedule: SurvivorSchedule;
}

/**
 * Year-by-year survivor benefit from the participant's current age through NRA − 1.
 *
 * Each entry is the **total** payable to the beneficiary for a death in that year, not an annual
 * instalment — the durational schedule is already collapsed into the multiple.
 *
 * Returns an empty stream for a participant already at or past retirement age: there is no
 * pre-retirement period left in which a pre-retirement death could occur.
 */
export function survivorBenefitStream(params: SurvivorBenefitStreamParams): SurvivorYear[] {
	const multiple = survivorScheduleMultiple(params.schedule);
	// Reuse the salary path so growth compounding matches the retirement-benefit side exactly.
	return projectSalary({
		currentSalary: params.currentSalary,
		dateOfBirth: params.dateOfBirth,
		asOf: params.asOf,
		retirementAge: params.retirementAge,
		salaryGrowthRate: params.salaryGrowthRate
	})
		.filter((year) => year.age < params.retirementAge)
		.map((year) => ({ age: year.age, amount: year.salary.times(multiple) }));
}

/**
 * The survivor benefit for a death at one specific age — zero at or after retirement age, and
 * zero for an age outside the projected pre-retirement window.
 */
export function survivorBenefitAtAge(stream: SurvivorYear[], age: number): Big {
	return stream.find((year) => year.age === age)?.amount ?? new Big(0);
}
