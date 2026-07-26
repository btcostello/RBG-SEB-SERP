<script lang="ts">
	/**
	 * 1.3 The plan we designed — the benefit formula in plain terms: formula callout, design
	 * specs from the model settings, and up to three illustrative participants.
	 */
	import PageShell from './PageShell.svelte';
	import type { ReportModel } from '../report-data';

	let { report }: { report: ReportModel } = $props();

	const s = $derived(report.settings);
	const waitText = $derived(
		s.benefitWaitingPeriod === 0
			? 'At retirement'
			: `${s.benefitWaitingPeriod} year${s.benefitWaitingPeriod === 1 ? '' : 's'} after retirement`
	);
</script>

<PageShell
	{report}
	eyebrow="Part 1 · The recommendation"
	title="The plan we designed"
	sub="What each executive is promised, in plain terms."
	pageNo="1.3"
>
	<div class="callout">
		<div class="big">
			Retirement benefit = {report.benefitPercentDisplay} × final {s.fasAveragingPeriod}-year
			average salary
		</div>
		<p style="margin:6px 0 0;font-size:9.5pt;color:var(--ink-soft)">
			Paid annually for {report.payoutYears} years — from age {report.firstPaymentAge} through the assumed
			benefit age of {s.assumedDeathBenefitAge}.
		</p>
	</div>

	<div class="spec-grid">
		<div class="spec">
			<span class="k">Retirement benefit %</span>
			<span class="v">{report.benefitPercentDisplay} of FAS</span>
		</div>
		<div class="spec">
			<span class="k">Normal retirement age</span>
			<span class="v">{s.retirementAge}</span>
		</div>
		<div class="spec">
			<span class="k">Payout period</span>
			<span class="v">{report.payoutYears} years</span>
		</div>
		<div class="spec">
			<span class="k">First payment</span>
			<span class="v">{waitText}</span>
		</div>
		<div class="spec">
			<span class="k">Final average salary</span>
			<span class="v">Final {s.fasAveragingPeriod} years</span>
		</div>
		<div class="spec">
			<span class="k">Assumed salary growth</span>
			<span class="v">{report.salaryGrowthDisplay} per year</span>
		</div>
	</div>

	{#if report.samples.length > 0}
		<h3 class="section-h">
			What that looks like for {report.samples.length === 1
				? 'one executive'
				: `${report.samples.length === 2 ? 'two' : 'three'} executives`}
		</h3>
		<div class="chips">
			<!-- Keyed by id, not name: names are not unique, and a duplicate key throws. -->
			{#each report.samples as sample (sample.insuredId)}
				<div class="chip">
					<div class="nm">{sample.name}</div>
					<div class="mini">Age {sample.age} · retires at {sample.retirementAge}</div>
					<div class="brow"><span>Final avg. salary</span><b>{sample.finalAverageSalary}</b></div>
					<div class="brow"><span>Benefit %</span><b>{sample.benefitPercent}</b></div>
					<div class="headline">
						{sample.annualBenefit}<small>projected annual benefit</small>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="note-box">
		<div class="h">Design flexibility</div>
		The benefit percentage is set per executive, so different management tiers can carry different formulas.
		The full participant-by-participant projection is on page 2.3.
	</div>
</PageShell>
