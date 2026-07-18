<script lang="ts">
	/**
	 * 1.1 Executive summary — the dashboard: who is covered, what the promise costs after
	 * tax, and how the Cost-Recovery COLI is sized to recover that cost. Every figure comes
	 * from the computed Results snapshot via the report view model.
	 */
	import PageShell from './PageShell.svelte';
	import type { ReportModel } from '../report-data';

	let { report }: { report: ReportModel } = $props();
</script>

<PageShell
	{report}
	eyebrow="Part 1 · The recommendation"
	title="Executive summary"
	sub="A SERP for {report.numSerp} executive{report.numSerp === 1
		? ''
		: 's'}, financed so the company recovers its cost."
	pageNo="1.1"
>
	<div class="dash">
		<div class="card">
			<div class="head">Who is covered</div>
			<div class="body">
				<div class="kv">
					<span class="k">Executives in the plan</span><span class="v">{report.numSerp}</span>
				</div>
				<div class="kv">
					<span class="k">Insured under COLI</span><span class="v">{report.numColi}</span>
				</div>
				<div class="kv">
					<span class="k">Average age</span><span class="v">{report.averageAge ?? '—'}</span>
				</div>
				<div class="kv">
					<span class="k">Covered payroll</span><span class="v">{report.coveredPayroll}</span>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="head">What it will cost</div>
			<div class="body">
				<div class="kv">
					<span class="k">Projected benefits payable</span>
					<span class="v">{report.totalBenefitCost}</span>
				</div>
				<div class="kv">
					<span class="k">Tax deduction ({report.taxRateDisplay})</span>
					<span class="v pos">−{report.taxDeduction}</span>
				</div>
				<div class="kv sum">
					<span class="k">After-tax benefit cost</span>
					<span class="v">{report.afterTaxCost}</span>
				</div>
				<div class="kv">
					<span class="k">Present value ({report.npvDiscountDisplay} discount)</span>
					<span class="v">{report.netPresentValue}</span>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="head">How the COLI is sized</div>
			<div class="body">
				<div class="kv">
					<span class="k">After-tax benefit cost</span>
					<span class="v">{report.afterTaxCost}</span>
				</div>
				<div class="kv sum">
					<span class="k">Total COLI face amount</span>
					<span class="v pos">{report.totalDeathBenefit ?? '—'}</span>
				</div>
				<div class="subhead">The sizing rule</div>
				<p class="small" style="margin:0">
					Cost Recovery: total death benefit equals the after-tax cost of the promised benefits,
					allocated across the {report.numColi} insured executive{report.numColi === 1 ? '' : 's'}.
					Death proceeds are received income-tax-free and reimburse the company as mortality occurs.
				</p>
			</div>
		</div>

		<div class="card">
			<div class="head">What the insurance costs</div>
			<div class="body">
				<div class="kv">
					<span class="k">Annual COLI premium (year 1)</span>
					<span class="v">{report.totalFirstYearPremium ?? '—'}</span>
				</div>
				<div class="subhead">Premium design</div>
				<p class="small" style="margin:0">
					Each policy's level annual premium is solved so the policy stays in force for life — a net
					surrender value target of $1,000 at age 100 — rather than quoted off the shelf. Per-policy
					detail is on page 2.4.
				</p>
			</div>
		</div>
	</div>

	<div class="note-box">
		<div class="h">The one-sentence takeaway</div>
		The company promises a supplemental pension to its top executives, deducts the benefits when paid,
		and uses tax-free life-insurance proceeds — sized to the after-tax cost — to recover its outlay.
	</div>
</PageShell>
