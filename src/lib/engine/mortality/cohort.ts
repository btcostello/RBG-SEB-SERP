/**
 * Multi-life aggregation — expected deaths and survivors per projection year across a group.
 *
 * This is what the Appendix G chart plots: the same group counted two ways.
 *
 * - {@link actuarialDeaths} spreads each life's death across every future year in proportion to
 *   the table's probabilities, so a year's figure is *expected* deaths and is fractional.
 * - {@link lifeExpectancyDeaths} is the basis the engine uses elsewhere — each life dies whole in
 *   the single year it reaches its assumed `lifeExpectancyAge`, so the series is a set of spikes.
 *
 * Both return the same shape over the same year indexing, so they can be plotted against each
 * other directly. Projection year 1 is the year running from each member's `currentAge` to
 * `currentAge + 1`; a member's death at exact age `a` falls in year `a − currentAge + 1`, matching
 * how `accounting-projection.ts` keys its life-expectancy death benefit.
 *
 * Members carry an optional `weight`, so the same functions serve headcount (weight 1, what the
 * chart wants) and amount-weighted aggregation (weight = benefit amount, what mortality-weighted
 * pension expense will want). The underlying table is itself amount-weighted.
 */
import type { Gender } from '$lib/domain/insured';
import { DEFAULT_RETIREMENT_AGE, terminalAge } from './table';
import { lifeTable } from './life-table';

/** One life in the group. */
export interface CohortMember {
	readonly gender: Gender;
	/** Exact age at the start of the projection. */
	readonly currentAge: number;
	/** Age at which this life moves to the retiree table. Defaults to 65. */
	readonly retirementAge?: number;
	/** Assumed age at death, used only by {@link lifeExpectancyDeaths}. */
	readonly lifeExpectancyAge?: number;
	/** Contribution to the totals. Defaults to 1 (headcount). */
	readonly weight?: number;
}

/** A per-year series and its running total, both of length `years`. */
export interface DeathSeries {
	/** Index 0 is projection year 1. */
	readonly annual: readonly number[];
	/** Running total of `annual` through each year. */
	readonly cumulative: readonly number[];
}

function assertYears(years: number): void {
	if (!Number.isInteger(years) || years < 1) {
		throw new Error('mortality/cohort: years must be a whole number of at least 1');
	}
}

function withCumulative(annual: number[]): DeathSeries {
	const cumulative: number[] = [];
	let running = 0;
	for (const value of annual) {
		running += value;
		cumulative.push(running);
	}
	return { annual, cumulative };
}

/**
 * Expected deaths per projection year under the mortality table.
 *
 * Fractional by nature — in year one a group of 21 might be expected to lose 0.08 of a life. Over
 * a long enough horizon the cumulative series approaches the total weight of the group, since
 * the table terminates at q = 1.
 */
export function actuarialDeaths(members: readonly CohortMember[], years: number): DeathSeries {
	assertYears(years);
	const annual = new Array<number>(years).fill(0);

	for (const member of members) {
		const { gender, currentAge, retirementAge = DEFAULT_RETIREMENT_AGE, weight = 1 } = member;
		// The table stops at its terminal age; past that everyone is already dead and contributes
		// nothing, so clamping here is exact rather than a truncation.
		const terminal = terminalAge(gender, 'retiree');
		const lastAge = Math.min(currentAge + years - 1, terminal ?? currentAge + years - 1);
		if (lastAge < currentAge) continue;

		const rows = lifeTable({ gender, startAge: currentAge, retirementAge, toAge: lastAge });
		for (const row of rows) {
			annual[row.year - 1] += weight * row.deaths;
		}
	}

	return withCumulative(annual);
}

/**
 * Deaths per projection year on the assumed-life-expectancy basis: each life dies whole in the
 * year it reaches `lifeExpectancyAge`.
 *
 * Members without a `lifeExpectancyAge` are skipped — there is no assumed death age for them, and
 * inventing one would silently fabricate a death. A life expectancy at or below the current age
 * lands in year 1; one beyond the window contributes nothing inside it.
 */
export function lifeExpectancyDeaths(members: readonly CohortMember[], years: number): DeathSeries {
	assertYears(years);
	const annual = new Array<number>(years).fill(0);

	for (const member of members) {
		const { currentAge, lifeExpectancyAge, weight = 1 } = member;
		if (lifeExpectancyAge === undefined) continue;
		const year = Math.max(1, lifeExpectancyAge - currentAge + 1);
		if (year > years) continue;
		annual[year - 1] += weight;
	}

	return withCumulative(annual);
}

/**
 * Expected lives (or weight) still alive at the *start* of each projection year, under the
 * mortality table. Index 0 is the start of year 1, so it is the group's full weight.
 */
export function expectedSurvivors(
	members: readonly CohortMember[],
	years: number
): readonly number[] {
	assertYears(years);
	const living = new Array<number>(years).fill(0);

	for (const member of members) {
		const { gender, currentAge, retirementAge = DEFAULT_RETIREMENT_AGE, weight = 1 } = member;
		const terminal = terminalAge(gender, 'retiree');
		const lastAge = Math.min(currentAge + years - 1, terminal ?? currentAge + years - 1);
		if (lastAge < currentAge) continue;

		const rows = lifeTable({ gender, startAge: currentAge, retirementAge, toAge: lastAge });
		for (const row of rows) {
			living[row.year - 1] += weight * row.livingAtStart;
		}
		// Past the terminal age the life is certainly dead and adds nothing to later years.
	}

	return living;
}
