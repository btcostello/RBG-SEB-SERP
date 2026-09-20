import { describe, it, expect } from 'vitest';
import {
	IRS_BASE_END_AGE,
	IRS_BASE_TABLES_2012,
	cumulativeImprovementFactor,
	irsBaseRate,
	irsCombinedStaticRate,
	irsStaticRate,
	projectionPeriod
} from './index';
import { IRS_STATIC_2024_PUBLISHED } from './irs-static-2024.fixture';

const GENDERS = ['M', 'F'] as const;
const round5 = (value: number) => Math.round(value * 1e5) / 1e5;

describe('base tables — shape', () => {
	it('runs every series from age 0 to 120', () => {
		for (const gender of GENDERS) {
			const series = IRS_BASE_TABLES_2012[gender];
			for (const run of [series.nonAnnuitant, series.annuitant, series.weightingFactor]) {
				expect(run).toHaveLength(IRS_BASE_END_AGE + 1);
				expect(run.every((value) => Number.isFinite(value))).toBe(true);
			}
		}
	});

	it('terminates at q = 1', () => {
		for (const gender of GENDERS) {
			expect(irsBaseRate(gender, 'nonAnnuitant', 120)).toBe(1);
			expect(irsBaseRate(gender, 'annuitant', 120)).toBe(1);
		}
	});

	it('covers the ages the white collar employee table could not', () => {
		// The Pri-2012 white collar employee series stopped at 80, which is what constrained
		// retirement ages to 50-81. These tables carry a rate at every age.
		expect(irsBaseRate('M', 'nonAnnuitant', 95)).toBeGreaterThan(0);
		expect(irsBaseRate('F', 'annuitant', 18)).toBeGreaterThan(0);
	});

	it('returns null off the ends', () => {
		expect(irsBaseRate('M', 'annuitant', -1)).toBeNull();
		expect(irsBaseRate('M', 'annuitant', 121)).toBeNull();
	});
});

describe('the regulation’s own worked example — § 1.430(h)(3)-1(b)(3)', () => {
	// "The mortality rate for 2024 that is applied to a male annuitant who is age 68 in 2024 is
	// equal to the product of the mortality rate ... for a male annuitant who was age 68 in 2012
	// (0.01418) and the cumulative mortality improvement factor ... [which] is 0.9827, and the
	// mortality rate for 2024 ... is 0.01393."
	it('holds the base rate the regulation quotes', () => {
		expect(irsBaseRate('M', 'annuitant', 68)).toBe(0.01418);
	});

	it('reproduces the cumulative improvement factor to the published four decimals', () => {
		const factor = cumulativeImprovementFactor('M', 68, { baseYear: 2012, targetYear: 2024 });
		expect(Math.round((factor ?? 0) * 1e4) / 1e4).toBe(0.9827);
	});

	it('reproduces the generational 2024 rate', () => {
		const factor = cumulativeImprovementFactor('M', 68, { baseYear: 2012, targetYear: 2024 }) ?? 0;
		expect(round5(0.01418 * factor)).toBe(0.01393);
	});
});

describe('projectionPeriod — § 1.430(h)(3)-1(c)(3)(ii)', () => {
	it('is 8 for males and 9 for females at the pivot age', () => {
		expect(projectionPeriod('M', 80)).toBe(8);
		expect(projectionPeriod('F', 80)).toBe(9);
	});

	it('adds a year for each year below 80', () => {
		expect(projectionPeriod('M', 79)).toBe(9);
		expect(projectionPeriod('M', 40)).toBe(48);
		expect(projectionPeriod('F', 0)).toBe(89);
	});

	it('takes off a third of a year for each year above 80', () => {
		expect(projectionPeriod('M', 83)).toBe(7);
		expect(projectionPeriod('M', 81)).toBeCloseTo(7 + 2 / 3, 12);
	});

	it('floors at zero and stays there', () => {
		expect(projectionPeriod('M', 104)).toBe(0);
		expect(projectionPeriod('M', 120)).toBe(0);
		expect(projectionPeriod('F', 107)).toBe(0);
		expect(projectionPeriod('F', 120)).toBe(0);
	});
});

describe('irsStaticRate', () => {
	it('projects further at younger ages, which is the point of a static table', () => {
		// A 35-year-old's single rate has to stand in for decades of future improvement that a
		// generational table would apply year by year; an 85-year-old's does not.
		expect(projectionPeriod('M', 35)).toBeGreaterThan(projectionPeriod('M', 85));
	});

	it('improves a rate relative to its 2012 base', () => {
		const base = irsBaseRate('M', 'annuitant', 65) ?? 0;
		const projected = irsStaticRate('M', 'annuitant', 65, 2026) ?? 0;
		expect(projected).toBeLessThan(base);
	});

	it('keeps improving as the valuation year advances', () => {
		const earlier = irsStaticRate('F', 'annuitant', 70, 2026) ?? 0;
		const later = irsStaticRate('F', 'annuitant', 70, 2036) ?? 0;
		expect(later).toBeLessThan(earlier);
	});

	it('interpolates across a fractional projection period', () => {
		// Age 82 males carry a period of 7 1/3 years, so the rate must land between the whole-year
		// results either side of it rather than snapping to one of them.
		const period = projectionPeriod('M', 82);
		expect(Number.isInteger(period)).toBe(false);

		const base = irsBaseRate('M', 'annuitant', 82) ?? 0;
		const toValuation =
			cumulativeImprovementFactor('M', 82, { baseYear: 2012, targetYear: 2026 }) ?? 0;
		const at = (years: number) =>
			base *
			toValuation *
			(cumulativeImprovementFactor('M', 82, { baseYear: 2026, targetYear: 2026 + years }) ?? 0);

		const rate = irsStaticRate('M', 'annuitant', 82, 2026) ?? 0;
		expect(rate).toBeLessThan(Math.max(at(7), at(8)));
		expect(rate).toBeGreaterThan(Math.min(at(7), at(8)));
	});

	it('holds q = 1 at the terminal age', () => {
		expect(irsStaticRate('M', 'annuitant', 120, 2030)).toBe(1);
	});

	it('returns null outside the tables', () => {
		expect(irsStaticRate('M', 'annuitant', 121, 2026)).toBeNull();
		expect(irsStaticRate('M', 'annuitant', 65, 2011)).toBeNull();
	});
});

describe('rebuilding the IRS’s own published 2024 static table', () => {
	const rebuilt = GENDERS.flatMap((gender) =>
		IRS_STATIC_2024_PUBLISHED[gender].map((published, age) => ({
			gender,
			age,
			published,
			got: round5(irsCombinedStaticRate(gender, age, 2024) ?? Number.NaN)
		}))
	);

	it('covers all 242 published rates', () => {
		expect(rebuilt).toHaveLength(242);
		expect(rebuilt.every((row) => Number.isFinite(row.got))).toBe(true);
	});

	it('lands within one unit of the fifth decimal on every rate', () => {
		// Compared in whole units of the last published decimal — subtracting two five-decimal rates
		// in binary floating point gives 1.0000000000100e-5 for a difference that is exactly one.
		const worst = rebuilt.reduce(
			(max, row) => Math.max(max, Math.abs(Math.round((row.got - row.published) * 1e5))),
			0
		);
		expect(worst).toBeLessThanOrEqual(1);
	});

	it('matches the published rate exactly on the large majority', () => {
		// The rest sit within 5e-6 of a rounding boundary: the IRS worked from unrounded MP-2021
		// rates, and only the four-decimal scale is published. If this count falls, the construction
		// has drifted — the residual is a data-precision limit, not slack to spend.
		const exact = rebuilt.filter((row) => row.got === row.published).length;
		expect(exact).toBeGreaterThanOrEqual(229);
	});

	it('reproduces both ends of the published table', () => {
		expect(round5(irsCombinedStaticRate('M', 0, 2024) ?? 0)).toBe(0.00356);
		expect(round5(irsCombinedStaticRate('F', 0, 2024) ?? 0)).toBe(0.00306);
		expect(round5(irsCombinedStaticRate('M', 120, 2024) ?? 0)).toBe(1);
		expect(round5(irsCombinedStaticRate('F', 120, 2024) ?? 0)).toBe(1);
	});
});
