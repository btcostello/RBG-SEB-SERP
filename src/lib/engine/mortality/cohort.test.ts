import { describe, it, expect } from 'vitest';
import {
	actuarialDeaths,
	expectedSurvivors,
	lifeExpectancyDeaths,
	survivalProbability,
	type CohortMember
} from './index';

/** Three lives, the shape a small SERP census takes. */
const CENSUS: CohortMember[] = [
	{ gender: 'M', currentAge: 53, lifeExpectancyAge: 84 },
	{ gender: 'F', currentAge: 47, lifeExpectancyAge: 87 },
	{ gender: 'M', currentAge: 61, lifeExpectancyAge: 84 }
];

describe('actuarialDeaths', () => {
	it('returns a series of the requested length', () => {
		const series = actuarialDeaths(CENSUS, 40);
		expect(series.annual).toHaveLength(40);
		expect(series.cumulative).toHaveLength(40);
	});

	it('accumulates into the cumulative series', () => {
		const { annual, cumulative } = actuarialDeaths(CENSUS, 30);
		let running = 0;
		annual.forEach((value, i) => {
			running += value;
			expect(cumulative[i]).toBeCloseTo(running, 12);
		});
	});

	it('spreads deaths rather than spiking them', () => {
		const { annual } = actuarialDeaths(CENSUS, 40);
		// Every year carries some expected mortality, and no single year takes a whole life.
		expect(annual.every((v) => v > 0)).toBe(true);
		expect(Math.max(...annual)).toBeLessThan(1);
	});

	it('buries the whole group given a long enough horizon', () => {
		// The table terminates at q = 1, so cumulative deaths converge on the group's weight.
		const series = actuarialDeaths(CENSUS, 80);
		expect(series.cumulative[series.cumulative.length - 1]).toBeCloseTo(CENSUS.length, 9);
	});

	it('scales linearly with weight', () => {
		const one = actuarialDeaths([{ gender: 'M', currentAge: 60 }], 20);
		const ten = actuarialDeaths([{ gender: 'M', currentAge: 60, weight: 10 }], 20);
		ten.annual.forEach((value, i) => expect(value).toBeCloseTo(one.annual[i] * 10, 12));
	});

	it('adds members together', () => {
		const a: CohortMember = { gender: 'M', currentAge: 60 };
		const b: CohortMember = { gender: 'F', currentAge: 55 };
		const both = actuarialDeaths([a, b], 25);
		const apart = [actuarialDeaths([a], 25), actuarialDeaths([b], 25)];
		both.annual.forEach((value, i) =>
			expect(value).toBeCloseTo(apart[0].annual[i] + apart[1].annual[i], 12)
		);
	});

	it("year one's deaths are just q at the current age", () => {
		// Male aged 60, pre-retirement, so the employee table: q(60) = 0.00287.
		expect(actuarialDeaths([{ gender: 'M', currentAge: 60 }], 5).annual[0]).toBeCloseTo(
			0.00287,
			12
		);
	});

	it('handles a horizon that runs past the terminal age', () => {
		const series = actuarialDeaths([{ gender: 'M', currentAge: 100 }], 60);
		expect(series.annual).toHaveLength(60);
		// Dead by 120 — year 21 onward is empty, and the total is still exactly one life.
		expect(series.cumulative[series.cumulative.length - 1]).toBeCloseTo(1, 12);
		expect(series.annual.slice(21).every((v) => v === 0)).toBe(true);
	});

	it('rejects a nonsense horizon', () => {
		expect(() => actuarialDeaths(CENSUS, 0)).toThrow(/at least 1/);
		expect(() => actuarialDeaths(CENSUS, 2.5)).toThrow(/whole number/);
	});
});

describe('lifeExpectancyDeaths', () => {
	it('spikes in the year the life reaches its assumed death age', () => {
		// Aged 53 with an assumed death age of 84 dies in year 84 − 53 + 1 = 32, matching how
		// accounting-projection.ts keys its life-expectancy death benefit (age === lifeExpectancy).
		const { annual } = lifeExpectancyDeaths(
			[{ gender: 'M', currentAge: 53, lifeExpectancyAge: 84 }],
			40
		);
		expect(annual[31]).toBe(1);
		expect(annual.filter((v) => v !== 0)).toHaveLength(1);
	});

	it('stacks lives sharing a death year', () => {
		const { annual } = lifeExpectancyDeaths(CENSUS, 45);
		// The two males, aged 53 and 61, both assume death at 84 — years 32 and 24.
		expect(annual[31]).toBe(1);
		expect(annual[23]).toBe(1);
		// The female, aged 47 assuming 87, lands in year 41.
		expect(annual[40]).toBe(1);
	});

	it('counts every life exactly once over a long horizon', () => {
		const series = lifeExpectancyDeaths(CENSUS, 60);
		expect(series.cumulative[series.cumulative.length - 1]).toBe(CENSUS.length);
	});

	it('drops lives whose assumed death falls beyond the window', () => {
		const series = lifeExpectancyDeaths(CENSUS, 25);
		// Only the 61-year-old (year 24) dies inside a 25-year window.
		expect(series.cumulative[24]).toBe(1);
	});

	it('lands a life expectancy at or below the current age in year one', () => {
		const { annual } = lifeExpectancyDeaths(
			[{ gender: 'M', currentAge: 90, lifeExpectancyAge: 84 }],
			10
		);
		expect(annual[0]).toBe(1);
	});

	it('skips members with no assumed death age rather than inventing one', () => {
		const series = lifeExpectancyDeaths([{ gender: 'M', currentAge: 53 }], 50);
		expect(series.cumulative[49]).toBe(0);
	});

	it('respects weight', () => {
		const { annual } = lifeExpectancyDeaths(
			[{ gender: 'M', currentAge: 60, lifeExpectancyAge: 84, weight: 250000 }],
			30
		);
		expect(annual[24]).toBe(250000);
	});
});

describe('the two bases against each other', () => {
	it('agree on the total and disagree on the timing', () => {
		// This is the point of the Appendix G chart: same group, same eventual total, very
		// different shape.
		const actuarial = actuarialDeaths(CENSUS, 80);
		const assumed = lifeExpectancyDeaths(CENSUS, 80);
		expect(actuarial.cumulative[79]).toBeCloseTo(assumed.cumulative[79], 9);
		expect(Math.max(...actuarial.annual)).toBeLessThan(Math.max(...assumed.annual));
	});
});

describe('expectedSurvivors', () => {
	it('starts with the whole group', () => {
		expect(expectedSurvivors(CENSUS, 30)[0]).toBe(CENSUS.length);
	});

	it('declines every year', () => {
		const living = expectedSurvivors(CENSUS, 50);
		for (let i = 1; i < living.length; i++) {
			expect(living[i]).toBeLessThanOrEqual(living[i - 1]);
		}
	});

	it('ties to the deaths series', () => {
		const living = expectedSurvivors(CENSUS, 40);
		const { annual } = actuarialDeaths(CENSUS, 40);
		for (let i = 1; i < living.length; i++) {
			expect(living[i]).toBeCloseTo(living[i - 1] - annual[i - 1], 12);
		}
	});

	it('is the survival probability for a single life', () => {
		const living = expectedSurvivors([{ gender: 'F', currentAge: 50 }], 30);
		expect(living[20]).toBeCloseTo(survivalProbability('F', 50, 70), 12);
	});
});
