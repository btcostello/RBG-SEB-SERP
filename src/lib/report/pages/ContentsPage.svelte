<script lang="ts">
	/**
	 * Contents page — how to read the proposal. The story (Part 1) comes first; the
	 * supporting schedules (Part 2) and reference material (Part 3) follow.
	 */
	import type { ReportModel } from '../report-data';

	let { report }: { report: ReportModel } = $props();

	const parts: { num: string; label: string; rows: { n: string; t: string; lbl?: string }[] }[] = [
		{
			num: '01',
			label: 'The recommendation',
			rows: [
				{ n: '1.1', t: 'Executive summary', lbl: 'start here' },
				{ n: '1.2', t: 'The objective — why this plan' },
				{ n: '1.3', t: 'The plan we designed' },
				{ n: '1.4', t: 'How it is financed — cost recovery' }
			]
		},
		{
			num: '02',
			label: 'Supporting detail',
			rows: [
				{ n: '2.1', t: 'Plan specifications & assumptions' },
				{ n: '2.2', t: 'Plan census' },
				{ n: '2.3', t: 'Projection of participant benefits' },
				{ n: '2.4', t: 'COLI policy design' }
			]
		},
		{
			num: '03',
			label: 'Reference',
			rows: [
				{ n: '3.1', t: 'How SERPs work' },
				{ n: '3.2', t: 'How COLI works' },
				{ n: '3.3', t: 'Accounting treatment' },
				{ n: '3.4', t: 'Glossary' }
			]
		}
	];
</script>

<p class="eyebrow">Contents</p>
<h1 class="page-title">How to read this proposal</h1>
<p class="page-sub">The story comes first. Everything that supports it follows.</p>

<div class="page-body">
	{#each parts as part (part.label)}
		<div class="toc-part">
			<span class="pn">{part.num}</span><span class="pt">{part.label}</span>
		</div>
		{#each part.rows as row (row.n)}
			<div class="toc-row">
				<span class="n">{row.n}</span>
				<span class="t">{row.t}</span>
				<span class="d"></span>
				<span class="lbl">{row.lbl ?? ''}</span>
			</div>
		{/each}
	{/each}
</div>

<div class="foot">
	<span class="brand">{report.companyName} · SERP financed with COLI</span>
	<span>{report.runDate}</span>
</div>
