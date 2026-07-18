<script lang="ts">
	/**
	 * Legacy Report — D2 Overview: SERP Benefit Financing (source: "D2 Funding Options - 2.pdf"),
	 * section page 4.3.
	 *
	 * Financing summary. Data-driven from results: projected benefit payments (total SERP benefit),
	 * tax deduction savings, after-tax cost, Option 1 premium (total first-year premium) and Option
	 * 1 average face. Options 2–4 require additional illustrations (gaps → "—"). The sample's
	 * buy-sell lines are intentionally excluded (per operator: sample error).
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	let { report }: { report: ReportModel } = $props();
	const r = $derived(report);
	const dash = (v: string | null) => v ?? '—';
	/** Results-gated value: show it only once a run exists, else "—". */
	const ifRun = (v: string) => (r.hasResults ? v : '—');
</script>

<LegacyPageShell {report} pageNo="4.3" pageNoSide="right">
	<div class="fund">
		<div class="f-head">
			<div class="company">{report.companyName}</div>
			<h1>Overview — SERP Benefit Financing</h1>
		</div>

		<div class="block">
			<div class="row">
				<span class="k">Projected SERP Benefit Payments</span>
				<span class="v">{ifRun(r.totalBenefitCost)}</span>
			</div>
			<div class="row">
				<span class="k">Less Anticipated Tax Deduction Savings (at {r.taxRateDisplay})</span>
				<span class="v">{ifRun(r.taxDeduction)}</span>
			</div>
			<div class="row total">
				<span class="k">Projected After-Tax SERP Benefit Costs</span>
				<span class="v">{ifRun(r.afterTaxCost)}</span>
			</div>
		</div>

		<div class="section-label">Projected Annual COLI Premium: <sup>*</sup></div>
		<div class="block indent">
			<div class="row">
				<span class="k">Option 1: Program Cost Recovery upon Mortality</span>
				<span class="v">{dash(r.totalFirstYearPremium)}</span>
			</div>
			<div class="row">
				<span class="k">Option 2: Benefit Funding from COLI Values</span>
				<span class="v gap">—</span>
			</div>
			<div class="row">
				<span class="k">Option 3: Benefit Funding Wherewithal Based on COLI Values</span>
				<span class="v gap">—</span>
			</div>
			<div class="row">
				<span class="k">Option 4: Benefit Funding from COLI Values + Cost Recovery</span>
				<span class="v gap">—</span>
			</div>
		</div>

		<p class="fn">
			<sup>*</sup> Assumed premium payment period is ten years; out of pocket premiums assumed to stop
			after that point; actual premiums may be different if plan assumptions or actual policy
			performance vary.
		</p>

		<div class="section-label">Life Insurance Initial Average Face Amount per Insured Participant:</div>
		<div class="block indent">
			<div class="row">
				<span class="k">Option 1:</span>
				<span class="v">{dash(r.option1AvgFace)}</span>
			</div>
			<div class="row">
				<span class="k">Options 2 &amp; 3:</span>
				<span class="v gap">—</span>
			</div>
			<div class="row">
				<span class="k">Option 4:</span>
				<span class="v gap">—</span>
			</div>
		</div>

		<div class="block counts">
			<div class="row">
				<span class="k">Number of SERP Participants:</span>
				<span class="v">{r.numSerp}</span>
			</div>
			<div class="row">
				<span class="k">Number of COLI Participants:</span>
				<span class="v">{r.numColi}</span>
			</div>
		</div>
	</div>
</LegacyPageShell>

<style>
	.f-head {
		text-align: center;
		margin-bottom: 16px;
	}
	.f-head .company {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 12pt;
		color: var(--ink-soft);
		margin-bottom: 5px;
	}
	.f-head h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 16pt;
	}
	.block {
		margin-bottom: 12px;
	}
	.block.indent {
		padding-left: 18px;
	}
	.row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 16px;
		padding: 3px 0;
		font-family: var(--sans);
		font-size: 10pt;
		color: var(--ink-soft);
	}
	.row .v {
		font-family: var(--serif);
		font-weight: 600;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.row .v.gap {
		color: var(--line);
	}
	.row.total {
		border-top: 1.5px solid var(--ink);
		margin-top: 3px;
		padding-top: 6px;
	}
	.section-label {
		font-family: var(--sans);
		font-weight: 600;
		font-size: 10pt;
		color: var(--ink);
		margin: 14px 0 6px;
	}
	.fn {
		font-family: var(--sans);
		font-size: 8pt;
		color: var(--muted);
		line-height: 1.45;
		margin: 6px 0 4px;
	}
	.counts {
		margin-top: 16px;
	}
</style>
