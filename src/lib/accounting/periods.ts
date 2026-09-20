/**
 * Period allocation for the accounting entry worksheets (report pages 6.1, 6.2, 6.3-1, 6.4).
 *
 * Those four sheets are not on the calendar-year axis the ledgers use. They show three columns —
 * the plan's first month, its first (partial) calendar year, and its first full calendar year —
 * because that is what an accountant needs to open the books on a plan that starts mid-year.
 *
 * The rest of the accounting module works in **plan years**, which start on the plan effective date
 * and so straddle calendar years. This module bridges the two.
 *
 * ## The rule
 *
 * A plan-year amount is spread evenly across its twelve months, and each period collects the months
 * it covers. Writing `m` for the number of whole calendar months from the effective month through
 * December (October → Oct, Nov, Dec = 3):
 *
 * ```
 * first month          = PY1 / 12
 * first calendar year  = PY1 × m / 12
 * second calendar year = PY1 × (12 − m) / 12  +  PY2 × m / 12
 * ```
 *
 * The second calendar year is the interesting one: it is not a plan year. It picks up the tail of
 * plan year 1 and the head of plan year 2, which is why it cannot simply read a single row of the
 * projection.
 *
 * ## Where the rule comes from
 *
 * Reverse-engineered from the source report's own figures and confirmed independently. For a plan
 * starting 27 October 2025 at a 5.75% discount rate, the published columns imply a plan-year-1
 * interest cost of 218,884 — and 5.75% × the opening obligation of 3,806,707 is 218,886. Service
 * cost implies a plan-year-2 figure 5.75% above plan year 1, and prior service cost amortisation
 * implies plan year 2 equal to plan year 1, which is what level amortisation should do. Three
 * independent quantities all land on the same rule.
 *
 * ## What it is not
 *
 * Even monthly spreading is a presentation convention, not an accrual calculation: real interest
 * compounds through the year and real service cost is earned continuously. The source does it this
 * way and it is the right call for a proposal — the periods are there to show an accountant the
 * shape of the entries, not to close a month.
 */
import { Big } from '$lib/money/money';

/** The three columns those worksheets carry, in order. */
export const WORKSHEET_PERIOD_COUNT = 3;

/** A quantity allocated across the three worksheet periods. */
export type PeriodTriple = [Big, Big, Big];

/**
 * Whole calendar months from the plan effective date's month through December, inclusive.
 * A plan starting in any part of October covers October, November and December — three months.
 */
export function stubMonths(refDateIso: string): number {
	const month = new Date(`${refDateIso}T00:00:00`).getMonth(); // 0-based
	return 12 - month;
}

/**
 * Spread a per-plan-year series across the three worksheet periods.
 *
 * `annualByPlanYear[0]` is plan year 1. A series shorter than two years treats the missing plan
 * year as zero, which is right for a quantity that simply stops.
 */
export function allocateToPeriods(
	annualByPlanYear: readonly Big[],
	refDateIso: string
): PeriodTriple {
	const months = stubMonths(refDateIso);
	const py1 = annualByPlanYear[0] ?? new Big(0);
	const py2 = annualByPlanYear[1] ?? new Big(0);

	const firstMonth = py1.div(12);
	const firstCalendarYear = py1.times(months).div(12);
	const secondCalendarYear = py1
		.times(12 - months)
		.div(12)
		.plus(py2.times(months).div(12));

	return [firstMonth, firstCalendarYear, secondCalendarYear];
}

/**
 * A quantity that is recorded **once, at plan inception** — the initial prior service cost and its
 * tax effect.
 *
 * It falls in the first month, and therefore also in the first calendar year that contains it. It
 * does not recur, so the second calendar year is `null` rather than zero: the source prints "N/A"
 * there, and zero would read as "we recorded nothing" instead of "this entry does not apply".
 */
export function onceAtInception(amount: Big): [Big, Big, null] {
	return [amount, amount, null];
}

/**
 * A closing balance at the end of each period — not a flow, so it is never prorated.
 *
 * `openingBalance` is the balance before the plan starts (zero at inception) and `flowsByPlanYear`
 * is the movement in each plan year. The balance at the end of a period is the opening balance plus
 * everything that has flowed up to that point, so this accumulates the allocated flows.
 */
export function balanceAtPeriodEnd(
	openingBalance: Big,
	flowsByPlanYear: readonly Big[],
	refDateIso: string
): PeriodTriple {
	const [firstMonth, firstCalendarYear, secondCalendarYear] = allocateToPeriods(
		flowsByPlanYear,
		refDateIso
	);
	// The periods are nested in time: the first month sits inside the first calendar year, which is
	// followed by the second. So balances accumulate rather than each standing alone.
	return [
		openingBalance.plus(firstMonth),
		openingBalance.plus(firstCalendarYear),
		openingBalance.plus(firstCalendarYear).plus(secondCalendarYear)
	];
}
