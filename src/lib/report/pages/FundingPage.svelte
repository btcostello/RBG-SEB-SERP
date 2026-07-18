<script lang="ts">
	/**
	 * 1.4 How it is financed — the Cost-Recovery COLI strategy: the sizing rule, the premium
	 * solve, and the headline funding figures from the run.
	 */
	import PageShell from './PageShell.svelte';
	import type { ReportModel } from '../report-data';

	let { report }: { report: ReportModel } = $props();
</script>

<PageShell
	{report}
	eyebrow="Part 1 · The recommendation"
	title="How it is financed"
	sub="Cost Recovery: the plan is designed to pay for itself."
	pageNo="1.4"
>
	<p class="lead">
		The plan is a promise the company must eventually pay. To back that promise the company buys
		life insurance on the insured executives — it owns the policies, pays the premiums, and is the
		sole beneficiary. Benefits are paid from company cash flow; the insurance is sized so that, as
		mortality occurs, tax-free death proceeds reimburse the company for its after-tax outlay.
	</p>

	<div class="callout">
		<div class="big">
			Total COLI face = projected benefits × (1 − {report.taxRateDisplay} tax rate)
		</div>
		<p style="margin:6px 0 0;font-size:9.5pt;color:var(--ink-soft)">
			Because benefit payments are deductible when paid, the company's true cost is the after-tax
			amount — so that is what the insurance is sized to recover.
		</p>
	</div>

	<div class="spec-grid">
		<div class="spec">
			<span class="k">Projected benefits payable</span>
			<span class="v">{report.totalBenefitCost}</span>
		</div>
		<div class="spec">
			<span class="k">Tax deduction ({report.taxRateDisplay})</span>
			<span class="v">−{report.taxDeduction}</span>
		</div>
		<div class="spec">
			<span class="k">After-tax benefit cost</span>
			<span class="v">{report.afterTaxCost}</span>
		</div>
		<div class="spec">
			<span class="k">Total COLI face amount</span>
			<span class="v">{report.totalDeathBenefit ?? '—'}</span>
		</div>
		<div class="spec">
			<span class="k">Policies (insured executives)</span>
			<span class="v">{report.numColi}</span>
		</div>
		<div class="spec">
			<span class="k">Annual premium (year 1)</span>
			<span class="v">{report.totalFirstYearPremium ?? '—'}</span>
		</div>
	</div>

	<h3 class="section-h">How each policy is designed</h3>
	<ul class="clean">
		<li>
			<strong>Face allocation</strong> — the total face amount is split equally across the
			{report.numColi} insured executive{report.numColi === 1 ? '' : 's'}.
		</li>
		<li>
			<strong>Premium solve</strong> — each policy's level annual premium is solved so the policy endows
			for life: a net surrender value of $1,000 at age 100. The policy is intended to be held until death,
			not surrendered.
		</li>
		<li>
			<strong>Compliance tested</strong> — each design is checked against the Guideline Premium Test and
			MEC limits; where a design would cross a limit, it is adjusted and flagged on the policy schedule
			(page 2.4).
		</li>
	</ul>

	<div class="note-box">
		<div class="h">Why insurance, and not a side fund</div>
		Premiums are not deductible, but the policy's cash value grows tax-deferred, is carried as a balance-sheet
		asset, and the death proceeds arrive income-tax-free — which is what makes full recovery of the after-tax
		cost possible with dollars that would otherwise be taxed twice.
	</div>
</PageShell>
