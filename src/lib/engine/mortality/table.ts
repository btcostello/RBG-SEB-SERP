/**
 * Mortality table lookup and basis selection.
 *
 * Two levels of access, deliberately separated:
 *
 * - {@link mortalityRate} reads one named basis. Use it when you know which table you want.
 * - {@link rateForAge} picks the basis from the participant's retirement age. This is the normal
 *   entry point for a projection — a participant is on the `employee` table until they retire and
 *   the `retiree` (healthy annuitant) table from then on.
 *
 * Rates are plain numbers, not big.js: they are probabilities feeding a calculation, not money.
 */
import type { Gender } from '$lib/domain/insured';
import {
	MORTALITY_BASES,
	PRI_2012_WHITE_COLLAR,
	type MortalityBasis,
	type MortalitySeries,
	type MortalityTableData
} from './pri-2012-white-collar';

export {
	MORTALITY_BASES,
	PRI_2012_WHITE_COLLAR,
	type MortalityBasis,
	type MortalitySeries,
	type MortalityTableData
};

/** Normal retirement age, and so the age at which a life moves to the retiree table. */
export const DEFAULT_RETIREMENT_AGE = 65;

/** Inclusive age span a series covers. */
export interface AgeRange {
	readonly startAge: number;
	readonly endAge: number;
}

/** The inclusive ages for which {@link mortalityRate} returns a rate on this basis. */
export function ageRange(gender: Gender, basis: MortalityBasis): AgeRange {
	const series = PRI_2012_WHITE_COLLAR[gender][basis];
	return { startAge: series.startAge, endAge: series.startAge + series.q.length - 1 };
}

/**
 * Annual probability of death q(x) at `age` on an explicitly named basis, or `null` when the age
 * falls outside that series.
 *
 * Null rather than 0 or a throw: outside the span the table says *nothing*, and silently
 * returning 0 would read as "cannot die", which would quietly overstate survival.
 *
 * Ages are truncated to whole years; the table is defined on integer ages only.
 */
export function mortalityRate(gender: Gender, basis: MortalityBasis, age: number): number | null {
	if (!Number.isFinite(age)) return null;
	const series = PRI_2012_WHITE_COLLAR[gender][basis];
	const index = Math.floor(age) - series.startAge;
	if (index < 0 || index >= series.q.length) return null;
	return series.q[index];
}

/**
 * The age at which a basis reaches q = 1 — the table's terminal age, where survival ends.
 * `null` for a basis that never reaches certainty (the employee series stops at 80).
 */
export function terminalAge(gender: Gender, basis: MortalityBasis): number | null {
	const series = PRI_2012_WHITE_COLLAR[gender][basis];
	const index = series.q.findIndex((q) => q >= 1);
	return index === -1 ? null : series.startAge + index;
}

/** Which table applies at `age` for someone retiring at `retirementAge`. */
export function basisForAge(
	age: number,
	retirementAge: number = DEFAULT_RETIREMENT_AGE
): MortalityBasis {
	return age < retirementAge ? 'employee' : 'retiree';
}

/**
 * Annual probability of death q(x), with the basis chosen by retirement age — the employee table
 * below `retirementAge`, the retiree table at and above it. `null` outside the chosen series.
 */
export function rateForAge(
	gender: Gender,
	age: number,
	retirementAge: number = DEFAULT_RETIREMENT_AGE
): number | null {
	return mortalityRate(gender, basisForAge(age, retirementAge), age);
}

/**
 * Retirement ages for which the two tables tile without a gap, derived from the data rather than
 * hardcoded so it stays true if the table is ever swapped.
 *
 * The employee series stops at 80 and the retiree series starts at 50, so a switch below 50 would
 * need retiree rates that do not exist, and a switch above 81 would need employee rates past the
 * end of that series. Currently ages 50 through 81.
 */
export const SUPPORTED_RETIREMENT_AGES: AgeRange = {
	startAge: Math.max(...(['M', 'F'] as const).map((g) => ageRange(g, 'retiree').startAge)),
	endAge: Math.min(...(['M', 'F'] as const).map((g) => ageRange(g, 'employee').endAge)) + 1
};

/**
 * Throws unless the two tables tile without a gap at this retirement age. Callers building a
 * continuous projection should call this once up front, so a bad configuration fails loudly
 * instead of producing a life table with a hole in it.
 */
export function assertSupportedRetirementAge(retirementAge: number): void {
	if (!Number.isInteger(retirementAge)) {
		throw new Error('assertSupportedRetirementAge: retirementAge must be a whole number');
	}
	const { startAge, endAge } = SUPPORTED_RETIREMENT_AGES;
	if (retirementAge < startAge || retirementAge > endAge) {
		throw new Error(
			`assertSupportedRetirementAge: retirement age ${retirementAge} leaves a gap between the ` +
				`employee and retiree tables; supported range is ${startAge}-${endAge}`
		);
	}
}
