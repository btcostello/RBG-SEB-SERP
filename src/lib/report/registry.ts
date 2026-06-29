/**
 * Data-driven report page registry (FR31, AR13, NFR14).
 *
 * The report is rendered from this ordered list of `{ id, title, component }` entries.
 * Adding a future page (toward the full ~52-page report) is purely additive — append an
 * entry here and it appears in the report with no change to existing pages or to `ReportView`.
 */
import type { Component } from 'svelte';
import CoverPage from './pages/CoverPage.svelte';
import CensusSummaryPage from './pages/CensusSummaryPage.svelte';
import ColiSummaryPage from './pages/ColiSummaryPage.svelte';

export interface ReportPage {
	/** Stable id (unique within the registry). */
	id: string;
	/** Human title (for nav / page labels). */
	title: string;
	/** The Svelte component that renders the page. */
	component: Component;
}

/** The registered report pages, rendered in this order. */
export const reportPages: ReportPage[] = [
	{ id: 'cover', title: 'Cover', component: CoverPage },
	{ id: 'census-summary', title: 'Census Summary', component: CensusSummaryPage },
	{ id: 'coli-summary', title: 'COLI Summary', component: ColiSummaryPage }
];
