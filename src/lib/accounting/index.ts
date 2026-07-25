/**
 * Accounting module barrel — the third calculation module (STUB).
 *
 * Runs after liability (engine) and asset (funding) to produce the GAAP accounting view for the
 * report's earnings-impact ledger and entry worksheets. Scaffold only today: see
 * `accounting-projection.ts` and `src/lib/report/legacy/DATA-GAPS.md`.
 */
export { computeAccounting, lifeOfProgramHorizon, coliEarningsByOption } from './accounting-projection';
export type {
	AccountingResult,
	SerpAccountingYear,
	ColiAccountingYear,
	ParticipantPensionAllocation,
	ComputeAccountingParams
} from './accounting-projection';
