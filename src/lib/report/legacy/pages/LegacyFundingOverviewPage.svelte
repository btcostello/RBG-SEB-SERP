<script lang="ts">
	/**
	 * Legacy Report — D2 Overview: SERP Benefit Financing (source: "D2 Funding Options - 2.pdf"),
	 * section page 4.3.
	 *
	 * Financing summary. Data-driven from results: projected benefit payments (total SERP benefit),
	 * tax deduction savings, after-tax cost, and the premium + average face for each of the four
	 * funding options. The sample's buy-sell lines are intentionally excluded (per operator:
	 * sample error).
	 */
	import { REPORT_FUNDING_OPTIONS, type ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	let { report }: { report: ReportModel } = $props();
	const r = $derived(report);
	const dash = (v: string | null | undefined) => v ?? '—';
	/** Results-gated value: show it only once a run exists, else "—". */
	const ifRun = (v: string) => (r.hasResults ? v : '—');

	const OPTION_DESCRIPTIONS: Record<string, string> = {
		'cost-recovery': 'Option 1: Program Cost Recovery upon Mortality',
		'benefit-distribution': 'Option 2: Benefit Funding from COLI Values',
		'premium-deposit': 'Option 3: Benefit Funding Wherewithal Based on COLI Values',
		'premium-recovery': 'Option 4: Benefit Funding from COLI Values + Cost Recovery'
	};
	const optionRows = $derived(
		REPORT_FUNDING_OPTIONS.map((option) => ({
			id: option.id,
			number: option.number,
			description: OPTION_DESCRIPTIONS[option.id],
			summary: r.fundingOptions[option.id]
		}))
	);
	/**
	 * Options can cover different numbers of lives — a COLI-only participant carries no SERP
	 * benefit to distribute, so today only Option 1 designs one. Disclose it rather than let the
	 * comparison read as like-for-like. (See the mixed-membership backlog item in HANDOFF.md.)
	 */
	const lifeCounts = $derived(
		[...new Set(optionRows.filter((o) => o.summary).map((o) => o.summary!.policyCount))]
	);
	const coverageDiffers = $derived(lifeCounts.length > 1);
	/** Options whose totals include a solve that never reached its target — not reportable. */
	const unreliable = $derived(optionRows.filter((o) => (o.summary?.infeasibleCount ?? 0) > 0));
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
			{#each optionRows as option (option.id)}
				<div class="row">
					<span class="k">{option.description}</span>
					<span class="v" class:gap={!option.summary}>{dash(option.summary?.premium)}</span>
				</div>
			{/each}
		</div>

		<p class="fn">
			<sup>*</sup> Assumed premium payment period is ten years; out of pocket premiums assumed to stop
			after that point; actual premiums may be different if plan assumptions or actual policy
			performance vary.
		</p>

		<div class="section-label">Life Insurance Initial Average Face Amount per Insured Participant:</div>
		<div class="block indent">
			{#each optionRows as option (option.id)}
				<div class="row">
					<span class="k">Option {option.number}:</span>
					<span class="v" class:gap={!option.summary}>{dash(option.summary?.averageFace)}</span>
				</div>
			{/each}
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
			{#if coverageDiffers}
				<p class="fn">
					<sup>†</sup> Options cover different numbers of policies
					({optionRows
						.filter((o) => o.summary)
						.map((o) => `Option ${o.number}: ${o.summary?.policyCount}`)
						.join(', ')}); premiums and average face are not directly comparable across
					options.
				</p>
			{/if}
			{#if unreliable.length > 0}
				<p class="fn warn">
					<strong>Not shown:</strong>
					{unreliable.map((o) => `Option ${o.number}`).join(', ')} could not be solved for
					{unreliable.map((o) => o.summary?.infeasibleCount).join('/')} of
					{unreliable.map((o) => o.summary?.policyCount).join('/')} participants, so no figure
					is reported. Review the design assumptions for those participants.
				</p>
			{/if}
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
	.fn.warn {
		color: var(--ink);
	}
</style>
