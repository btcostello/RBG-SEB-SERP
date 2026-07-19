<script lang="ts">
	/**
	 * Legacy Report — G1 Summary of Benefits (Appendix A): a sample participant benefit statement.
	 *
	 * Operator: "Produce for the first person in the census." Almost everything is a per-participant
	 * input or an already-computed result. The two **survivor totals** are the exception — the
	 * survivor benefit calculation is not written yet, though all its inputs exist. They render
	 * "— not yet calculated —" rather than a bare dash, so a reader is not left wondering whether
	 * the participant is simply ineligible.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	let { report }: { report: ReportModel } = $props();
	const s = $derived(report.benefitStatement);

	/** Results-gated: present after a run, else an em dash. */
	const val = (v: string | null) => v ?? '—';
	const PENDING = '— not yet calculated —';
	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
	/** "five-year average salary" in the source; rendered numerically to match pages 2.2 / 3.2. */
	const spanYears = (n: number) => `${n}-year`;
</script>

<LegacyPageShell {report} pageNo="Appendix A" pageNoSide="right" numbered={false}>
	{#if s}
		<div class="confidential">CONFIDENTIAL</div>
		<div class="bs-head">
			<div class="company">{report.companyName}</div>
			<h1>Summary of Benefits for {s.name}</h1>
		</div>

		<div class="facts">
			<div><span class="k">Date of Birth:</span> {s.dateOfBirth}</div>
			<div class="right"><span class="k">Statement Date:</span> {s.statementDate}</div>
			<div><span class="k">Current Age (to your nearest birthday):</span> {s.age}</div>
			<div class="right"><span class="k">Normal Retirement Age:</span> {s.retirementAge}</div>
			<div><span class="k">Current Recognized Salary:</span> {s.currentSalary}</div>
		</div>

		<h2>Normal Retirement Benefit</h2>
		<p>The benefits payable to you upon your retirement are based on the following:</p>
		<ul>
			<li>
				Your retirement benefit is a defined benefit of <strong>{s.benefitPercentDisplay}</strong>
				times your projected highest consecutive {spanYears(s.fasAveragingPeriod)} average
				salary
			</li>
		</ul>

		<div class="line">
			<span>Your assumed annual SERP benefit payable is:</span>
			<span class="v" class:gap={!s.annualBenefit}>{val(s.annualBenefit)}</span>
		</div>
		<p class="sub">
			(Your assumed projected highest consecutive {spanYears(s.fasAveragingPeriod)} average
			salary is: <span class:gap={!s.finalAverageSalary}>{val(s.finalAverageSalary)}</span>)
		</p>

		<div class="line">
			<span>
				Your total guaranteed SERP benefits, paid (for {plural(s.guaranteedYears, 'year')}) is:
			</span>
			<span class="v" class:gap={!s.guaranteedTotal}>{val(s.guaranteedTotal)}</span>
		</div>
		<div class="line">
			<span>
				Your projected total SERP benefits, paid (for {plural(s.projectedYears, 'year')}) is:
			</span>
			<span class="v" class:gap={!s.projectedTotal}>{val(s.projectedTotal)}</span>
		</div>

		<h2>Pre-Retirement Survivor Benefit</h2>
		<p>
			You are eligible for payment of survivor benefits if your death occurs while you are employed
			by the Company. Survivor benefits are generally defined to be a percentage of your Recognized
			Salary at the time of your death. The benefits payable to your designated beneficiary upon
			your death are based on the following schedule:
		</p>
		<ul>
			<li>
				<strong>{s.survivorTier1Display}</strong> of your Recognized Salary paid for
				{plural(s.survivorTier1Years, 'year')} following your death, plus
			</li>
			<li>
				<strong>{s.survivorTier2Display}</strong> of your Recognized Salary paid for the next
				{plural(s.survivorTier2Years, 'year')}
			</li>
		</ul>

		<div class="line">
			<span>Total survivor benefits payable if death were to occur this year:</span>
			<span class="v gap">{PENDING}</span>
		</div>
		<div class="line">
			<span>
				Total survivor benefits payable if death were to occur in the year prior to your Projected
				Retirement Age (age {s.priorToRetirementAge}):
			</span>
			<span class="v gap">{PENDING}</span>
		</div>

		<div class="notes">
			<p>
				<span class="note-label">NOTE:</span> The benefits illustrated assume an average salary growth
				of {s.salaryGrowthDisplay}, compounded annually.
			</p>
			<p>
				<span class="note-label">NOTE:</span> The benefits illustrated are projections based on a series
				of future salary assumptions, which may not occur. Your actual benefits will be determined by
				your actual compensation, and the provisions of the Plan Document.
			</p>
		</div>
	{:else}
		<p class="empty">No participants in the census — no benefit statement to display.</p>
	{/if}
</LegacyPageShell>

<style>
	.confidential {
		text-align: right;
		font-family: var(--sans);
		font-size: 7.5pt;
		letter-spacing: 0.08em;
		color: var(--muted);
		margin-bottom: 10px;
	}
	.bs-head {
		margin-bottom: 16px;
	}
	.bs-head .company {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 12pt;
		color: var(--ink-soft);
		margin-bottom: 10px;
	}
	.bs-head h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 15pt;
		text-align: center;
	}
	.facts {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 3px 24px;
		font-family: var(--sans);
		font-size: 9.5pt;
		color: var(--ink);
		margin-bottom: 18px;
	}
	.facts .right {
		text-align: right;
	}
	.facts .k {
		color: var(--ink-soft);
	}
	h2 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 11.5pt;
		margin: 16px 0 7px;
	}
	p {
		font-family: var(--sans);
		font-size: 9pt;
		line-height: 1.45;
		color: var(--ink-soft);
		margin-bottom: 7px;
	}
	ul {
		margin: 0 0 10px 18px;
		padding: 0;
	}
	li {
		font-family: var(--sans);
		font-size: 9pt;
		line-height: 1.45;
		color: var(--ink-soft);
		margin-bottom: 3px;
	}
	.line {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 20px;
		font-family: var(--sans);
		font-size: 9pt;
		color: var(--ink-soft);
		padding: 3px 0;
	}
	.line .v {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 10pt;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.gap {
		color: var(--line);
		font-weight: 400;
		font-size: 8.5pt;
		font-style: italic;
	}
	.sub {
		font-size: 8.5pt;
		margin: 0 0 8px 12px;
	}
	.notes {
		margin-top: 18px;
	}
	.notes p {
		font-size: 8pt;
		color: var(--muted);
		line-height: 1.4;
		padding-left: 52px;
		text-indent: -52px;
	}
	.note-label {
		display: inline-block;
		width: 44px;
		font-weight: 600;
	}
	.empty {
		font-style: italic;
		color: var(--muted);
	}
</style>
