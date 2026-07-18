/**
 * Data-driven report page registry (FR31, AR13, NFR14).
 *
 * The report is rendered from this ordered list of `{ id, title, component }` entries.
 * Adding a future page (toward the full ~52-page report) is purely additive — append an
 * entry here and it appears in the report with no change to existing pages or to `ReportView`.
 *
 * Every page component receives the derived `ReportModel` as its `report` prop.
 */
import type { Component } from 'svelte';
import type { ReportModel } from './report-data';
import CoverPage from './pages/CoverPage.svelte';
import ContentsPage from './pages/ContentsPage.svelte';
import ExecutiveSummaryPage from './pages/ExecutiveSummaryPage.svelte';
import ObjectivePage from './pages/ObjectivePage.svelte';
import PlanPage from './pages/PlanPage.svelte';
import FundingPage from './pages/FundingPage.svelte';
import AssumptionsPage from './pages/AssumptionsPage.svelte';
import CensusPage from './pages/CensusPage.svelte';
import ProjectionsPage from './pages/ProjectionsPage.svelte';
import ColiDesignPage from './pages/ColiDesignPage.svelte';
import HowSerpsWorkPage from './pages/HowSerpsWorkPage.svelte';
import HowColiWorksPage from './pages/HowColiWorksPage.svelte';
import AccountingPage from './pages/AccountingPage.svelte';
import GlossaryPage from './pages/GlossaryPage.svelte';

export interface ReportPage {
	/** Stable id (unique within the registry). */
	id: string;
	/** Human title (for nav / page labels). */
	title: string;
	/** The Svelte component that renders the page; receives the `ReportModel`. */
	component: Component<{ report: ReportModel }>;
}

/** The registered report pages, rendered in this order. */
export const reportPages: ReportPage[] = [
	{ id: 'cover', title: 'Cover', component: CoverPage },
	{ id: 'contents', title: 'Contents', component: ContentsPage },
	{ id: 'exec-summary', title: 'Executive Summary', component: ExecutiveSummaryPage },
	{ id: 'objective', title: 'The Objective', component: ObjectivePage },
	{ id: 'plan', title: 'The Plan We Designed', component: PlanPage },
	{ id: 'funding', title: 'How It Is Financed', component: FundingPage },
	{ id: 'assumptions', title: 'Specifications & Assumptions', component: AssumptionsPage },
	{ id: 'census', title: 'Plan Census', component: CensusPage },
	{ id: 'projections', title: 'Projection of Participant Benefits', component: ProjectionsPage },
	{ id: 'coli-design', title: 'COLI Policy Design', component: ColiDesignPage },
	{ id: 'ref-serp', title: 'How SERPs Work', component: HowSerpsWorkPage },
	{ id: 'ref-coli', title: 'How COLI Works', component: HowColiWorksPage },
	{ id: 'ref-accounting', title: 'Accounting Treatment', component: AccountingPage },
	{ id: 'glossary', title: 'Glossary', component: GlossaryPage }
];
