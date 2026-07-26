<script lang="ts">
	/**
	 * LegacyBulletPage — centered title over a bulleted list, for the static overview pages whose
	 * body is bullets rather than paragraphs (Appendix E). Items may carry a nested sub-list,
	 * which the source uses for the COLI objectives.
	 *
	 * Marker style matches `LegacyAmsPage`'s hollow bronze square so the report reads as one
	 * document.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	export type BulletItem = { text: string; children?: string[] };

	let {
		report,
		title,
		items,
		pageNo,
		pageNoSide = 'right',
		numbered = true
	}: {
		report: ReportModel;
		title: string;
		items: BulletItem[];
		pageNo: string;
		pageNoSide?: 'left' | 'right';
		/** False for named sheets like "Appendix E.1", which print without a "Page" prefix. */
		numbered?: boolean;
	} = $props();
</script>

<LegacyPageShell {report} {pageNo} {pageNoSide} {numbered}>
	<div class="bullets">
		<div class="company">{report.companyName}</div>
		<h1 class="bullet-title">{title}</h1>
		<ul class="bullet-list">
			{#each items as item, i (i)}
				<li>
					{item.text}
					{#if item.children}
						<ul class="bullet-sub">
							{#each item.children as child, c (c)}<li>{child}</li>{/each}
						</ul>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
</LegacyPageShell>

<style>
	.company {
		text-align: center;
		font-family: var(--serif);
		font-weight: 600;
		font-size: 12pt;
		color: var(--ink-soft);
		margin-bottom: 5px;
	}
	.bullet-title {
		text-align: center;
		font-family: var(--serif);
		font-weight: 600;
		font-size: 14pt;
		margin-bottom: 16px;
	}
	.bullet-list {
		list-style: none;
		margin: 0;
		padding: 0 0 0 16px;
	}
	.bullet-list > li {
		font-family: var(--sans);
		font-size: 9pt;
		line-height: 1.45;
		color: var(--ink-soft);
		padding: 3px 0;
		text-indent: -17px;
		padding-left: 17px;
	}
	.bullet-list > li::before {
		content: '';
		display: inline-block;
		width: 6px;
		height: 6px;
		border: 1.2px solid var(--bronze);
		margin-right: 11px;
		vertical-align: 0.09em;
	}
	.bullet-sub {
		list-style: none;
		margin: 3px 0 0;
		padding: 0 0 0 22px;
		text-indent: 0;
	}
	.bullet-sub li {
		font-size: 8.6pt;
		line-height: 1.4;
		padding: 2px 0;
		text-indent: -15px;
		padding-left: 15px;
	}
	.bullet-sub li::before {
		content: '';
		display: inline-block;
		width: 4px;
		height: 4px;
		border: 1.1px solid var(--bronze);
		margin-right: 10px;
		vertical-align: 0.12em;
	}
</style>
