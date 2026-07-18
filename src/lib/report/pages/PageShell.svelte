<script lang="ts">
	/**
	 * PageShell — shared chrome for an interior report page: copper-ticked eyebrow, serif
	 * title and subtitle on the left, an oversized serif page number on the right, a heavy
	 * ink keyline with a copper segment under the header, and the running footer.
	 * Pages render their content into the default snippet; classes come from report.css.
	 */
	import type { Snippet } from 'svelte';
	import type { ReportModel } from '../report-data';

	let {
		report,
		eyebrow,
		title,
		sub,
		pageNo,
		children
	}: {
		report: ReportModel;
		eyebrow: string;
		title: string;
		sub?: string;
		/** e.g. "1.1" — shown large in the header and in the footer. */
		pageNo: string;
		children: Snippet;
	} = $props();
</script>

<header class="page-head">
	<div>
		<p class="eyebrow">{eyebrow}</p>
		<h1 class="page-title">{title}</h1>
		{#if sub}
			<p class="page-sub">{sub}</p>
		{/if}
	</div>
	<div class="ph-no">
		<span class="lbl">Page</span>
		<span class="num">{pageNo}</span>
	</div>
</header>

<div class="page-body">
	{@render children()}
</div>

<div class="foot">
	<span class="brand">{report.companyName} · SERP financed with COLI</span>
	<span>Page {pageNo} · {report.runDate}</span>
</div>
