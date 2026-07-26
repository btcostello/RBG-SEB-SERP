<script lang="ts">
	/**
	 * Legacy Report — I1 Glossary (Appendix H.1–H.5).
	 *
	 * One component serves all five sheets via registry props; content lives in `glossary-data.ts`.
	 * Definitions are static except the salary-increase rate in the first entry, which reads from
	 * the model — see that module's note.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';
	import { glossarySheets } from './glossary-data';

	/** `sheetIndex` comes from the registry; the default keeps this assignable to Component<{report}>. */
	let { report, sheetIndex = 0 }: { report: ReportModel; sheetIndex?: number } = $props();

	const sheet = $derived(glossarySheets(report)[sheetIndex]);
</script>

<LegacyPageShell {report} pageNo={sheet?.pageNo ?? ''} pageNoSide="right" numbered={false}>
	<div class="gl-head">
		<div class="company">{report.companyName}</div>
		<h1>{sheet?.title ?? 'Glossary'}</h1>
	</div>

	<dl class="glossary">
		{#each sheet?.entries ?? [] as entry (entry.term)}
			<dt>{entry.term}</dt>
			<dd>{entry.definition}</dd>
		{/each}
	</dl>
</LegacyPageShell>

<style>
	.gl-head {
		text-align: center;
		margin-bottom: 18px;
	}
	.gl-head .company {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 12pt;
		color: var(--ink-soft);
		margin-bottom: 4px;
	}
	.gl-head h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 14pt;
	}
	/* Two columns: term on the left, definition on the right, aligned per row. */
	.glossary {
		display: grid;
		grid-template-columns: 15.5em 1fr;
		gap: 10px 20px;
		margin: 0;
	}
	dt {
		font-family: var(--sans);
		font-weight: 600;
		font-size: 9pt;
		color: var(--ink);
		line-height: 1.4;
	}
	dd {
		margin: 0;
		font-family: var(--sans);
		font-size: 9pt;
		line-height: 1.45;
		color: var(--ink-soft);
	}
</style>
