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

export interface LegacyReportPage {
	/** Stable id (unique within the registry). */
	id: string;
	/** Human title (for nav / page labels). */
	title: string;
	/** The Svelte component that renders the page; receives the `ReportModel`. */
	component: Component<{ report: ReportModel }>;
}

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
	{ id: 'e1-earnings-impact', title: 'Earnings Impact', component: LegacyEarningsImpactPage }
];
