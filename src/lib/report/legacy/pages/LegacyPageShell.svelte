<script lang="ts">
	/**
	 * LegacyPageShell — shared chrome for Legacy Report interior (content) pages: a body region
	 * that fills the sheet and a running footer with the section page number (e.g. "1.1") on the
	 * left and the valuation date on the right, matching the source's "Page X.Y  m/d/yyyy" footer.
	 * Front-matter pages (cover, title, disclosure, ToC) do not use this shell.
	 */
	import type { Snippet } from 'svelte';
	import { shortDate, type ReportModel } from '../../report-data';

	let {
		report,
		pageNo,
		pageNoSide = 'left',
		numbered = true,
		children
	}: {
		report: ReportModel;
		pageNo: string;
		/** Which side the page number sits on; the date takes the other (source mirrors by page). */
		pageNoSide?: 'left' | 'right';
		/** False for named sheets like "Appendix A", which the source prints without "Page". */
		numbered?: boolean;
		children: Snippet;
	} = $props();

	const label = $derived(numbered ? `Page ${pageNo}` : pageNo);
</script>

<div class="legacy-page">
	<div class="lp-body">{@render children()}</div>
	<footer class="lp-foot">
		{#if pageNoSide === 'left'}
			<span>{label}</span>
			<span>{shortDate(report.asOf)}</span>
		{:else}
			<span>{shortDate(report.asOf)}</span>
			<span>{label}</span>
		{/if}
	</footer>
</div>

<style>
	.legacy-page {
		flex: 1;
		display: flex;
		flex-direction: column;
		color: var(--ink);
	}
	.lp-body {
		flex: 1;
	}
	.lp-foot {
		margin-top: auto;
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		border-top: 1px solid var(--line);
		padding-top: 8px;
		font-family: var(--sans);
		font-size: 8pt;
		color: var(--muted);
	}
</style>
