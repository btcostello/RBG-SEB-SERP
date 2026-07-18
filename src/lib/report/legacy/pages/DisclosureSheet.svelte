<script lang="ts">
	/**
	 * Reusable disclosure sheet for the Legacy Report A4 pages: a centered "Disclosure" title,
	 * the supplied paragraph slice as justified fine print, and the valuation date bottom-right.
	 * Not a registry page itself — LegacyDisclosurePageA/B render their slice through it.
	 */
	import { shortDate, type ReportModel } from '../../report-data';

	let {
		report,
		heading,
		paragraphs
	}: { report: ReportModel; heading: string; paragraphs: string[] } = $props();
</script>

<div class="legacy-disclosure">
	<h1 class="disc-title">{heading}</h1>
	<div class="disc-body">
		{#each paragraphs as para, i (i)}
			<p>{para}</p>
		{/each}
	</div>
	<div class="disc-date">{shortDate(report.asOf)}</div>
</div>

<style>
	.legacy-disclosure {
		flex: 1;
		display: flex;
		flex-direction: column;
		color: var(--ink);
	}
	.disc-title {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 16pt;
		text-align: center;
		margin: 0 0 18px;
	}
	.disc-body {
		flex: 1;
	}
	.disc-body p {
		font-family: var(--sans);
		font-size: 8.7pt;
		line-height: 1.5;
		color: var(--ink-soft);
		text-align: justify;
		margin: 0 0 10px;
	}
	.disc-date {
		margin-top: 14px;
		text-align: right;
		font-family: var(--sans);
		font-size: 8.5pt;
		color: var(--muted);
	}
</style>
