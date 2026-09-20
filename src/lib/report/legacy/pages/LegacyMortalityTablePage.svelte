<script lang="ts">
	/**
	 * Legacy Report — Comparison of Mortality Assumptions, supporting table (Appendix G, sheet 2).
	 *
	 * The numbers behind the chart on the preceding sheet: how many of the group are alive at the
	 * start of each projection year, and how many die during it, on each of the two bases.
	 *
	 * The contrast is the point, and it is easier to see here than on the chart. On the
	 * life-expectancy basis the group is a whole number that sits still for years and then steps
	 * down as participants reach their assumed death age. On the actuarial basis it drains
	 * continuously — a fraction of a life every year, because a probability applied to a group is
	 * not a person. Both reach the same place; only one of them is a thing that could happen.
	 *
	 * Laid out as two blocks side by side, as the source does, so twice the years fit on a sheet
	 * that still has to print.
	 *
	 * Both series come from `report.mortalityAssumptions`, the same derivation the chart plots, so
	 * the two sheets cannot disagree.
	 */
	import type { MortalityChartSeries, ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	let { report }: { report: ReportModel } = $props();
	const m = $derived(report.mortalityAssumptions);

	interface Row {
		year: number;
		assumedLiving: string;
		assumedDeaths: string;
		actuarialLiving: string;
		actuarialDeaths: string;
	}

	/**
	 * Living at the START of a year is the group less everyone who died before it — which is the
	 * cumulative series one year back, and the whole group in year one.
	 */
	function livingAtStart(series: MortalityChartSeries, year: number, count: number): number {
		return year === 1 ? count : count - series.cumulative[year - 2];
	}

	/** Whole lives on the assumed basis; fractions of one on the actuarial basis. */
	const whole = (n: number) => n.toFixed(0);
	const fractional = (n: number) => n.toFixed(3);

	const rows = $derived.by((): Row[] => {
		if (!m.actuarial || !m.assumed) return [];
		const count = m.participantCount;
		return Array.from({ length: m.years }, (_, i) => {
			const year = i + 1;
			return {
				year,
				assumedLiving: whole(livingAtStart(m.assumed!, year, count)),
				assumedDeaths: whole(m.assumed!.annual[i]),
				actuarialLiving: fractional(livingAtStart(m.actuarial!, year, count)),
				actuarialDeaths: fractional(m.actuarial!.annual[i])
			};
		});
	});

	/** Two blocks side by side — the first half of the years, then the second. */
	const half = $derived(Math.ceil(rows.length / 2));
	const blocks = $derived([rows.slice(0, half), rows.slice(half)]);
</script>

<LegacyPageShell {report} pageNo="Appendix G" pageNoSide="right" numbered={false}>
	<div class="mt-head">
		<div class="company">{report.companyName}</div>
		<h1>Comparison of Impact of Mortality Assumptions</h1>
		<div class="sub">Life Expectancy versus Actuarial Tables ("Partial Mortality")</div>
	</div>

	{#if rows.length === 0}
		<p class="empty">No SERP participants to project.</p>
	{:else}
		<div class="blocks">
			{#each blocks as block, b (b)}
				<table>
					<thead>
						<tr>
							<th rowspan="2" class="yr">Year</th>
							<th colspan="2">Life Expectancy</th>
							<th colspan="2">Actuarial Tables</th>
						</tr>
						<tr>
							<th class="num">BOY Living</th>
							<th class="num">Deaths</th>
							<th class="num">BOY Living</th>
							<th class="num">Deaths</th>
						</tr>
					</thead>
					<tbody>
						{#each block as row (row.year)}
							<tr>
								<td class="yr">{row.year}</td>
								<td class="num">{row.assumedLiving}</td>
								<td class="num">{row.assumedDeaths}</td>
								<td class="num">{row.actuarialLiving}</td>
								<td class="num">{row.actuarialDeaths}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/each}
		</div>

		<p class="foot">
			Opening group = {m.participantCount}
			{m.participantCount === 1 ? 'participant' : 'participants'}. On the life-expectancy basis each
			participant dies whole in the year they reach their assumed death age, so the count steps
			down; on the actuarial basis the same deaths are spread across every year as expected values,
			so the count declines by fractions of a life.
		</p>
		{#if m.excludedCount > 0}
			<p class="foot">
				{m.excludedCount}
				{m.excludedCount === 1 ? 'participant is' : 'participants are'} excluded — the mortality table
				does not cover them.
			</p>
		{/if}
	{/if}
</LegacyPageShell>

<style>
	.mt-head {
		text-align: center;
		margin-bottom: 0.7rem;
	}
	.mt-head .company {
		font-family: var(--serif);
		font-size: 0.82rem;
		color: var(--muted);
	}
	.mt-head h1 {
		font-family: var(--serif);
		font-size: 1.02rem;
		font-weight: 600;
		color: var(--ink);
		margin: 0.15rem 0 0;
	}
	.mt-head .sub {
		font-size: 0.74rem;
		color: var(--ink-soft);
		margin-top: 0.1rem;
	}
	.empty {
		text-align: center;
		color: var(--muted);
		font-size: 0.85rem;
		padding: 2rem 0;
	}
	.blocks {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.1rem;
		align-items: start;
	}
	table {
		border-collapse: collapse;
		width: 100%;
		font-size: 0.58rem;
	}
	th,
	td {
		border-bottom: 1px solid var(--line-soft);
		padding: 0.04rem 0.25rem;
	}
	thead th {
		border-bottom: 1px solid var(--ink);
		font-weight: 700;
		font-size: 0.56rem;
		text-align: center;
	}
	thead tr:first-child th {
		border-bottom: 1px solid var(--line);
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.yr {
		text-align: left;
		font-variant-numeric: tabular-nums;
	}
	.foot {
		font-size: 0.62rem;
		color: var(--muted);
		margin: 0.6rem 0 0;
		line-height: 1.4;
	}
</style>
