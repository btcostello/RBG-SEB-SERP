<script lang="ts">
	/**
	 * LegacyReportView — renders the registered Legacy Report pages in order.
	 * Mirrors ReportView: derives the ReportModel once from the active quote and passes it to
	 * every page, reusing the shared report design system and print stylesheet so the output
	 * matches the house format. Pages are added to the registry one section at a time.
	 */
	import '../report.css';
	import '../print.css';
	import { legacyReportPages } from './legacy-registry';
	import { deriveReport } from '../report-data';
	import { quoteStore } from '$lib/stores/quote.svelte';

	function todayIso(): string {
		const now = new Date();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		return `${now.getFullYear()}-${month}-${day}`;
	}

	const report = $derived(quoteStore.current ? deriveReport(quoteStore.current, todayIso()) : null);
</script>

{#if report}
	<div class="report">
		{#if legacyReportPages.length === 0}
			<article class="report-page" aria-label="Legacy Report — empty">
				<p class="eyebrow">Legacy Report</p>
				<p class="small">
					No pages yet. Sections are added one at a time from the supplied source pages.
				</p>
			</article>
		{:else}
			{#each legacyReportPages as page (page.id)}
				{@const PageComponent = page.component}
				<article class="report-page" class:landscape={page.landscape} aria-label={page.title}>
					<PageComponent {report} {...(page.props ?? {})} />
				</article>
			{/each}
		{/if}
	</div>
{/if}

<style>
	.report {
		display: grid;
		gap: 0.35in;
	}
</style>
