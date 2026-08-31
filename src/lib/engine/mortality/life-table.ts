/**
 * Single-life survival math (DATA-GAPS.md "Missing subsystem — mortality table data", item 3).
 *
 * Pure, deterministic, side-effect-free. A plain discrete life table on integer ages — the
 * standard textbook recursion and nothing more:
 *
 *   p(x) = 1 − q(x)                 survival through the year beginning at exact age x
 *   l(x+1) = l(x) · p(x)            lives remaining at the next exact age
 *   d(x)   = l(x) · q(x)            deaths during the year
 *   tPx    = Π p(x+k), k = 0…t−1    probability of surviving t whole years from x
 *
 * There are **no fractional-age assumptions** here. Deaths are attributed to the whole year in
 * which they occur, which is all the annual projection needs. The one place a within-year
 * assumption appears is {@link completeLifeExpectancy}, and it is opt-in and documented there.
 *
 * `l(x)` is a *probability* by default (radix 1), not a headcount: `livingAtStart` is the chance
 * this one life reaches that age. Pass a `radix` to scale to a cohort instead.
 *
 * Rates and probabilities are plain numbers, not big.js — see the note in ./table.ts.
 */
import type { Gender } from '$lib/domain/insured';
import {
	DEFAULT_RETIREMENT_AGE,
	assertSupportedRetirementAge,
	basisForAge,
	rateForAge,
	terminalAge,
	type MortalityBasis
} from './table';

/** One projection year for one life. */
export interface LifeTableRow {
	/** Exact age at the start of the year. */
	readonly age: number;
	/** 1-based projection year: 1 is the year running from `startAge` to `startAge + 1`. */
	readonly year: number;
	/** Which table supplied `q` — flips at the retirement age. */
	readonly basis: MortalityBasis;
	/** q(x): probability of dying during this year, given alive at its start. */
	readonly q: number;
	/** l(x): expected lives alive at the start of the year (radix at `startAge`). */
	readonly livingAtStart: number;
	/** d(x) = l(x)·q(x): expected deaths during the year. */
	readonly deaths: number;
	/** Running total of `deaths` through the end of this year. */
	readonly cumulativeDeaths: number;
}

export interface LifeTableOptions {
	readonly gender: Gender;
	/** Exact age the projection starts from. */
	readonly startAge: number;
	/** Age at which the life moves to the retiree table. Defaults to 65. */
	readonly retirementAge?: number;
	/** Lives at `startAge`. Defaults to 1, making `livingAtStart` a survival probability. */
	readonly radix?: number;
	/** Last age to project. Defaults to the table's terminal age, where survival reaches zero. */
	readonly toAge?: number;
}

/**
 * Builds the life table for one life, one row per year from `startAge` through `toAge`.
 *
 * Run to the default `toAge` the table is complete: every life dies, so `cumulativeDeaths` on the
 * final row equals the radix and `livingAtStart` reaches zero after it.
 *
 * Throws rather than returning a short table if the requested span is not covered — a projection
 * that silently stopped early would understate deaths, which is the dangerous direction.
 */
export function lifeTable(options: LifeTableOptions): LifeTableRow[] {
	const {
		gender,
		startAge,
		retirementAge = DEFAULT_RETIREMENT_AGE,
		radix = 1,
		toAge = terminalAge(gender, 'retiree') ?? undefined
	} = options;

	if (!Number.isInteger(startAge)) {
		throw new Error('lifeTable: startAge must be a whole number');
	}
	if (toAge === undefined) {
		throw new Error('lifeTable: table has no terminal age; pass an explicit toAge');
	}
	if (!Number.isInteger(toAge)) {
		throw new Error('lifeTable: toAge must be a whole number');
	}
	if (!(radix >= 0)) {
		throw new Error('lifeTable: radix must be zero or greater');
	}
	assertSupportedRetirementAge(retirementAge);
	if (toAge < startAge) {
		throw new Error(`lifeTable: toAge ${toAge} is before startAge ${startAge}`);
	}

	const rows: LifeTableRow[] = [];
	let living = radix;
	let cumulativeDeaths = 0;

	for (let age = startAge; age <= toAge; age++) {
		const q = rateForAge(gender, age, retirementAge);
		if (q === null) {
			throw new Error(
				`lifeTable: no ${basisForAge(age, retirementAge)} rate for ${gender} at age ${age}; ` +
					`the table does not cover the requested span ${startAge}-${toAge}`
			);
		}
		const deaths = living * q;
		cumulativeDeaths += deaths;
		rows.push({
			age,
			year: age - startAge + 1,
			basis: basisForAge(age, retirementAge),
			q,
			livingAtStart: living,
			deaths,
			cumulativeDeaths
		});
		living -= deaths;
	}

	return rows;
}

/**
 * tPx — probability that a life aged `fromAge` survives to exact age `toAge`.
 *
 * 1 when `toAge <= fromAge` (surviving to an age already reached is certain). Throws if the span
 * is not covered by the tables.
 */
export function survivalProbability(
	gender: Gender,
	fromAge: number,
	toAge: number,
	retirementAge: number = DEFAULT_RETIREMENT_AGE
): number {
	if (toAge <= fromAge) return 1;
	// Surviving *to* toAge means living through the years beginning at fromAge … toAge − 1.
	const rows = lifeTable({ gender, startAge: fromAge, retirementAge, toAge: toAge - 1 });
	return rows.reduce((p, row) => p * (1 - row.q), 1);
}

/**
 * Curtate life expectancy e(x): the expected number of *whole* years a life aged `age` survives,
 * i.e. Σ tPx for t = 1, 2, … It is the plain sum of survival probabilities, with no assumption
 * about when in the year deaths fall.
 */
export function curtateLifeExpectancy(
	gender: Gender,
	age: number,
	retirementAge: number = DEFAULT_RETIREMENT_AGE
): number {
	const rows = lifeTable({ gender, startAge: age, retirementAge });
	// Σ tPx for t ≥ 1 is the same as Σ l(x+t)/l(x), which is every row's opening lives except
	// the first, plus the (zero) tail after the terminal row.
	return rows.slice(1).reduce((sum, row) => sum + row.livingAtStart, 0);
}

/**
 * Complete life expectancy — curtate plus a half year.
 *
 * The half year is the standard uniform-distribution-of-deaths adjustment: on average a death
 * occurring during a year happens midway through it. It is the one within-year assumption in this
 * module, which is why it is a separate function rather than folded into the curtate figure.
 * Use it when comparing against an "assumed age at death" such as the plan's life-expectancy
 * input; use {@link curtateLifeExpectancy} for whole-year projection arithmetic.
 */
export function completeLifeExpectancy(
	gender: Gender,
	age: number,
	retirementAge: number = DEFAULT_RETIREMENT_AGE
): number {
	return curtateLifeExpectancy(gender, age, retirementAge) + 0.5;
}
