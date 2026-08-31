import { describe, it, expect } from 'vitest';
import {
	completeLifeExpectancy,
	curtateLifeExpectancy,
	lifeTable,
	mortalityRate,
	survivalProbability
} from './index';

describe('lifeTable — structure', () => {
	it('runs one row per year from startAge to the terminal age', () => {
		const rows = lifeTable({ gender: 'M', startAge: 65 });
		expect(rows).toHaveLength(120 - 65 + 1);
		expect(rows[0]).toMatchObject({ age: 65, year: 1 });
		expect(rows[rows.length - 1]).toMatchObject({ age: 120, year: 56 });
	});

	it('opens at the radix', () => {
		expect(lifeTable({ gender: 'M', startAge: 65 })[0].livingAtStart).toBe(1);
		expect(lifeTable({ gender: 'M', startAge: 65, radix: 250 })[0].livingAtStart).toBe(250);
	});

	it('holds the recursion l(x+1) = l(x) − d(x)', () => {
		const rows = lifeTable({ gender: 'F', startAge: 40 });
		for (let i = 1; i < rows.length; i++) {
			expect(rows[i].livingAtStart).toBeCloseTo(rows[i - 1].livingAtStart - rows[i - 1].deaths, 12);
		}
	});

	it('never brings anyone back to life', () => {
		const rows = lifeTable({ gender: 'M', startAge: 30 });
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
		const rows = lifeTable({ gender, startAge: 45, radix });
		expect(rows[rows.length - 1].cumulativeDeaths).toBeCloseTo(radix, 12);
		// and nobody is left standing after the terminal year
		const last = rows[rows.length - 1];
		expect(last.livingAtStart - last.deaths).toBeCloseTo(0, 12);
	});

	it('accumulates cumulativeDeaths as the running total', () => {
		const rows = lifeTable({ gender: 'M', startAge: 60, toAge: 70 });
		let running = 0;
		for (const row of rows) {
			running += row.deaths;
			expect(row.cumulativeDeaths).toBeCloseTo(running, 12);
		}
	});
});

describe('lifeTable — basis switch at retirement age', () => {
	it('uses the employee table before retirement and the retiree table from it', () => {
		const rows = lifeTable({ gender: 'M', startAge: 55, retirementAge: 65 });
		for (const row of rows) {
			expect(row.basis).toBe(row.age < 65 ? 'employee' : 'retiree');
		}
	});

	it('takes its rates from the basis it names', () => {
		// The two tables disagree at the same age — annuitant rates are higher than active-employee
		// rates — so this pins that the switch actually changes the source, not just a label.
		const rows = lifeTable({ gender: 'M', startAge: 60, retirementAge: 65, toAge: 66 });
		const at = (age: number) => rows.find((r) => r.age === age)!;
		expect(at(64).q).toBe(mortalityRate('M', 'employee', 64));
		expect(at(64).q).toBe(0.00408);
		expect(at(65).q).toBe(mortalityRate('M', 'retiree', 65));
		expect(at(65).q).toBe(0.00812);
		expect(at(65).q).toBeGreaterThan(at(64).q);
	});

	it('honours a retirement age other than the default', () => {
		const rows = lifeTable({ gender: 'F', startAge: 55, retirementAge: 70, toAge: 72 });
		expect(rows.find((r) => r.age === 69)!.basis).toBe('employee');
		expect(rows.find((r) => r.age === 70)!.basis).toBe('retiree');
	});

	it('puts everyone on the retiree table when already past retirement', () => {
		const rows = lifeTable({ gender: 'M', startAge: 72, retirementAge: 65 });
		expect(rows.every((r) => r.basis === 'retiree')).toBe(true);
	});
});

describe('lifeTable — refuses configurations it cannot cover', () => {
	it('rejects a retirement age that leaves a gap between the tables', () => {
		// Below 50 there are no retiree rates; above 81 the employee series has run out.
		expect(() => lifeTable({ gender: 'M', startAge: 40, retirementAge: 49 })).toThrow(
			/leaves a gap/
		);
		expect(() => lifeTable({ gender: 'M', startAge: 40, retirementAge: 82 })).toThrow(
			/leaves a gap/
		);
		expect(() => lifeTable({ gender: 'M', startAge: 40, retirementAge: 50 })).not.toThrow();
		expect(() => lifeTable({ gender: 'M', startAge: 40, retirementAge: 81 })).not.toThrow();
	});

	it('throws rather than returning a short table when the span is uncovered', () => {
		// A silently truncated table would understate deaths — the dangerous direction.
		expect(() => lifeTable({ gender: 'M', startAge: 17 })).toThrow(/does not cover/);
	});

	it('validates its numeric arguments', () => {
		expect(() => lifeTable({ gender: 'M', startAge: 65.5 })).toThrow(/whole number/);
		expect(() => lifeTable({ gender: 'M', startAge: 65, toAge: 64 })).toThrow(/before startAge/);
		expect(() => lifeTable({ gender: 'M', startAge: 65, radix: -1 })).toThrow(/zero or greater/);
	});
});

describe('survivalProbability', () => {
	it('is certain for an age already reached', () => {
		expect(survivalProbability('M', 65, 65)).toBe(1);
		expect(survivalProbability('M', 65, 60)).toBe(1);
	});

	it('is 1 − q over a single year', () => {
		expect(survivalProbability('M', 65, 66)).toBeCloseTo(1 - 0.00812, 12);
	});

	it('compounds across years', () => {
		// (1 − q65)(1 − q66) = (1 − 0.00812)(1 − 0.00867), computed independently of the module.
		expect(survivalProbability('M', 65, 67)).toBeCloseTo(0.9832804004, 10);
	});

	it('agrees with the life table it is derived from', () => {
		const rows = lifeTable({ gender: 'F', startAge: 50 });
		for (const age of [55, 65, 80, 100]) {
			const row = rows.find((r) => r.age === age)!;
			expect(survivalProbability('F', 50, age)).toBeCloseTo(row.livingAtStart, 12);
		}
	});

	it('reaches zero at the terminal age', () => {
		expect(survivalProbability('M', 65, 121)).toBeCloseTo(0, 12);
	});
});

describe('life expectancy', () => {
	it('matches an independently computed curtate expectancy at 65', () => {
		// Σ tPx over the retiree table, summed outside this module from the source workbook.
		expect(curtateLifeExpectancy('M', 65)).toBeCloseTo(20.102807, 5);
		expect(curtateLifeExpectancy('F', 65)).toBeCloseTo(21.434763, 5);
	});

	it('gives women the longer expectancy at every age', () => {
		for (const age of [50, 60, 65, 70, 80, 90]) {
			expect(curtateLifeExpectancy('F', age)).toBeGreaterThan(curtateLifeExpectancy('M', age));
		}
	});

	it('falls as age rises', () => {
		for (let age = 50; age < 110; age += 5) {
			expect(curtateLifeExpectancy('M', age + 5)).toBeLessThan(curtateLifeExpectancy('M', age));
		}
	});

	it('runs out at the terminal age', () => {
		// Alive at exactly 120 and q(120) = 1, so no further whole year is survived.
		expect(curtateLifeExpectancy('M', 120)).toBe(0);
	});

	it('adds half a year for the complete expectancy', () => {
		expect(completeLifeExpectancy('M', 65)).toBeCloseTo(curtateLifeExpectancy('M', 65) + 0.5, 12);
	});

	it('puts a 65-year-old male in the mid-eighties, near the plan default of 84', () => {
		// Plausibility guard on the whole chain — a wrong recursion shows up here as an
		// implausible age rather than a subtly wrong probability.
		const impliedDeathAge = 65 + completeLifeExpectancy('M', 65);
		expect(impliedDeathAge).toBeGreaterThan(83);
		expect(impliedDeathAge).toBeLessThan(88);
	});
});
