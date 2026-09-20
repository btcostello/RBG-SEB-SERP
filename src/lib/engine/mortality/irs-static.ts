/**
 * IRS static mortality tables — the construction in Treas. Reg. § 1.430(h)(3)-1(c)(3).
 *
 * A static table is a single table, rebuilt each calendar year, that approximates what generational
 * projection would give: rather than tracking a life's own year of birth, it projects each age's
 * base rate forward far enough to stand in for that life's whole future. That is why the
 * projection period is longest at young ages — a 30-year-old's rate has to anticipate decades of
 * improvement that a generational table would apply year by year.
 *
 * Operator decision (2026-09-20): static, IRS construction, valuation year from the plan effective
 * date. See DATA-GAPS.md item 2.
 *
 * ## The construction
 *
 * For an age, gender and status, the regulation multiplies the 2012 base rate by two cumulative
 * improvement factors — § 1.430(h)(3)-1(c)(3)(i):
 *
 * ```
 * static q(x, Y) = q(x, 2012) × CIF(x, 2012 → Y) × CIF(x, Y → Y + n(x))
 * ```
 *
 * where `n(x)` is the projection period from (c)(3)(ii): **8 years for males, 9 for females**,
 * increased by 1 year for each year below age 80, and reduced by 1/3 year for each year above 80
 * (never below zero). Where `n(x)` is fractional — every age above 80 that is not a multiple of 3
 * away from it — (c)(3)(iii) requires **linear interpolation between the whole projection periods
 * either side**, which is what {@link irsStaticRate} does.
 *
 * Both factors are products of `(1 − improvement rate)` over the years in the span, so together
 * they are one unbroken product from 2013 to `Y + n(x)` with age held fixed.
 *
 * ## Which table to read
 *
 * Read the two series directly when the participant's status is known — non-annuitant before
 * benefits commence, annuitant from commencement, and annuitant for a beneficiary. The
 * **combined** table ({@link irsCombinedStaticRate}) blends them with the regulation's weighting
 * factors and exists for plans that do not track status; we track it, so the combined table is here
 * mainly because it is what the IRS publishes and therefore what we can verify against.
 *
 * ## Fidelity
 *
 * Rebuilding the 2024 table reproduces every one of the 242 published rates to within one unit in
 * the fifth decimal, and 229 of them exactly. The thirteen that differ all sit within 5 × 10⁻⁶ of a
 * rounding boundary: the IRS worked from unrounded MP-2021 rates, while only the four-decimal
 * version of the scale is published. That gap is not closable from public data. The test in
 * `irs-static.test.ts` pins both facts.
 */
import type { Gender } from '$lib/domain/insured';
import {
	IRS_BASE_END_AGE,
	IRS_BASE_START_AGE,
	IRS_BASE_TABLES_2012,
	IRS_BASE_YEAR,
	type IrsBasis
} from './irs-base-2012';
import { cumulativeImprovementFactor } from './improvement';

export {
	IRS_BASES,
	IRS_BASE_END_AGE,
	IRS_BASE_START_AGE,
	IRS_BASE_TABLES_2012,
	IRS_BASE_YEAR,
	type IrsBaseSeries,
	type IrsBaseTableData,
	type IrsBasis
} from './irs-base-2012';

/** Base projection period before the age adjustment — § 1.430(h)(3)-1(c)(3)(ii)(A). */
const BASE_PROJECTION_PERIOD: Readonly<Record<Gender, number>> = { M: 8, F: 9 };
/** The age the adjustment pivots around. */
const PIVOT_AGE = 80;

/**
 * The 2012 base rate for an age, gender and status. `null` outside ages 0-120.
 */
export function irsBaseRate(gender: Gender, basis: IrsBasis, age: number): number | null {
	if (!Number.isFinite(age)) return null;
	const wholeAge = Math.floor(age);
	if (wholeAge < IRS_BASE_START_AGE || wholeAge > IRS_BASE_END_AGE) return null;
	return IRS_BASE_TABLES_2012[gender][basis][wholeAge];
}

/**
 * The projection period `n(x)` in years — § 1.430(h)(3)-1(c)(3)(ii). Fractional above age 80, and
 * floored at zero, which it reaches at age 104 for males and age 107 for females.
 */
export function projectionPeriod(gender: Gender, age: number): number {
	const wholeAge = Math.floor(age);
	const basePeriod = BASE_PROJECTION_PERIOD[gender];
	if (wholeAge < PIVOT_AGE) return basePeriod + (PIVOT_AGE - wholeAge);
	if (wholeAge > PIVOT_AGE) return Math.max(0, basePeriod - (wholeAge - PIVOT_AGE) / 3);
	return basePeriod;
}

/**
 * The static mortality rate for `valuationYear` at one age, gender and status.
 *
 * `null` where the inputs fall outside the tables — an age outside 0-120, or a valuation year
 * before the 2012 base year, since projecting backwards past the scale's first column is undefined.
 */
export function irsStaticRate(
	gender: Gender,
	basis: IrsBasis,
	age: number,
	valuationYear: number
): number | null {
	const base = irsBaseRate(gender, basis, age);
	if (base === null || !Number.isFinite(valuationYear)) return null;

	const year = Math.floor(valuationYear);
	const toValuation = cumulativeImprovementFactor(gender, age, {
		baseYear: IRS_BASE_YEAR,
		targetYear: year
	});
	if (toValuation === null) return null;

	const period = projectionPeriod(gender, age);
	const lower = Math.floor(period);
	const upper = Math.ceil(period);

	const atPeriod = (years: number): number | null => {
		const beyond = cumulativeImprovementFactor(gender, age, {
			baseYear: year,
			targetYear: year + years
		});
		return beyond === null ? null : base * toValuation * beyond;
	};

	const atLower = atPeriod(lower);
	if (atLower === null) return null;
	if (lower === upper) return atLower;

	// § 1.430(h)(3)-1(c)(3)(iii) — linear interpolation across a fractional projection period.
	const atUpper = atPeriod(upper);
	if (atUpper === null) return null;
	return atLower + (period - lower) * (atUpper - atLower);
}

/**
 * The combined static rate — the two statuses blended with the regulation's weighting factor,
 * per § 1.430(h)(3)-1(c)(2)(ii). This is the table the IRS publishes each year.
 */
export function irsCombinedStaticRate(
	gender: Gender,
	age: number,
	valuationYear: number
): number | null {
	const nonAnnuitant = irsStaticRate(gender, 'nonAnnuitant', age, valuationYear);
	const annuitant = irsStaticRate(gender, 'annuitant', age, valuationYear);
	if (nonAnnuitant === null || annuitant === null) return null;
	const weight = IRS_BASE_TABLES_2012[gender].weightingFactor[Math.floor(age)];
	return nonAnnuitant * (1 - weight) + annuitant * weight;
}
