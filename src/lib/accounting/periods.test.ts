import { describe, it, expect } from 'vitest';
import { Big } from '$lib/money/money';
import { allocateToPeriods, balanceAtPeriodEnd, onceAtInception, stubMonths } from './periods';

const big = (n: number) => new Big(n);
const nums = (triple: readonly (Big | null)[]) =>
	triple.map((v) => (v === null ? null : v.toNumber()));

describe('stubMonths', () => {
	it('counts the effective month through December', () => {
		expect(stubMonths('2025-10-27')).toBe(3); // Oct, Nov, Dec
		expect(stubMonths('2026-01-01')).toBe(12);
		expect(stubMonths('2026-12-31')).toBe(1);
		expect(stubMonths('2026-07-15')).toBe(6);
	});

	it('depends on the month, not the day', () => {
		expect(stubMonths('2025-10-01')).toBe(stubMonths('2025-10-31'));
	});
});

describe('allocateToPeriods', () => {
	it('spreads plan year 1 evenly across its months', () => {
		const [firstMonth, firstYear] = allocateToPeriods([big(1200), big(0)], '2025-10-27');
		expect(firstMonth.toNumber()).toBe(100);
		expect(firstYear.toNumber()).toBe(300); // three months of the stub year
	});

	it('builds the second calendar year from the tail of PY1 and the head of PY2', () => {
		// Nine months of plan year 1 plus three of plan year 2 — the second calendar year is not a
		// plan year, which is the whole reason this module exists.
		const [, , secondYear] = allocateToPeriods([big(1200), big(2400)], '2025-10-27');
		expect(secondYear.toNumber()).toBe(1200 * 0.75 + 2400 * 0.25);
	});

	it('degenerates correctly for a plan starting in January', () => {
		// The stub year IS a full year, so the second calendar year is plan year 2 outright.
		const [firstMonth, firstYear, secondYear] = allocateToPeriods(
			[big(1200), big(2400)],
			'2026-01-01'
		);
		expect(firstMonth.toNumber()).toBe(100);
		expect(firstYear.toNumber()).toBe(1200);
		expect(secondYear.toNumber()).toBe(2400);
	});

	it('treats a missing plan year 2 as zero', () => {
		const [, , secondYear] = allocateToPeriods([big(1200)], '2025-10-27');
		expect(secondYear.toNumber()).toBe(900);
	});

	it('is zero throughout for an empty series', () => {
		expect(nums(allocateToPeriods([], '2025-10-27'))).toEqual([0, 0, 0]);
	});
});

describe("reproduces the source report's own columns", () => {
	// Charles P Johnson & Associates sample, plan start 27 Oct 2025, 5.75% discount, 21% tax.
	// The plan-year figures below are what the published columns imply; the assertions check that
	// the allocation puts them back where the source printed them.
	const REF = '2025-10-27';
	const within = (got: Big, want: number, tolerance = 6) =>
		Math.abs(got.toNumber() - want) <= tolerance;

	it('service cost: 37,266 / 111,799 / 453,625', () => {
		const [a, b, c] = allocateToPeriods([big(447196), big(472912)], REF);
		expect(within(a, 37266)).toBe(true);
		expect(within(b, 111799)).toBe(true);
		expect(within(c, 453625)).toBe(true);
	});

	it('interest cost: 18,240 / 54,721 / 228,461', () => {
		// Plan year 1 interest is 5.75% x the 3,806,707 opening obligation — computed from the
		// source's own inputs, not fitted to its outputs.
		const py1 = big(3806707).times(0.0575);
		const py2 = big(3806707).plus(447196).plus(py1).times(0.0575);
		const [a, b, c] = allocateToPeriods([py1, py2], REF);
		expect(within(a, 18240)).toBe(true);
		expect(within(b, 54721)).toBe(true);
		expect(within(c, 228461)).toBe(true);
	});

	it('prior service cost amortisation, which is level: 19,827 / 59,480 / 237,919', () => {
		const level = big(237919);
		const [a, b, c] = allocateToPeriods([level, level], REF);
		expect(within(a, 19827)).toBe(true);
		expect(within(b, 59480)).toBe(true);
		expect(within(c, 237919)).toBe(true);
	});
});

describe('onceAtInception', () => {
	it('records in the first month and the first calendar year, and not again', () => {
		expect(nums(onceAtInception(big(3806707)))).toEqual([3806707, 3806707, null]);
	});

	it('marks the later period N/A rather than zero', () => {
		// Zero would read as "we recorded nothing"; the entry simply does not apply there.
		expect(onceAtInception(big(1))[2]).toBeNull();
	});
});

describe('balanceAtPeriodEnd', () => {
	it('accumulates rather than treating each period separately', () => {
		// The first month sits inside the first calendar year, which the second follows — so the
		// closing balances nest in time.
		const balances = balanceAtPeriodEnd(big(0), [big(1200), big(1200)], '2025-10-27');
		expect(nums(balances)).toEqual([100, 300, 1500]);
	});

	it('carries an opening balance into every period', () => {
		const balances = balanceAtPeriodEnd(big(500), [big(1200), big(1200)], '2025-10-27');
		expect(nums(balances)).toEqual([600, 800, 2000]);
	});

	it("reproduces the source's liability balances: 3,862,213 / 3,973,227 / 4,655,313", () => {
		// Opening liability is the 3,806,707 prior service cost; it then accrues service + interest.
		const accrualPy1 = big(447196).plus(big(3806707).times(0.0575));
		const accrualPy2 = big(472912).plus(big(4472789).times(0.0575));
		const balances = balanceAtPeriodEnd(big(3806707), [accrualPy1, accrualPy2], '2025-10-27');
		const nums3 = balances.map((b) => Math.round(b.toNumber()));
		expect(Math.abs(nums3[0] - 3862213)).toBeLessThanOrEqual(6);
		expect(Math.abs(nums3[1] - 3973227)).toBeLessThanOrEqual(6);
		expect(Math.abs(nums3[2] - 4655313)).toBeLessThanOrEqual(30);
	});
});
