<script lang="ts">
	/**
	 * ReportView — renders the registered report pages in order (FR31, AR13).
	 * Purely data-driven: it iterates `reportPages`, so new pages are additive.
	 */
	import { reportPages } from './registry';
</script>

<div class="report">
	{#each reportPages as page (page.id)}
		{@const PageComponent = page.component}
		<article class="report-page" aria-label={page.title}>
			<PageComponent />
		</article>
	{/each}
</div>

<style>
	.report {
		display: grid;
		gap: 2rem;
	}
	.report-page {
		background: #fff;
	}
</style>
