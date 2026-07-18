<script lang="ts">
	/**
	 * Legacy Report — A6 Considerations (source: "A6 Considerations.pdf"), section page 1.1.
	 *
	 * Static narrative on designing nonqualified benefit plans (defined benefit vs. defined
	 * contribution). Centered two-line title; six paragraphs reproduced verbatim from source.
	 * Only the footer date is data-driven (via LegacyPageShell).
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	let { report }: { report: ReportModel } = $props();

	const PARAS: string[] = [
		'As an organization considers how best to design and implement a nonqualified benefit program for its top executives, the organization needs to consider the various options available, and which ones are best suited to meet its executive benefit objectives.',
		'Put simply, what is the organization trying to accomplish? Does it want to provide selected executives with incentives that encourage tenure with the organization and motivate long-term performance? Does it want to help selected executives achieve greater financial security as a reward for superior performance? Or, perhaps restore benefit levels that have been lost due to qualified pension gaps?',
		'In designing retirement plans, the Company has two broad options: defined benefit and defined contribution programs.',
		'Defined benefit plans are generally non-contributory: benefits are financed exclusively by the employer. This option gives the employer maximum flexibility when it comes to plan design and complete control in the benefit structure. Defined benefit plans can act as “golden handcuffs.” Defined benefit plans may also be designed as “age independent,” i.e., comparable benefits can be offered to 45, 55, and 65 year-old employees. Defined benefit programs can be a defined percentage of future or current compensation, a fixed dollar amount, or can reward past and/or future service, through a “unit credit” approach.',
		'Defined contribution plans can be funded by employee deferrals, employer contributions, or a combination of both. Defined contribution retirement plans are generally most attractive to younger employees, where sufficient time to retirement is available to accumulate funds and realize the compounded growth of investment returns. Programs can be structured to permit employees to select the investment allocation of their contributions and their balances.',
		"Cash flow, financial statement effects, group demographics, vesting, and benefit security may all have an impact on the Company's decisions as to which programs best meet its objectives."
	];
</script>

<LegacyPageShell {report} pageNo="1.1">
	<div class="considerations">
		<div class="c-title">
			<h1>Considerations When Designing</h1>
			<h1>Nonqualified Benefit Plans</h1>
		</div>
		<div class="c-body">
			{#each PARAS as para, i (i)}
				<p>{para}</p>
			{/each}
		</div>
	</div>
</LegacyPageShell>

<style>
	.c-title {
		text-align: center;
		margin-bottom: 20px;
	}
	.c-title h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 17pt;
		line-height: 1.2;
	}
	.c-body p {
		font-family: var(--sans);
		font-size: 10pt;
		line-height: 1.55;
		color: var(--ink-soft);
		text-align: justify;
		margin: 0 0 12px;
	}
</style>
