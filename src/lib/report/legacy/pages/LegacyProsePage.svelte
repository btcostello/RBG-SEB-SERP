<script lang="ts">
	/**
	 * LegacyProsePage — reusable layout for the Legacy Report's static text pages: a centered
	 * serif title over justified body paragraphs, on the interior page shell (footer page-no +
	 * date). Thin per-page wrappers supply the title, paragraphs, and page number.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	let {
		report,
		title,
		paragraphs,
		pageNo,
		pageNoSide = 'left'
	}: {
		report: ReportModel;
		title: string;
		paragraphs: string[];
		pageNo: string;
		pageNoSide?: 'left' | 'right';
	} = $props();
</script>

<LegacyPageShell {report} {pageNo} {pageNoSide}>
	<div class="prose">
		<h1 class="prose-title">{title}</h1>
		{#each paragraphs as para, i (i)}
			<p>{para}</p>
		{/each}
	</div>
</LegacyPageShell>

<style>
	.prose-title {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 17pt;
		text-align: center;
		margin-bottom: 20px;
	}
	.prose p {
		font-family: var(--sans);
		font-size: 10pt;
		line-height: 1.55;
		color: var(--ink-soft);
		text-align: justify;
		margin: 0 0 12px;
	}
</style>
