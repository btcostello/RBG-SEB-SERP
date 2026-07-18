<script lang="ts">
	/**
	 * 2.1 Plan specifications & assumptions — the model settings and company inputs behind
	 * every number in Part 1 (FR2, FR3).
	 */
	import PageShell from './PageShell.svelte';
	import type { ReportModel } from '../report-data';
	import { longDate } from '../report-data';

	let { report }: { report: ReportModel } = $props();

	const s = $derived(report.settings);
</script>

<PageShell
	{report}
	eyebrow="Part 2 · Supporting detail"
	title="Plan specifications &amp; assumptions"
	sub="The inputs behind every number in Part 1."
	pageNo="2.1"
>
	<div class="spec-grid">
		<div class="spec">
			<span class="k">Valuation date</span><span class="v">{longDate(report.asOf)}</span>
		</div>
		<div class="spec">
			<span class="k">Corporate tax rate</span><span class="v">{report.taxRateDisplay}</span>
		</div>
		<div class="spec">
			<span class="k">Normal retirement age</span><span class="v">{s.retirementAge}</span>
		</div>
		<div class="spec">
			<span class="k">Assumed benefit age (final payment)</span><span class="v"
				>{s.assumedDeathBenefitAge}</span
			>
		</div>
		<div class="spec">
			<span class="k">Benefit waiting period</span>
			<span class="v">{s.benefitWaitingPeriod} year{s.benefitWaitingPeriod === 1 ? '' : 's'}</span>
		</div>
		<div class="spec">
			<span class="k">Retirement benefit</span>
			<span class="v">{report.benefitPercentDisplay} of FAS</span>
		</div>
		<div class="spec">
			<span class="k">Final average salary (FAS)</span>
			<span class="v">Final {s.fasAveragingPeriod} year{s.fasAveragingPeriod === 1 ? '' : 's'}</span
			>
		</div>
		<div class="spec">
			<span class="k">Salary scale</span><span class="v">{report.salaryGrowthDisplay} per year</span
			>
		</div>
		<div class="spec">
			<span class="k">NPV discount rate</span><span class="v">{report.npvDiscountDisplay}</span>
		</div>
		<div class="spec">
			<span class="k">Age convention</span><span class="v">Age nearest birthday</span>
		</div>
		<div class="spec">
			<span class="k">COLI funding strategy</span><span class="v">Cost Recovery</span>
		</div>
		<div class="spec">
			<span class="k">Premium solve target</span><span class="v">$1,000 NSV at age 100</span>
		</div>
	</div>

	<p class="small">
		Benefit projections assume level annual payments from the first payment age through the assumed
		benefit age, salaries growing at the salary scale until retirement, and each executive remaining
		in service to normal retirement age. Participation is limited to a top-hat group as defined by
		ERISA. Assumptions should be reviewed annually; any change is a data change to this quote and
		does not affect other proposals.
	</p>
</PageShell>
