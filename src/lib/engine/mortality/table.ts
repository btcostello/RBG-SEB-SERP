/**
 * Mortality table lookup — the engine's rates, and which table applies at a given age.
 *
 * The rates are the **IRS static mortality tables** for a valuation year: the § 1.430(h)(3)-1(d)
 * base tables projected with the 2024 Adjusted Scale MP-2021 under the construction in
 * § 1.430(h)(3)-1(c)(3). See `irs-static.ts` for that construction and the two correctness gates
 * it passes; this module is the engine-facing lookup over it.
 *
 * ## Every rate depends on a valuation year
 *
 * A static table is rebuilt each calendar year, so there is no such thing as "the" rate for an
 * age — only the rate for an age *in a valuation year*. That year is a required argument
 * throughout, deliberately: it comes from the plan effective date (operator decision, 2026-09-20),
 * and defaulting it would let a quote silently value on the wrong year.
 *
 * ## Two levels of access
 *
 * - {@link mortalityRate} reads one named basis. Use it when you know which table you want.
 * - {@link rateForAge} picks the basis from the participant's retirement age. This is the normal
 *   entry point for a projection — a participant is a non-annuitant until they retire and an
 *   annuitant from then on.
 *
 * ## Non-annuitant and annuitant
 *
 * The regulation's two statuses, and the only two the tables provide. A **beneficiary** reads the
 * annuitant table too (§ 1.430(h)(3)-1(b)(4)(i)), so survivor mortality has no separate basis here
 * — unlike the Pri-2012 white collar data this replaced, which published a contingent-survivor
 * series. `pri-2012-white-collar.ts` is retained for comparison but is no longer the engine's
 * basis.
 *
 * Rates are plain numbers, not big.js: they are probabilities feeding a calculation, not money.
 */
import type { Gender } from '$lib/domain/insured';
import {
	IRS_BASE_END_AGE,
	IRS_BASE_START_AGE,
	irsStaticRate,
	type IrsBasis
} from './irs-static';

/** The two statuses the tables distinguish. */
export const MORTALITY_BASES = ['nonAnnuitant', 'annuitant'] as const;
export type MortalityBasis = IrsBasis;

/** Normal retirement age, and so the age at which a life becomes an annuitant. */
export const DEFAULT_RETIREMENT_AGE = 65;

/** Inclusive age span a series covers. */
export interface AgeRange {
	readonly startAge: number;
	readonly endAge: number;
}

/** The inclusive ages the tables cover — the full 0 to 120, on both bases and both genders. */
export const TABLE_AGE_RANGE: AgeRange = {
	startAge: IRS_BASE_START_AGE,
	endAge: IRS_BASE_END_AGE
};

/** The inclusive ages for which {@link mortalityRate} returns a rate on this basis. */
export function ageRange(): AgeRange {
	return TABLE_AGE_RANGE;
}

/**
 * A cached full series per (gender, basis, valuation year).
 *
 * Building one rate walks up to a hundred years of improvement factors, and a projection reads the
 * same table hundreds of times — once per age per life. Caching the 121-rate series turns that
 * into one build per valuation year. The tables are pure functions of their inputs, so the cache
 * can never go stale.
 */
const seriesCache = new Map<string, readonly (number | null)[]>();

/** The whole 0-120 series for a basis in a valuation year. Entries are null only off the table. */
export function staticSeries(
	gender: Gender,
	basis: MortalityBasis,
	valuationYear: number
): readonly (number | null)[] {
	const key = `${gender}:${basis}:${valuationYear}`;
	const cached = seriesCache.get(key);
	if (cached !== undefined) return cached;

	const series: (number | null)[] = [];
	for (let age = TABLE_AGE_RANGE.startAge; age <= TABLE_AGE_RANGE.endAge; age++) {
		series.push(irsStaticRate(gender, basis, age, valuationYear));
	}
	seriesCache.set(key, series);
	return series;
}

/**
 * Annual probability of death q(x) at `age` on an explicitly named basis, for a valuation year.
 * `null` when the age falls outside the tables, or the year is before the 2012 base year.
 *
 * Null rather than 0 or a throw: outside the span the table says *nothing*, and silently
 * returning 0 would read as "cannot die", which would quietly overstate survival.
 *
 * Ages are truncated to whole years; the tables are defined on integer ages only.
 */
export function mortalityRate(
	gender: Gender,
	basis: MortalityBasis,
	age: number,
	valuationYear: number
): number | null {
	if (!Number.isFinite(age)) return null;
	const wholeAge = Math.floor(age);
	if (wholeAge < TABLE_AGE_RANGE.startAge || wholeAge > TABLE_AGE_RANGE.endAge) return null;
	return staticSeries(gender, basis, valuationYear)[wholeAge - TABLE_AGE_RANGE.startAge];
}

/**
 * The age at which a basis reaches q = 1 — the table's terminal age, where survival ends.
 * Age 120 on every basis, since the scale carries no improvement there and so leaves q = 1 intact.
 */
export function terminalAge(
	gender: Gender,
	basis: MortalityBasis,
	valuationYear: number
): number | null {
	const series = staticSeries(gender, basis, valuationYear);
	const index = series.findIndex((q) => q !== null && q >= 1);
	return index === -1 ? null : TABLE_AGE_RANGE.startAge + index;
}

/** Which table applies at `age` for someone retiring at `retirementAge`. */
export function basisForAge(
	age: number,
	retirementAge: number = DEFAULT_RETIREMENT_AGE
): MortalityBasis {
	return age < retirementAge ? 'nonAnnuitant' : 'annuitant';
}

/**
 * Annual probability of death q(x), with the basis chosen by retirement age — the non-annuitant
 * table below `retirementAge`, the annuitant table at and above it. `null` outside the tables.
 */
export function rateForAge(
	gender: Gender,
	age: number,
	valuationYear: number,
	retirementAge: number = DEFAULT_RETIREMENT_AGE
): number | null {
	return mortalityRate(gender, basisForAge(age, retirementAge), age, valuationYear);
}

/**
 * Retirement ages the tables support.
 *
 * Both bases run the full 0-120, so unlike the white collar tables — whose employee series stopped
 * at 80 and forced retirement into a 50-81 window — there is no gap to avoid. Any age on the table
 * is a valid switching point. Kept as a named range so callers still have one thing to check
 * against rather than hardcoding the bounds.
 */
export const SUPPORTED_RETIREMENT_AGES: AgeRange = TABLE_AGE_RANGE;

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
			`assertSupportedRetirementAge: retirement age ${retirementAge} is outside the ages the ` +
				`mortality tables cover; supported range is ${startAge}-${endAge}`
		);
	}
}
