/**
 * Accounting module barrel — the third calculation module.
 *
 * Runs after liability (engine) and asset (funding) to produce the GAAP accounting view for the
 * report's earnings-impact ledger and entry worksheets. See `accounting-projection.ts` for what is
 * built and what is not, and `src/lib/report/legacy/DATA-GAPS.md` for the report-side picture.
 */
export { computeAccounting, lifeOfProgramHorizon, coliEarningsByOption } from './accounting-projection';
export type {
	AccountingResult,
	SerpAccountingYear,
	ColiAccountingYear,
	ParticipantPensionAllocation,
	ComputeAccountingParams
} from './accounting-projection';

export {
	WORKSHEET_PERIOD_COUNT,
	allocateToPeriods,
	balanceAtPeriodEnd,
	onceAtInception,
	stubMonths
} from './periods';
export type { PeriodTriple } from './periods';
