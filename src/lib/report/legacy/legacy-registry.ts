/**
 * Legacy Report page registry.
 *
 * An alternative, data-driven report ("Legacy Report") built section by section from
 * operator-supplied source pages. Like the production report registry, this is an ordered list
 * of `{ id, title, component }` entries rendered in order — adding a page is purely additive:
 * append an entry here and it appears with no change to existing pages or to `LegacyReportView`.
 *
 * Pages reuse the derived `ReportModel` (from ../report-data) and the shared report design
 * system, so the Legacy Report matches the house format. Where a page needs data the model does
 * not yet carry, the gap is left as a labelled placeholder and tracked in ./DATA-GAPS.md until
 * the necessary inputs/calculations are added.
 */
import type { Component } from 'svelte';
import type { ReportModel } from '../report-data';
import LegacyCoverPage from './pages/LegacyCoverPage.svelte';
import LegacyTitlePage from './pages/LegacyTitlePage.svelte';
import LegacyDisclosurePageA from './pages/LegacyDisclosurePageA.svelte';
import LegacyDisclosurePageB from './pages/LegacyDisclosurePageB.svelte';
import LegacyTocPage from './pages/LegacyTocPage.svelte';
import LegacyConsiderationsPage from './pages/LegacyConsiderationsPage.svelte';
import LegacyAmsPage from './pages/LegacyAmsPage.svelte';
import LegacyBenefitFormulaPage from './pages/LegacyBenefitFormulaPage.svelte';
import LegacyBenefitFormulaSpecPage from './pages/LegacyBenefitFormulaSpecPage.svelte';
import LegacyPlanSpecsPage from './pages/LegacyPlanSpecsPage.svelte';
import LegacyPlanSpecsDetailPage from './pages/LegacyPlanSpecsDetailPage.svelte';
import LegacyCensusPage from './pages/LegacyCensusPage.svelte';
import LegacyProjectionsPage from './pages/LegacyProjectionsPage.svelte';
import LegacyFinOverviewPageA from './pages/LegacyFinOverviewPageA.svelte';
import LegacyFinOverviewPageB from './pages/LegacyFinOverviewPageB.svelte';
import LegacyFundingOverviewPage from './pages/LegacyFundingOverviewPage.svelte';
import LegacyCashFlowSummaryPage from './pages/LegacyCashFlowSummaryPage.svelte';
import LegacyEarningsImpactPage from './pages/LegacyEarningsImpactPage.svelte';
import LegacyEarningsLedgerOption1Page from './pages/LegacyEarningsLedgerOption1Page.svelte';
import LegacyEarningsLedgerOption2Page from './pages/LegacyEarningsLedgerOption2Page.svelte';
import LegacyEarningsLedgerOption3Page from './pages/LegacyEarningsLedgerOption3Page.svelte';
import LegacyEarningsLedgerOption4Page from './pages/LegacyEarningsLedgerOption4Page.svelte';
import LegacySerpEntriesPage from './pages/LegacySerpEntriesPage.svelte';
import LegacySerpReconciliationPage from './pages/LegacySerpReconciliationPage.svelte';
import LegacySerpNotesPage from './pages/LegacySerpNotesPage.svelte';
import LegacyColiEntriesPage from './pages/LegacyColiEntriesPage.svelte';
import LegacyAuditTrailPage from './pages/LegacyAuditTrailPage.svelte';
import LegacyCostAllocationPage from './pages/LegacyCostAllocationPage.svelte';
import LegacyBenefitStatementPage from './pages/LegacyBenefitStatementPage.svelte';
import LegacyFaceSurvivorOption1Page from './pages/LegacyFaceSurvivorOption1Page.svelte';
import LegacyFaceSurvivorOption2Page from './pages/LegacyFaceSurvivorOption2Page.svelte';
import LegacyOptionLedgerPage from './pages/LegacyOptionLedgerPage.svelte';
import LegacyAccountingDescPage from './pages/LegacyAccountingDescPage.svelte';
import LegacySerpOverviewPage from './pages/LegacySerpOverviewPage.svelte';
import LegacyColiOverviewPage from './pages/LegacyColiOverviewPage.svelte';

export interface LegacyReportPage {
	/** Stable id (unique within the registry). */
	id: string;
	/** Human title (for nav / page labels). */
	title: string;
	/** The Svelte component that renders the page; receives the `ReportModel`. */
	component: Component<{ report: ReportModel }>;
	/**
	 * Extra props merged in alongside `report`. Lets one component serve several registry
	 * entries — e.g. the Appendix C ledgers, which are the same sheet per option and year slice.
	 */
	props?: Record<string, unknown>;
	/** Render this sheet rotated (10in × 7.5in). For pages too wide for a portrait sheet. */
	landscape?: boolean;
}

/** Appendix C option titles, verbatim from the source sheets. */
const LEDGER_OPTIONS = [
	{ id: 'cost-recovery', title: 'Option 1 — Recovery of Net Program Costs from COLI upon Mortality' },
	{ id: 'benefit-distribution', title: 'Option 2 — SERP Benefit Funding from COLI Assets' },
	{ id: 'premium-deposit', title: 'Option 3 — SERP Benefit Funding Wherewithal Based on COLI Assets' },
	{ id: 'premium-recovery', title: 'Option 4 — SERP Benefit Funding from COLI Assets & Cost Recovery' }
] as const;

/** The registered Legacy Report pages, rendered in this order. Appended one section at a time. */
export const legacyReportPages: LegacyReportPage[] = [
	{ id: 'a1-cover', title: 'Cover', component: LegacyCoverPage },
	{ id: 'a3-title', title: 'Title Page', component: LegacyTitlePage },
	{ id: 'a4-disclosure-1', title: 'Disclosure', component: LegacyDisclosurePageA },
	{ id: 'a4-disclosure-2', title: 'Disclosure (continued)', component: LegacyDisclosurePageB },
	{ id: 'a5-toc', title: 'Table of Contents', component: LegacyTocPage },
	{ id: 'a6-considerations', title: 'Considerations', component: LegacyConsiderationsPage },
	{ id: 'b1-ams', title: 'SERP Actuarial Modeling System', component: LegacyAmsPage },
	{ id: 'b2-benefit-formula', title: 'SERP Benefit Formula', component: LegacyBenefitFormulaPage },
	{ id: 'b3-benefit-formula-spec', title: 'Participant Benefits Formula', component: LegacyBenefitFormulaSpecPage },
	{ id: 'b4-plan-specs', title: 'Plan Specifications and Actuarial Assumptions', component: LegacyPlanSpecsPage },
	{ id: 'b5-plan-specs-detail', title: 'Plan Specifications & Assumptions Overview', component: LegacyPlanSpecsDetailPage },
	{ id: 'c1-census', title: 'SERP Plan Census', component: LegacyCensusPage },
	{ id: 'c1-projections', title: 'Plan Participant Summary — Projections', component: LegacyProjectionsPage },
	{ id: 'd1-fin-overview-1', title: 'Financial Overview', component: LegacyFinOverviewPageA },
	{ id: 'd1-fin-overview-2', title: 'Financial Overview (continued)', component: LegacyFinOverviewPageB },
	{ id: 'd2-funding-overview', title: 'Overview — SERP Benefit Financing', component: LegacyFundingOverviewPage },
	{ id: 'd5-cash-flow-summary', title: 'Cash Flow Summary — Life of Plan', component: LegacyCashFlowSummaryPage },
	{ id: 'e1-earnings-impact', title: 'Earnings Impact', component: LegacyEarningsImpactPage },
	{
		id: 'e3-earnings-ledger-1',
		title: 'Annual Impact on Earnings — Option 1',
		component: LegacyEarningsLedgerOption1Page
	},
	{
		id: 'e3-earnings-ledger-2',
		title: 'Annual Impact on Earnings — Option 2',
		component: LegacyEarningsLedgerOption2Page
	},
	{
		id: 'e3-earnings-ledger-3',
		title: 'Annual Impact on Earnings — Option 3',
		component: LegacyEarningsLedgerOption3Page
	},
	{
		id: 'e3-earnings-ledger-4',
		title: 'Annual Impact on Earnings — Option 4',
		component: LegacyEarningsLedgerOption4Page
	},
	{ id: 'f1-serp-entries', title: 'SERP Accounting Entry Worksheet', component: LegacySerpEntriesPage },
	{ id: 'f1-serp-reconciliation', title: 'SERP Accounting — Reconciliation', component: LegacySerpReconciliationPage },
	{ id: 'f1-serp-notes', title: 'SERP Accounting — Notes', component: LegacySerpNotesPage },
	{ id: 'f2-coli-entries', title: 'COLI Accounting Entry Worksheet', component: LegacyColiEntriesPage },
	{ id: 'f3-audit-trail', title: 'FASB ASC 715-30 Audit Trail', component: LegacyAuditTrailPage },
	{ id: 'f4-cost-allocation', title: 'Pension Expense Allocation by Participant', component: LegacyCostAllocationPage },
	{ id: 'g1-benefit-statement', title: 'Summary of Benefits (Appendix A)', component: LegacyBenefitStatementPage },
	{ id: 'g2-face-survivor-1', title: 'COLI Face vs Survivor Liability — Option 1', component: LegacyFaceSurvivorOption1Page },
	{ id: 'g2-face-survivor-2', title: 'COLI Face vs Survivor Liability — Option 2', component: LegacyFaceSurvivorOption2Page },
	// Appendix C — one ledger per funding option, split across two sheets at the source's
	// pagination (plan years 1-21 and 22-45). One component serves all eight via registry props.
	...LEDGER_OPTIONS.flatMap((option, index) =>
		[
			{ part: 1, fromYear: 1, toYear: 21 },
			{ part: 2, fromYear: 22, toYear: 45 }
		].map((slice) => ({
			id: `g3-ledger-${option.id}-${slice.part}`,
			title: `Option Ledger — ${option.title} (${slice.part} of 2)`,
			component: LegacyOptionLedgerPage,
			// Ten currency columns do not fit a portrait sheet; the source is wide too.
			landscape: true,
			props: {
				pageNo: `Appendix C.${index * 2 + slice.part}`,
				strategyId: option.id,
				optionTitle: option.title,
				fromYear: slice.fromYear,
				toYear: slice.toYear,
				showTotals: slice.part === 1
			}
		}))
	),
	{ id: 'g5-accounting-desc', title: 'Accounting for SERP Programs (Appendix D)', component: LegacyAccountingDescPage },
	{ id: 'g6-serp-overview', title: 'Informational Overview — SERPs (Appendix E.1)', component: LegacySerpOverviewPage },
	{ id: 'g6-coli-overview', title: 'Informational Overview — COLI (Appendix E.2)', component: LegacyColiOverviewPage }
];
