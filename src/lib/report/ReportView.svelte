<script lang="ts">
	/**
	 * ReportView — renders the registered report pages in order (FR31, AR13).
	 * Derives the ReportModel once from the active quote and passes it to every page, so the
	 * registry stays purely data-driven and pages never re-derive business numbers.
	 * Imports the report design system and the dedicated print stylesheet so window.print()
	 * is page-accurate (FR32).
	 */
	import './report.css';
	import './print.css';
	import { reportPages } from './registry';
	import { deriveReport } from './report-data';
	import { quoteStore } from '$lib/stores/quote.svelte';

	function todayIso(): string {
		const now = new Date();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		return `${now.getFullYear()}-${month}-${day}`;
	}

	const report = $derived(quoteStore.current ? deriveReport(quoteStore.current, todayIso()) : null);

	// Pages the operator has turned off for this quote are dropped before render, so both the
	// on-screen proposal and the printed PDF contain only the enabled pages (the hidden set lives on
	// the quote; absent ⇒ every page shown).
	const hidden = $derived(new Set(quoteStore.current?.reportSettings?.hiddenPages ?? []));
	const visiblePages = $derived(reportPages.filter((page) => !hidden.has(page.id)));
</script>

{#if report}
	<div class="report">
		{#each visiblePages as page (page.id)}
			{@const PageComponent = page.component}
			<article class="report-page" aria-label={page.title}>
				<PageComponent {report} />
			</article>
		{/each}
	</div>
{/if}

<style>
	.report {
		display: grid;
		gap: 0.35in;
	}
</style>
