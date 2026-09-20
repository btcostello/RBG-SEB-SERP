/**
 * Cell helpers for the three-period entry worksheets (pages 6.1, 6.2, 6.4).
 *
 * Those sheets print Debit and Credit as separate columns under each period, so a single entry line
 * occupies one side and leaves the other blank. These turn a period triple into the six-cell row
 * the sheet expects.
 *
 * Three cell states, all distinct and all meaningful:
 *
 * - `''` — this row does not use this column. A debit line has nothing to say in a credit column.
 * - `'N/A'` — the entry does not apply in this period at all. The initial entries are recorded once
 *   at inception, so they are N/A by the second calendar year. Zero would claim we recorded nothing;
 *   N/A says the question does not arise.
 * - a figure — as formatted by `worksheets.ts`, credits already in parentheses.
 *
 * `undefined` (returned when there are no amounts yet) is left to the sheet, which renders its own
 * "—" placeholder for a page that has not been computed.
 */
import type { PeriodValues } from '../worksheets';

/** The source's marker for an entry that does not apply in a period. */
export const NOT_APPLICABLE = 'N/A';

const cell = (value: string | null): string => value ?? NOT_APPLICABLE;

/** A debit line: amounts in the debit column of each period, credit columns blank. */
export function debitCells(amounts: PeriodValues | undefined): string[] | undefined {
	if (!amounts) return undefined;
	return [cell(amounts[0]), '', cell(amounts[1]), '', cell(amounts[2]), ''];
}

/** A credit line: amounts in the credit column of each period, debit columns blank. */
export function creditCells(amounts: PeriodValues | undefined): string[] | undefined {
	if (!amounts) return undefined;
	return ['', cell(amounts[0]), '', cell(amounts[1]), '', cell(amounts[2])];
}

/** A single-column line — the reconciliation and notes sheets, which print Debit / (Credit). */
export function signedCells(amounts: PeriodValues | undefined): string[] | undefined {
	if (!amounts) return undefined;
	return [cell(amounts[0]), cell(amounts[1]), cell(amounts[2])];
}
