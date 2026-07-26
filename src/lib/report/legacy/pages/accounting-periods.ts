/**
 * Column periods for the accounting worksheets (source F1/F2, section pages 6.1–6.4).
 *
 * The source shows three periods: the plan's first partial month, the first (partial) calendar
 * year, and the first full calendar year. All three derive from the plan effective date, so they
 * are real data even while every figure on those sheets is still a placeholder.
 */
import { shortDate } from '../../report-data';

export interface AccountingPeriod {
	/** Column group heading, e.g. "Calendar Year 2027". */
	label: string;
	/** Date range beneath it, e.g. "Jan 1, 2027 - Dec 31, 2027". */
	range: string;
}

const MONTH_NAMES = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec'
];

/** "Apr 2, 2026" — the source's range format, distinct from the footer's m/d/yyyy. */
function longish(date: Date): string {
	return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Build the three period columns from the plan reference date (effective date, else valuation
 * date — the same `legacyRefDate` the census and ledger pages key off).
 */
export function accountingPeriods(refDateIso: string): AccountingPeriod[] {
	const start = new Date(`${refDateIso}T00:00:00`);
	const year = start.getFullYear();
	// Day 0 of the next month is the last day of this one, which handles month length and leap years.
	const endOfMonth = new Date(year, start.getMonth() + 1, 0);
	const endOfYear = new Date(year, 11, 31);
	const nextStart = new Date(year + 1, 0, 1);
	const nextEnd = new Date(year + 1, 11, 31);

	return [
		{ label: 'First Month', range: `${longish(start)} - ${longish(endOfMonth)}` },
		{ label: `Calendar Year ${year}`, range: `${longish(start)} - ${longish(endOfYear)}` },
		{ label: `Calendar Year ${year + 1}`, range: `${longish(nextStart)} - ${longish(nextEnd)}` }
	];
}

/** Two value columns (Debit / Credit) under each period — the F1/F2 entry-worksheet shape. */
export function debitCreditColumns(periods: AccountingPeriod[]) {
	return periods.flatMap((period) =>
		['Debit', 'Credit'].map((label) => ({
			label,
			group: period.label,
			groupSub: period.range
		}))
	);
}

/** One signed value column per period — the F1 reconciliation / notes shape. */
export function signedColumns(periods: AccountingPeriod[]) {
	return periods.map((period) => ({
		label: 'Debit / (Credit)',
		group: period.label,
		groupSub: period.range
	}));
}

/** Re-exported so pages can render the plan start date in their notes. */
export { shortDate };
