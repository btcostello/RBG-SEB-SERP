import { describe, it, expect } from 'vitest';
import {
	completeLifeExpectancy,
	curtateLifeExpectancy,
	lifeTable,
	mortalityRate,
	survivalProbability
} from './index';

/** The year these tests value on; the static table is rebuilt annually. */
const YEAR = 2026;

describe('lifeTable — structure', () => {
	it('runs one row per year from startAge to the terminal age', () => {
		const rows = lifeTable({ valuationYear: YEAR, gender: 'M', startAge: 65 });
		expect(rows).toHaveLength(120 - 65 + 1);
		expect(rows[0]).toMatchObject({ age: 65, year: 1 });
		expect(rows[rows.length - 1]).toMatchObject({ age: 120, year: 56 });
	});

	it('opens at the radix', () => {
		expect(lifeTable({ valuationYear: YEAR, gender: 'M', startAge: 65 })[0].livingAtStart).toBe(1);
		expect(
			lifeTable({ valuationYear: YEAR, gender: 'M', startAge: 65, radix: 250 })[0].livingAtStart
		).toBe(250);
	});

	it('holds the recursion l(x+1) = l(x) − d(x)', () => {
		const rows = lifeTable({ valuationYear: YEAR, gender: 'F', startAge: 40 });
		for (let i = 1; i < rows.length; i++) {
			expect(rows[i].livingAtStart).toBeCloseTo(rows[i - 1].livingAtStart - rows[i - 1].deaths, 12);
		}
	});

	it('never brings anyone back to life', () => {
		const rows = lifeTable({ valuationYear: YEAR, gender: 'M', startAge: 30 });
		for (let i = 1; i < rows.length; i++) {
			expect(rows[i].livingAtStart).toBeLessThanOrEqual(rows[i - 1].livingAtStart);
			expect(rows[i].livingAtStart).toBeGreaterThanOrEqual(0);
		}
	});

	it.each([
		['M', 1],
		['F', 1],
		['M', 250],
		['F', 17.5]
	] as const)('accounts for every life: %s deaths sum to the radix %f', (gender, radix) => {
		const rows = lifeTable({ valuationYear: YEAR, gender, startAge: 45, radix });
		expect(rows[rows.length - 1].cumulativeDeaths).toBeCloseTo(radix, 12);
		// and nobody is left standing after the terminal year
		const last = rows[rows.length - 1];
		expect(last.livingAtStart - last.deaths).toBeCloseTo(0, 12);
	});

	it('accumulates cumulativeDeaths as the running total', () => {
		const rows = lifeTable({ valuationYear: YEAR, gender: 'M', startAge: 60, toAge: 70 });
		let running = 0;
		for (const row of rows) {
			running += row.deaths;
			expect(row.cumulativeDeaths).toBeCloseTo(running, 12);
		}
	});
});

describe('lifeTable — basis switch at retirement age', () => {
	it('uses the employee table before retirement and the retiree table from it', () => {
		const rows = lifeTable({ valuationYear: YEAR, gender: 'M', startAge: 55, retirementAge: 65 });
		for (const row of rows) {
			expect(row.basis).toBe(row.age < 65 ? 'nonAnnuitant' : 'annuitant');
		}
	});

	it('takes its rates from the basis it names', () => {
		// The two tables disagree at the same age — annuitant rates are higher than active-employee
		// rates — so this pins that the switch actually changes the source, not just a label.
		const rows = lifeTable({
			valuationYear: YEAR,
			gender: 'M',
			startAge: 60,
			retirementAge: 65,
			toAge: 66
		});
		const at = (age: number) => rows.find((r) => r.age === age)!;
		expect(at(64).q).toBe(mortalityRate('M', 'nonAnnuitant', 64, YEAR));
		expect(at(65).q).toBe(mortalityRate('M', 'annuitant', 65, YEAR));
		// The switch is a step *up*: annuitant tables carry no active-employee selection.
		expect(at(65).q).toBeGreaterThan(at(64).q);
	});

	it('honours a retirement age other than the default', () => {
		const rows = lifeTable({
			valuationYear: YEAR,
			gender: 'F',
			startAge: 55,
			retirementAge: 70,
			toAge: 72
		});
		expect(rows.find((r) => r.age === 69)!.basis).toBe('nonAnnuitant');
		expect(rows.find((r) => r.age === 70)!.basis).toBe('annuitant');
	});

	it('puts everyone on the retiree table when already past retirement', () => {
		const rows = lifeTable({ valuationYear: YEAR, gender: 'M', startAge: 72, retirementAge: 65 });
		expect(rows.every((r) => r.basis === 'annuitant')).toBe(true);
	});
});

describe('lifeTable — refuses configurations it cannot cover', () => {
	it('accepts any retirement age on the tables', () => {
		// The white collar basis could not do this: its employee series stopped at 80 and its
		// retiree series started at 50, so anything outside 50-81 left a hole. The IRS tables run
		// 0-120 on both bases, so every switching point tiles.
		for (const retirementAge of [40, 49, 50, 65, 81, 82, 95]) {
			expect(() =>
				lifeTable({ valuationYear: YEAR, gender: 'M', startAge: 40, retirementAge })
			).not.toThrow();
		}
	});

	it('projects from any age the tables cover, including childhood', () => {
		expect(() => lifeTable({ valuationYear: YEAR, gender: 'M', startAge: 0 })).not.toThrow();
		expect(() => lifeTable({ valuationYear: YEAR, gender: 'M', startAge: 17 })).not.toThrow();
	});

	it('throws rather than returning a short table when the span is uncovered', () => {
		// A silently truncated table would understate deaths — the dangerous direction.
		expect(() => lifeTable({ valuationYear: YEAR, gender: 'M', startAge: 121 })).toThrow(
			/do not cover/
		);
		// Before the 2012 base year there is no table to read at all.
		expect(() => lifeTable({ valuationYear: 2011, gender: 'M', startAge: 65 })).toThrow(
			/do not cover/
		);
	});

	it('validates its numeric arguments', () => {
		expect(() => lifeTable({ valuationYear: YEAR, gender: 'M', startAge: 65.5 })).toThrow(
			/whole number/
		);
		expect(() => lifeTable({ valuationYear: YEAR, gender: 'M', startAge: 65, toAge: 64 })).toThrow(
			/before startAge/
		);
		expect(() => lifeTable({ valuationYear: YEAR, gender: 'M', startAge: 65, radix: -1 })).toThrow(
			/zero or greater/
		);
	});
});

describe('survivalProbability', () => {
	it('is certain for an age already reached', () => {
		expect(survivalProbability('M', 65, 65, YEAR)).toBe(1);
		expect(survivalProbability('M', 65, 60, YEAR)).toBe(1);
	});

	it('is 1 − q over a single year', () => {
		// q(65) on the 2026 male annuitant table, built outside this module from the IRS base rate
		// and the improvement scale.
		expect(survivalProbability('M', 65, 66, YEAR)).toBeCloseTo(1 - 0.0091422071, 10);
	});

	it('compounds across years', () => {
		// (1 − q65)(1 − q66) = (1 − 0.0091422071)(1 − 0.0098695078), likewise computed independently.
		expect(survivalProbability('M', 65, 67, YEAR)).toBeCloseTo(0.9810785142, 10);
	});

	it('agrees with the life table it is derived from', () => {
		const rows = lifeTable({ valuationYear: YEAR, gender: 'F', startAge: 50 });
		for (const age of [55, 65, 80, 100]) {
			const row = rows.find((r) => r.age === age)!;
			expect(survivalProbability('F', 50, age, YEAR)).toBeCloseTo(row.livingAtStart, 12);
		}
	});

	it('reaches zero at the terminal age', () => {
		expect(survivalProbability('M', 65, 121, YEAR)).toBeCloseTo(0, 12);
	});
});

describe('life expectancy', () => {
	it('matches an independently computed curtate expectancy at 65', () => {
		// Σ tPx over the 2026 annuitant table, summed outside this module from the IRS base rates
		// and the improvement scale.
		expect(curtateLifeExpectancy('M', 65, YEAR)).toBeCloseTo(19.849133, 5);
		expect(curtateLifeExpectancy('F', 65, YEAR)).toBeCloseTo(21.436845, 5);
	});

	it('gives women the longer expectancy at every age', () => {
		for (const age of [50, 60, 65, 70, 80, 90]) {
			expect(curtateLifeExpectancy('F', age, YEAR)).toBeGreaterThan(
				curtateLifeExpectancy('M', age, YEAR)
			);
		}
	});

	it('falls as age rises', () => {
		for (let age = 50; age < 110; age += 5) {
			expect(curtateLifeExpectancy('M', age + 5, YEAR)).toBeLessThan(
				curtateLifeExpectancy('M', age, YEAR)
			);
		}
	});

	it('runs out at the terminal age', () => {
		// Alive at exactly 120 and q(120) = 1, so no further whole year is survived.
		expect(curtateLifeExpectancy('M', 120, YEAR)).toBe(0);
	});

	it('adds half a year for the complete expectancy', () => {
		expect(completeLifeExpectancy('M', 65, YEAR)).toBeCloseTo(
			curtateLifeExpectancy('M', 65, YEAR) + 0.5,
			12
		);
	});

	it('puts a 65-year-old male in the mid-eighties, near the plan default of 84', () => {
		// Plausibility guard on the whole chain — a wrong recursion shows up here as an
		// implausible age rather than a subtly wrong probability.
		const impliedDeathAge = 65 + completeLifeExpectancy('M', 65, YEAR);
		expect(impliedDeathAge).toBeGreaterThan(83);
		expect(impliedDeathAge).toBeLessThan(88);
	});
});
