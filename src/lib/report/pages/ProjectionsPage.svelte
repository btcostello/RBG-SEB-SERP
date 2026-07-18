<script lang="ts">
	/**
	 * 2.3 Projection of participant benefits — per-participant FAS, benefit percentage,
	 * annual benefit, payout years, and total, with a totals row tying to the aggregate.
	 */
	import PageShell from './PageShell.svelte';
	import type { ReportModel } from '../report-data';

	let { report }: { report: ReportModel } = $props();

	const showNpvColumn = $derived(report.settings.npvDiscountRate !== 0);
</script>

<PageShell
	{report}
	eyebrow="Part 2 · Supporting detail"
	title="Projection of participant benefits"
	sub="Retirement benefits by participant, projected to normal retirement age."
	pageNo="2.3"
>
	{#if report.projections.length === 0}
		<p class="small">No SERP participants in this plan.</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th class="txt">Participant</th>
					<th>Age</th>
					<th>Age at ret.</th>
					<th>Final avg. salary</th>
					<th>SERP %</th>
					<th>Annual SERP benefit</th>
					<th>Years paid</th>
					<th>Total benefits</th>
					{#if showNpvColumn}<th>Present value</th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each report.projections as row, index (row.name + index)}
					<tr>
						<td class="txt">{row.name}</td>
						<td>{row.currentAge}</td>
						<td>{row.retirementAge}</td>
						<td>{row.finalAverageSalary}</td>
						<td>{row.benefitPercent}</td>
						<td>{row.annualBenefit}</td>
						<td>{row.paymentYears}</td>
						<td>{row.totalBenefit}</td>
						{#if showNpvColumn}<td>{row.netPresentValue}</td>{/if}
					</tr>
				{/each}
				<tr class="tot">
					<td class="txt">Total</td>
					<td></td>
					<td></td>
					<td></td>
					<td></td>
					<td></td>
					<td></td>
					<td>{report.totalBenefitCost}</td>
					{#if showNpvColumn}<td>{report.netPresentValue}</td>{/if}
				</tr>
			</tbody>
		</table>
		<p class="small" style="margin-top:10px">
			Salary growth assumed at {report.salaryGrowthDisplay} per year; final average salary is the average
			of the final {report.settings.fasAveragingPeriod} projected years to retirement. Benefits are level
			annual payments through age {report.settings.assumedDeathBenefitAge}. Definitions of each
			column are in the glossary (3.4).
		</p>
	{/if}
</PageShell>
