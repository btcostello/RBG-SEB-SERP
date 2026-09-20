<script lang="ts">
	/**
	 * Legacy Report — Hypothetical Value of COLI (Appendix F).
	 *
	 * The asset-side counterpart to the liability pages: what the programme is worth and when it
	 * starts paying its way. A table of policy values and the annual charge or credit to earnings, a
	 * cumulative-earnings chart, and the four figures a CFO repeats back — level premium, total
	 * return, total gain, and the year the programme turns accretive.
	 *
	 * The source builds this on the cost-recovery basis (Option 1), so that is what the registry
	 * mounts. It takes `strategyId` as a prop, so adding a sheet for another option is a registry
	 * line rather than a new component.
	 *
	 * Chart conventions follow the Appendix G mortality chart, which set them: the same copper
	 * series colour, a zero line drawn wherever the plot crosses it, and identity carried by direct
	 * labelling rather than colour alone. This chart differs in one respect — its values go negative
	 * in the early durations, so the y-axis has to accommodate a range rather than a maximum, and
	 * the zero line is load-bearing instead of decorative.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	// Defaulted so the component still satisfies the registry's `{ report }` component type; the
	// registry supplies both for the sheet it mounts.
	let {
		report,
		strategyId = 'cost-recovery',
		optionLabel = 'Cost Recovery Basis (Option 1)'
	}: { report: ReportModel; strategyId?: string; optionLabel?: string } = $props();

	const value = $derived(report.coliValueByOption[strategyId]);

	const PLOT = { w: 360, h: 210, padL: 46, padR: 8, padT: 10, padB: 24 };

	/** Round a range outward to whole steps so the axis labels are round figures. */
	function ticksFor(min: number, max: number, targetSteps: number): number[] {
		if (!(max > min)) return [0, 1];
		const raw = (max - min) / targetSteps;
		const magnitude = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
		const step =
			[1, 2, 2.5, 5, 10].map((n) => n * magnitude).find((s) => s >= raw) ?? magnitude * 10;
		const first = Math.floor(min / step) * step;
		const last = Math.ceil(max / step) * step;
		const count = Math.round((last - first) / step);
		return Array.from({ length: count + 1 }, (_, i) => first + i * step);
	}

	const series = $derived(value?.cumulativeEarnings ?? []);
	const ticks = $derived(ticksFor(Math.min(0, ...series), Math.max(0, ...series), 5));

	const xFor = (year: number) =>
		PLOT.padL + (year / Math.max(value?.years ?? 1, 1)) * (PLOT.w - PLOT.padL - PLOT.padR);
	const yFor = (v: number) => {
		const lo = ticks[0];
		const hi = ticks[ticks.length - 1];
		const usable = PLOT.h - PLOT.padT - PLOT.padB;
		return PLOT.padT + usable - ((v - lo) / (hi - lo)) * usable;
	};

	/** Year 0 is pinned at zero — nothing has been earned before the programme starts. */
	const points = $derived(
		[`${xFor(0)},${yFor(0)}`, ...series.map((v, i) => `${xFor(i + 1)},${yFor(v)}`)].join(' ')
	);

	/** Axis labels in thousands, as the source does — the raw figures are too wide to read. */
	const thousands = (v: number) => {
		const k = Math.round(v / 1000);
		return k < 0 ? `(${Math.abs(k).toLocaleString('en-US')})` : k.toLocaleString('en-US');
	};

	/** Year gridlines at a readable spacing for however long the illustration runs. */
	const xTicks = $derived.by(() => {
		const years = value?.years ?? 0;
		const step = years > 60 ? 10 : years > 30 ? 5 : 2;
		const out: number[] = [];
		for (let y = step; y <= years; y += step) out.push(y);
		return out;
	});
</script>

<LegacyPageShell {report} pageNo="Appendix F" pageNoSide="right" numbered={false}>
	<div class="cv-head">
		<div class="company">{report.companyName}</div>
		<h1>Hypothetical Value of COLI — {optionLabel}</h1>
	</div>

	{#if !value}
		<p class="empty">
			Run the model to design the COLI funding; the hypothetical value of the programme appears
			here.
		</p>
	{:else}
		<div class="cv-body">
			<div class="table-side">
				<div class="tbl-title">Hypothetical COLI Program Results</div>
				<table>
					<thead>
						<tr>
							<th class="yr">Year</th>
							<th class="num">CSV + Proceeds</th>
							<th class="num">After-Tax Earnings</th>
						</tr>
					</thead>
					<tbody>
						{#each value.rows as row (row.policyYear)}
							<tr class:ultimate={row.label === 'Ultimate'}>
								<td class="yr">{row.label}</td>
								<td class="num">{row.csvPlusProceeds}</td>
								<td class="num">{row.afterTaxEarnings}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="chart-side">
				<div class="chart-title">COLI Cumulative Earnings Impact</div>
				<svg
					viewBox="0 0 {PLOT.w} {PLOT.h}"
					role="img"
					aria-label="COLI cumulative earnings impact by policy year"
				>
					{#each ticks as tick (tick)}
						<line
							class:zero={tick === 0}
							class="grid"
							x1={PLOT.padL}
							x2={PLOT.w - PLOT.padR}
							y1={yFor(tick)}
							y2={yFor(tick)}
						/>
						<text class="tick" x={PLOT.padL - 4} y={yFor(tick) + 3} text-anchor="end">
							{thousands(tick)}
						</text>
					{/each}
					{#each xTicks as year (year)}
						<text class="tick" x={xFor(year)} y={PLOT.h - PLOT.padB + 12} text-anchor="middle">
							{year}
						</text>
					{/each}
					<polyline class="series" {points} />
					<text class="series-label" x={PLOT.padL + 8} y={PLOT.padT + 16}>
						HYPOTHETICAL VALUE OF COLI
					</text>
					<text class="axis-note" x={PLOT.padL} y={PLOT.h - 2}>Figures in thousands</text>
					<text class="axis-note" x={PLOT.w - PLOT.padR} y={PLOT.h - 2} text-anchor="end">
						Policy Years
					</text>
				</svg>
			</div>
		</div>

		<ul class="bullets">
			<li>COLI Level Annual Premium = ${value.levelAnnualPremium}</li>
			<li>COLI Hypothetical Total Gain = ${value.totalGain}</li>
			<li>COLI Hypothetical Total Return = ${value.totalReturn}</li>
			<li>
				{#if value.accretiveFromYear === null}
					COLI does not become accretive to earnings within the illustrated period
				{:else}
					COLI is Accretive to Earnings from Year {value.accretiveFromYear}
				{/if}
			</li>
		</ul>

		<p class="note">
			Hypothetical values from the illustrated policies on the stated assumptions. Cash surrender
			values and death proceeds are shown gross of any policy loan. Premiums are not deductible;
			surrender value increases and death proceeds are generally not taxable, so no tax is applied
			to the earnings column.
		</p>
	{/if}
</LegacyPageShell>

<style>
	.cv-head {
		text-align: center;
		margin-bottom: 0.9rem;
	}
	.cv-head .company {
		font-family: var(--serif);
		font-size: 0.82rem;
		color: var(--muted);
	}
	.cv-head h1 {
		font-family: var(--serif);
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--ink);
		margin: 0.2rem 0 0;
	}
	.empty {
		font-size: 0.85rem;
		color: var(--muted);
		text-align: center;
		padding: 2rem 0;
	}
	.cv-body {
		display: grid;
		grid-template-columns: 1fr 1.15fr;
		gap: 1.25rem;
		align-items: start;
	}
	.tbl-title,
	.chart-title {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		color: var(--ink);
		text-align: center;
		margin-bottom: 0.35rem;
	}
	table {
		border-collapse: collapse;
		width: 100%;
		font-size: 0.68rem;
	}
	th,
	td {
		border-bottom: 1px solid var(--line-soft);
		padding: 0.12rem 0.3rem;
	}
	thead th {
		border-bottom: 1px solid var(--ink);
		font-weight: 700;
		font-size: 0.64rem;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.yr {
		text-align: left;
	}
	tr.ultimate td {
		font-weight: 700;
		border-top: 1px solid var(--ink);
	}
	svg {
		width: 100%;
		height: auto;
	}
	.grid {
		stroke: var(--line-soft);
		stroke-width: 0.5;
	}
	.grid.zero {
		stroke: var(--ink);
		stroke-width: 0.9;
	}
	.tick,
	.axis-note {
		font-size: 6px;
		fill: var(--muted);
	}
	.series {
		fill: none;
		stroke: var(--bronze);
		stroke-width: 1.6;
	}
	.series-label {
		font-size: 7px;
		font-weight: 700;
		fill: var(--bronze-deep);
		letter-spacing: 0.04em;
	}
	.bullets {
		margin: 0.9rem 0 0;
		padding-left: 1.1rem;
		font-size: 0.74rem;
		line-height: 1.55;
	}
	.note {
		font-size: 0.64rem;
		color: var(--muted);
		margin: 0.8rem 0 0;
		line-height: 1.45;
	}
</style>
