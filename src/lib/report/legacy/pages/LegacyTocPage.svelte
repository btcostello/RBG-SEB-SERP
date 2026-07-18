<script lang="ts">
	/**
	 * Legacy Report — A5 Table of Contents (source: "A5 ToC.pdf").
	 *
	 * The contents structure is taken as fixed (per operator: take the structure as fact, no
	 * add/remove). It is a static two-level outline with a right-hand "Section" column of tab
	 * ids (1–6, A–H). Company name and the footer date are data-driven; everything else is fixed.
	 */
	import { shortDate, type ReportModel } from '../../report-data';

	let { report }: { report: ReportModel } = $props();

	type TocRow = { level: 0 | 1; label: string; sec?: string };

	// Reproduced verbatim from source (level 0 = category header, level 1 = indented entry).
	// "Comparison" corrected from the source's "Comparision".
	const TOC: TocRow[] = [
		{ level: 0, label: 'Design Considerations; Modeling System Overview' },
		{ level: 0, label: 'Benefits / Actuarial Assumptions', sec: '1' },
		{ level: 1, label: 'Benefit Formula', sec: '2' },
		{ level: 1, label: 'Plan Specifications and Actuarial Assumptions' },
		{ level: 0, label: 'Participants / Projected Benefits', sec: '3' },
		{ level: 1, label: 'Plan SERP Census' },
		{ level: 1, label: 'Projection of Participant Benefits', sec: '4' },
		{ level: 0, label: 'Financial Overview / Financing' },
		{ level: 1, label: 'Financial Overview - SERP Benefits Financing', sec: '5' },
		{ level: 0, label: 'Earnings Impact' },
		{ level: 1, label: 'Impact on Earnings Summary', sec: '6' },
		{ level: 0, label: 'Accounting Entries' },
		{ level: 1, label: 'SERP & COLI Accounting Entry Worksheets', sec: 'A' },
		{ level: 1, label: 'Consolidated FASB ASC 715-30 Audit Trails', sec: 'B' },
		{ level: 1, label: 'First Plan Year Entries - Allocation by Participant', sec: 'C' },
		{ level: 0, label: 'Appendix', sec: 'D' },
		{ level: 1, label: 'Participant Summary of Benefits', sec: 'E' },
		{ level: 1, label: 'Indemnification of Survivor Benefit Plan (where applicable)', sec: 'F' },
		{ level: 1, label: 'Summary Analysis of Cash Flows (4 Options)', sec: 'G' },
		{ level: 1, label: 'Accounting for SERP Programs', sec: 'H' },
		{ level: 1, label: 'SERP & COLI Informational Overviews' },
		{ level: 1, label: 'Hypothetical Value of COLI' },
		{ level: 1, label: 'Comparison of Impact of Mortality Assumptions' },
		{ level: 1, label: 'Glossary' }
	];
</script>

<div class="legacy-toc">
	<div class="toc-head">
		<div class="company">{report.companyName}</div>
		<h1>Table of Contents</h1>
	</div>

	<div class="toc-colhead"><span>Section</span></div>
	<div class="toc-list">
		{#each TOC as row, i (i)}
			<div class="toc-line" class:part={row.level === 0} class:sub={row.level === 1}>
				<span class="lbl">{row.label}</span>
				<span class="sec">{row.sec ?? ''}</span>
			</div>
		{/each}
	</div>

	<div class="toc-foot">
		<p class="note">
			This actuarial model contains proprietary and confidential information of Schiff Executive
			Benefits. You are asked to treat the information contained herein in a confidential manner and
			not share it with any other person or entity, except for your legal, tax, and accounting
			advisors, without prior written approval of Schiff Executive Benefits.
		</p>
		<div class="date">{shortDate(report.asOf)}</div>
	</div>
</div>

<style>
	.legacy-toc {
		flex: 1;
		display: flex;
		flex-direction: column;
		color: var(--ink);
	}
	.toc-head {
		text-align: center;
		margin-bottom: 8px;
	}
	.toc-head .company {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 13pt;
		color: var(--ink-soft);
		margin-bottom: 6px;
	}
	.toc-head h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 18pt;
	}
	.toc-colhead {
		display: flex;
		justify-content: flex-end;
		border-bottom: 1.5px solid var(--ink);
		padding-bottom: 4px;
	}
	.toc-colhead span {
		font-family: var(--sans);
		font-size: 7.5pt;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}
	.toc-list {
		margin-top: 2px;
	}
	.toc-line {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		padding: 2.3px 0;
	}
	.toc-line .lbl {
		font-family: var(--sans);
	}
	.toc-line.part {
		border-top: 1px solid var(--line-soft);
		margin-top: 2px;
		padding-top: 4px;
	}
	.toc-line.part .lbl {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 11pt;
	}
	.toc-line.sub .lbl {
		padding-left: 22px;
		font-size: 10pt;
		color: var(--ink-soft);
	}
	.toc-line .sec {
		font-family: var(--serif);
		font-weight: 600;
		color: var(--bronze-deep);
		font-variant-numeric: tabular-nums;
		min-width: 1.2em;
		text-align: right;
	}
	.toc-foot {
		margin-top: auto;
		padding-top: 10px;
	}
	.toc-foot .note {
		font-family: var(--sans);
		font-size: 8pt;
		line-height: 1.5;
		color: var(--muted);
		margin: 0 0 10px;
	}
	.toc-foot .date {
		font-family: var(--sans);
		font-size: 8.5pt;
		color: var(--muted);
	}
</style>
