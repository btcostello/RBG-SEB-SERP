<script lang="ts">
	/**
	 * Legacy Report — H3 Comparison of Impact of Mortality Assumptions (Appendix G).
	 *
	 * The report's first chart page: two stacked panels (annual and cumulative) comparing deaths
	 * under an assumed-life-expectancy basis against an actuarial table.
	 *
	 * Both series come from `engine/mortality` via `report.mortalityAssumptions` — the IRS static
	 * mortality tables for the plan's valuation year, participants moving from the non-annuitant to
	 * the annuitant table at their retirement age. They need no model run: census ages, genders and
	 * retirement ages are enough.
	 *
	 * The chart's whole point is the *shape* difference. The assumed-life-expectancy basis kills
	 * each participant whole in one year, so it steps; the table spreads the same deaths across
	 * every year as fractional expectations, so it curves. Both converge on the same total, which
	 * is why the cumulative panel ends at the same height for both.
	 *
	 * Series colours are the report's own teal/copper pair, nudged to `#00809a` so the palette
	 * passes the categorical checks (lightness band, chroma floor, CVD separation ΔE 61.7,
	 * contrast). Identity is never colour-alone: both series are also direct-labelled in the
	 * legend, drawn with different stroke patterns, and the axis frame carries no colour meaning.
	 */
	import type { MortalityChartSeries, ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	let { report }: { report: ReportModel } = $props();
	const m = $derived(report.mortalityAssumptions);
	const hasSeries = $derived(!!m.actuarial && !!m.assumed);

	/** Validated categorical pair — see the header note. */
	const SERIES = [
		{ label: 'Mortality Based on Assumed Life Expectancy', color: '#00809a', dash: '' },
		{ label: 'Mortality Based on Actuarial Tables', color: '#b98a45', dash: '4 2.5' }
	];

	/** Plot geometry. Ticks match the source's 5-year gridlines out to year 65. */
	const PLOT = { w: 620, h: 215, padL: 34, padR: 8, padT: 10, padB: 22 };
	const X_TICKS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65];
	const xFor = (year: number) => PLOT.padL + (year / m.years) * (PLOT.w - PLOT.padL - PLOT.padR);

	/**
	 * Axis maxima follow the census rather than the source's fixed 0–3.5 / 0–25, which were sized
	 * for its 21 participants. Rounds up to a whole number of steps so the top gridline is a
	 * round figure and the tallest point still sits inside the plot.
	 */
	function ticksFor(max: number, targetSteps: number): number[] {
		if (!(max > 0)) return [0, 1];
		const raw = max / targetSteps;
		const magnitude = 10 ** Math.floor(Math.log10(raw));
		const step =
			[1, 2, 2.5, 5, 10].map((n) => n * magnitude).find((s) => s >= raw) ?? magnitude * 10;
		const steps = Math.ceil(max / step);
		return Array.from({ length: steps + 1 }, (_, i) => Number((i * step).toFixed(10)));
	}

	const peak = (series: MortalityChartSeries | null, key: 'annual' | 'cumulative') =>
		series ? Math.max(...series[key], 0) : 0;

	const PANELS = $derived([
		{
			title: 'Annual Impact',
			key: 'annual' as const,
			yTicks: ticksFor(Math.max(peak(m.actuarial, 'annual'), peak(m.assumed, 'annual')), 6)
		},
		{
			title: 'Cumulative Impact',
			key: 'cumulative' as const,
			yTicks: ticksFor(Math.max(peak(m.actuarial, 'cumulative'), peak(m.assumed, 'cumulative')), 5)
		}
	]);

	const yFor = (value: number, ticks: number[]) => {
		const max = ticks[ticks.length - 1];
		const usable = PLOT.h - PLOT.padT - PLOT.padB;
		return PLOT.padT + usable - (value / max) * usable;
	};
	const fmtTick = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

	/**
	 * Series as an SVG polyline. Year 0 is pinned at zero so both lines start on the axis — no
	 * deaths have happened before the projection begins.
	 */
	function points(values: readonly number[], ticks: number[]): string {
		const head = `${xFor(0)},${yFor(0, ticks)}`;
		const body = values.map((v, i) => `${xFor(i + 1)},${yFor(v, ticks)}`).join(' ');
		return `${head} ${body}`;
	}
</script>

<LegacyPageShell {report} pageNo="Appendix G" pageNoSide="right" numbered={false}>
	<div class="mc-head">
		<div class="company">{report.companyName}</div>
		<h1>Comparison of Impact of Mortality Assumptions</h1>
		<div class="sub">Life Expectancy versus Actuarial Tables ("Partial Mortality")</div>
	</div>

	{#each PANELS as panel (panel.title)}
		<div class="panel">
			<div class="panel-title">{panel.title}</div>
			<svg
				viewBox="0 0 {PLOT.w} {PLOT.h}"
				role="img"
				aria-label={hasSeries
					? `${panel.title}: deaths per year under assumed life expectancy versus the mortality table, over ${m.years} years`
					: `${panel.title} — no participants to project`}
			>
				<!-- Gridlines and axes are recessive; they carry no series meaning. -->
				{#each panel.yTicks as tick (tick)}
					<line
						class="grid"
						x1={PLOT.padL}
						x2={PLOT.w - PLOT.padR}
						y1={yFor(tick, panel.yTicks)}
						y2={yFor(tick, panel.yTicks)}
					/>
					<text class="tick" x={PLOT.padL - 6} y={yFor(tick, panel.yTicks) + 2.5} text-anchor="end">
						{fmtTick(tick)}
					</text>
				{/each}
				{#each X_TICKS as year (year)}
					<text class="tick" x={xFor(year)} y={PLOT.h - 6} text-anchor="middle">{year}</text>
				{/each}
				<line
					class="axis"
					x1={PLOT.padL}
					x2={PLOT.w - PLOT.padR}
					y1={yFor(0, panel.yTicks)}
					y2={yFor(0, panel.yTicks)}
				/>
				{#if hasSeries}
					<!-- Assumed life expectancy first, so the table's curve reads on top of its steps. -->
					<polyline
						class="series"
						points={points(m.assumed![panel.key], panel.yTicks)}
						stroke={SERIES[0].color}
						stroke-dasharray={SERIES[0].dash}
					/>
					<polyline
						class="series"
						points={points(m.actuarial![panel.key], panel.yTicks)}
						stroke={SERIES[1].color}
						stroke-dasharray={SERIES[1].dash}
					/>
				{:else}
					<text class="pending" x={PLOT.w / 2} y={PLOT.h / 2} text-anchor="middle">
						No SERP participants to project
					</text>
				{/if}
			</svg>
		</div>
	{/each}

	<div class="legend">
		{#each SERIES as series (series.label)}
			<span class="key">
				<!-- The swatch repeats the stroke pattern, so the key survives greyscale printing. -->
				<svg class="swatch" viewBox="0 0 20 8" aria-hidden="true">
					<line
						x1="0"
						y1="4"
						x2="20"
						y2="4"
						stroke={series.color}
						stroke-width="2"
						stroke-dasharray={series.dash}
					/>
				</svg>{series.label}
			</span>
		{/each}
	</div>

	<p class="foot">
		Youngest Participant = {m.youngestAge !== null ? `Age ${m.youngestAge}` : '—'}; Oldest
		Participant = {m.oldestAge !== null ? `Age ${m.oldestAge}` : '—'}; Life Expectancy = {m.lifeExpectancyDisplay}
	</p>
	{#if m.excludedCount > 0}
		<p class="foot excluded">
			{m.excludedCount}
			{m.excludedCount === 1 ? 'participant is' : 'participants are'} outside the mortality table's age
			range and {m.excludedCount === 1 ? 'is' : 'are'} not included in the curves above.
		</p>
	{/if}
</LegacyPageShell>

<style>
	.mc-head {
		text-align: center;
		margin-bottom: 14px;
	}
	.mc-head .company {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 12pt;
		color: var(--ink-soft);
		margin-bottom: 4px;
	}
	.mc-head h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 14pt;
	}
	.mc-head .sub {
		font-family: var(--sans);
		font-size: 9pt;
		color: var(--ink-soft);
		margin-top: 3px;
	}
	.panel {
		margin-bottom: 16px;
	}
	.panel-title {
		text-align: center;
		font-family: var(--sans);
		font-weight: 600;
		font-size: 9pt;
		color: var(--ink);
		margin-bottom: 4px;
	}
	svg {
		width: 100%;
		height: auto;
		display: block;
	}
	.grid {
		stroke: var(--line-soft);
		stroke-width: 1;
	}
	.axis {
		stroke: var(--line);
		stroke-width: 1.5;
	}
	.tick {
		font-family: var(--sans);
		font-size: 7px;
		fill: var(--muted);
	}
	.pending {
		font-family: var(--sans);
		font-size: 9px;
		font-style: italic;
		fill: var(--muted);
	}
	.legend {
		display: flex;
		justify-content: center;
		gap: 26px;
		margin: 10px 0 6px;
	}
	.key {
		display: inline-flex;
		align-items: center;
		font-family: var(--sans);
		font-size: 8pt;
		color: var(--ink-soft);
	}
	.swatch {
		display: inline-block;
		width: 20px;
		height: 8px;
		margin-right: 7px;
		flex: none;
	}
	.series {
		fill: none;
		stroke-width: 1.6;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.foot {
		text-align: center;
		font-family: var(--sans);
		font-size: 8pt;
		color: var(--muted);
		margin-top: 8px;
		/* A global report rule uppercases small print; the source sets this line sentence-case. */
		text-transform: none;
	}
	.foot.excluded {
		margin-top: 3px;
		font-style: italic;
		color: var(--warn-tx, var(--muted));
	}
</style>
