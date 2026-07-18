<script lang="ts">
	/**
	 * Legacy Report — B3 Participant Benefits Formula (source: "B3 Benefit Formula.pdf"), page 2.2.
	 *
	 * A structured spec sheet of the plan's benefit formula. Static descriptive text plus
	 * data-driven terms taken from a representative participant via report.benefitFormula:
	 *   Payout period = maxBenefitYears; Guaranteed minimum = minBenefitYears;
	 *   survivor tiers = survivorTier1/2 Pct & Years; guaranteed survivor certain = tier1+tier2.
	 */
	import { formatPercent, type ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	let { report }: { report: ReportModel } = $props();
	const bf = $derived(report.benefitFormula);

	/** "20 Years" for a number, or "Varies" for the sentinel. */
	const years = (n: number | 'varies') =>
		n === 'varies' ? 'Varies' : `${n} ${n === 1 ? 'Year' : 'Years'}`;
	const yearsLower = (n: number) => `${n} ${n === 1 ? 'year' : 'years'}`;
</script>

<LegacyPageShell {report} pageNo="2.2" pageNoSide="right">
	<div class="bf">
		<div class="bf-head">
			<div class="company">{report.companyName}</div>
			<h1>Participant Benefits Formula</h1>
			<h2>Defined Benefit SERP</h2>
		</div>

		<section class="bf-sec">
			<h3>Normal Retirement Benefits</h3>
			<ul>
				<li>
					Payable to a participant upon retirement and/or to the participant's designated
					beneficiary if death occurs after retirement, during the period certain
				</li>
				<li>
					Formula for retirement payments:
					<div class="sub">
						Targeted benefit account balance plan from a deemed contribution with option for
						in-service payouts.
					</div>
				</li>
				<li class="row">
					<span class="lbl">Payout period:</span>
					<span class="val">{years(bf.payoutPeriodYears)}</span>
				</li>
				<li class="row">
					<span class="lbl">Guaranteed minimum payout period certain:</span>
					<span class="val">{years(bf.guaranteedMinYears)}</span>
				</li>
			</ul>
		</section>

		<section class="bf-sec">
			<h3>Early Retirement Benefits</h3>
			<ul>
				<li>
					Actuarially reduced Normal Retirement Benefit
					<div class="sub">(may be further adjusted for vesting and accrual schedules)</div>
				</li>
			</ul>
		</section>

		<section class="bf-sec">
			<h3>Pre-Retirement Survivor Benefits</h3>
			<ul>
				<li>
					Payable to the participant's designated beneficiary upon participant's death prior to
					retirement, while employed by the Company
				</li>
				<li>
					Formula for survivor payments (based on the participant's recognized salary at the date
					of death):
					<div class="sub formula">
						{#if bf.survivorVaries}
							Varies by participant
						{:else}
							{formatPercent(bf.survivorTier1Pct)} of salary paid for {yearsLower(
								bf.survivorTier1Years
							)} following death; plus<br />
							{formatPercent(bf.survivorTier2Pct)} of salary paid for each of the next {yearsLower(
								bf.survivorTier2Years
							)}
						{/if}
					</div>
				</li>
				<li class="row">
					<span class="lbl">Guaranteed payout period certain:</span>
					<span class="val">{years(bf.survivorGuaranteedYears)}</span>
				</li>
			</ul>
		</section>
	</div>
</LegacyPageShell>

<style>
	.bf-head {
		text-align: center;
		margin-bottom: 22px;
	}
	.bf-head .company {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 13pt;
		color: var(--ink-soft);
		margin-bottom: 8px;
	}
	.bf-head h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 18pt;
		line-height: 1.15;
	}
	.bf-head h2 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 13pt;
		color: var(--ink-soft);
		margin-top: 2px;
	}
	.bf-sec {
		margin-bottom: 16px;
	}
	.bf-sec h3 {
		font-family: var(--sans);
		font-weight: 600;
		font-size: 9.5pt;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--ink);
		border-bottom: 1.5px solid var(--ink);
		padding-bottom: 5px;
		margin-bottom: 10px;
	}
	.bf-sec ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.bf-sec li {
		font-family: var(--sans);
		font-size: 10pt;
		line-height: 1.5;
		color: var(--ink-soft);
		padding: 3px 0 3px 26px;
		position: relative;
	}
	.bf-sec li::before {
		content: '';
		position: absolute;
		left: 4px;
		top: 0.5em;
		width: 6px;
		height: 6px;
		border: 1.2px solid var(--bronze);
	}
	.bf-sec li .sub {
		color: var(--muted);
		font-size: 9.5pt;
		margin-top: 2px;
	}
	.bf-sec li .sub.formula {
		font-family: var(--serif);
		font-size: 10.5pt;
		color: var(--ink);
		margin-top: 6px;
		line-height: 1.7;
	}
	.bf-sec li.row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 16px;
	}
	.bf-sec li.row .val {
		font-family: var(--serif);
		font-weight: 600;
		color: var(--ink);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
</style>
