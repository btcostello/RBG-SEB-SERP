<script lang="ts">
	/**
	 * LegacyRichProsePage — like LegacyProsePage but the body is a sequence of blocks (paragraphs
	 * and sub-headings), for static text pages that have interior headings (e.g. "Option 1"…).
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	export type ProseBlock = { h: string } | { p: string };

	let {
		report,
		title,
		blocks,
		pageNo,
		pageNoSide = 'left'
	}: {
		report: ReportModel;
		title: string;
		blocks: ProseBlock[];
		pageNo: string;
		pageNoSide?: 'left' | 'right';
	} = $props();
</script>

<LegacyPageShell {report} {pageNo} {pageNoSide}>
	<div class="prose">
		<h1 class="prose-title">{title}</h1>
		{#each blocks as block, i (i)}
			{#if 'h' in block}
				<h2 class="prose-h">{block.h}</h2>
			{:else}
				<p>{block.p}</p>
			{/if}
		{/each}
	</div>
</LegacyPageShell>

<style>
	.prose-title {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 17pt;
		text-align: center;
		margin-bottom: 18px;
	}
	.prose-h {
		font-family: var(--sans);
		font-weight: 600;
		font-size: 10.5pt;
		color: var(--bronze-deep);
		margin: 12px 0 4px;
	}
	.prose p {
		font-family: var(--sans);
		font-size: 10pt;
		line-height: 1.55;
		color: var(--ink-soft);
		text-align: justify;
		margin: 0 0 11px;
	}
</style>
