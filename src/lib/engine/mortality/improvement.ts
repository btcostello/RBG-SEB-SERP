/**
 * Mortality improvement — reading the scale, and projecting a base rate forward with it.
 *
 * The data lives in `scale-mp-2021-adjusted-2024.ts`; this module is the arithmetic over it, and
 * is deliberately **base-table agnostic**. It never reaches for a base table of its own: a caller
 * hands it a rate and says which age and which years, so the same functions serve whichever base
 * table the quote is valued on.
 *
 * ## Static projection, not generational
 *
 * {@link projectRate} holds **age fixed** and walks the calendar year, which is how a static table
 * is built: every rate in the projected table is that age's base rate carried forward to the
 * valuation year. A generational projection instead advances age and year together, so a life
 * picks up a different improvement rate each year as it ages. Operator decision (2026-09-20) is
 * static, projected to the plan effective date's year.
 *
 * The composition is multiplicative, and the product runs from the year *after* the base year
 * through the target year inclusive:
 *
 * ```
 * q(x, target) = q(x, base) × ∏ (1 − MI(x, t))     for t = base + 1 … target
 * ```
 *
 * So projecting a 2024-base table to 2026 applies the 2025 and 2026 rates, and never the 2024
 * column. That matters more than it looks: the 2024 column is zero above age 50 but carries real
 * deterioration through the working ages (−1.36% for a 41-year-old male), so including it would
 * quietly raise mortality across most of a SERP census. A table stated *for* 2024 has already
 * absorbed that year, which is why the product starts at 2025.
 *
 * ## Out of range
 *
 * Every function returns `null` where the scale says nothing — ages past 120, and years before
 * 2013. It does **not** treat those as zero improvement, for the same reason `mortalityRate` does
 * not treat an out-of-range age as q = 0: silence is not a rate, and substituting one would hide
 * a misconfigured valuation year behind plausible-looking output.
 */
import type { Gender } from '$lib/domain/insured';
import {
	IMPROVEMENT_END_AGE,
	IMPROVEMENT_END_YEAR,
	IMPROVEMENT_START_AGE,
	IMPROVEMENT_START_YEAR,
	SCALE_MP_2021_ADJUSTED_2024
} from './scale-mp-2021-adjusted-2024';

export {
	IMPROVEMENT_END_AGE,
	IMPROVEMENT_END_YEAR,
	IMPROVEMENT_START_AGE,
	IMPROVEMENT_START_YEAR,
	SCALE_MP_2021_ADJUSTED_2024,
	type ImprovementScaleData,
	type ImprovementSeries
} from './scale-mp-2021-adjusted-2024';

/** A base rate and the two calendar years to carry it between. */
export interface ProjectionYears {
	/** Calendar year the base rate is stated for. */
	readonly baseYear: number;
	/** Calendar year to project to. Equal to `baseYear` projects nothing. */
	readonly targetYear: number;
}

/**
 * The annual improvement rate for `age` over calendar `year` — the fraction by which that age's
 * mortality changes across the year, positive for improvement and negative for deterioration.
 *
 * Ages at or below 20 all read the scale's "≤ 20" row. Years past the last explicit column take
 * the age's ultimate rate, which is what that column means. `null` above age 120 or before 2013.
 *
 * Ages and years are truncated to whole numbers; the scale is defined on integers only.
 */
export function improvementRate(gender: Gender, age: number, year: number): number | null {
	if (!Number.isFinite(age) || !Number.isFinite(year)) return null;
	const wholeAge = Math.floor(age);
	const wholeYear = Math.floor(year);
	if (wholeAge > IMPROVEMENT_END_AGE || wholeYear < IMPROVEMENT_START_YEAR) return null;

	const series = SCALE_MP_2021_ADJUSTED_2024[gender];
	// Ages below the first row are covered by it — the workbook states that row as "≤ 20".
	const ageIndex = Math.max(wholeAge, IMPROVEMENT_START_AGE) - IMPROVEMENT_START_AGE;
	if (wholeYear > IMPROVEMENT_END_YEAR) return series.ultimate[ageIndex];
	return series.rates[ageIndex][wholeYear - IMPROVEMENT_START_YEAR];
}

/**
 * The cumulative factor carrying a rate at `age` from `baseYear` to `targetYear` — the product of
 * `(1 − MI)` over each intervening year, with age held fixed.
 *
 * Returns 1 when the years are equal, and `null` if any year in the span falls outside the scale.
 * Projecting *backwards* (a target before the base) is supported and inverts the product, so a
 * table stated for a later year can be restated for an earlier one.
 */
export function cumulativeImprovementFactor(
	gender: Gender,
	age: number,
	{ baseYear, targetYear }: ProjectionYears
): number | null {
	if (!Number.isFinite(baseYear) || !Number.isFinite(targetYear)) return null;
	const from = Math.floor(baseYear);
	const to = Math.floor(targetYear);
	if (from === to) return 1;

	const forward = to > from;
	const firstYear = forward ? from + 1 : to + 1;
	const lastYear = forward ? to : from;

	let factor = 1;
	for (let year = firstYear; year <= lastYear; year++) {
		const rate = improvementRate(gender, age, year);
		if (rate === null) return null;
		factor *= 1 - rate;
	}
	return forward ? factor : 1 / factor;
}

/**
 * A base mortality rate carried from `baseYear` to `targetYear` at the same age.
 *
 * The result is clamped to [0, 1] — a probability that leaves that range is not a probability.
 * Clamping can only bite where sustained deterioration is applied to an already-extreme rate; the
 * scale's terminal ages carry zero improvement, so q(120) = 1 survives projection untouched.
 *
 * `null` when the scale cannot cover the span, propagating the gap rather than silently returning
 * the unprojected rate.
 */
export function projectRate(
	baseRate: number,
	gender: Gender,
	age: number,
	years: ProjectionYears
): number | null {
	if (!Number.isFinite(baseRate)) return null;
	const factor = cumulativeImprovementFactor(gender, age, years);
	if (factor === null) return null;
	return Math.min(1, Math.max(0, baseRate * factor));
}
