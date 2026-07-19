<script lang="ts">
	/**
	 * Legacy Report — H3 Comparison of Impact of Mortality Assumptions (Appendix G).
	 *
	 * The report's first chart page: two stacked panels (annual and cumulative) comparing deaths
	 * under an assumed-life-expectancy basis against an actuarial table.
	 *
	 * ⚠ **Plot areas are empty — the app has no mortality table.** The source uses RP-2000 white
	 * collar with scale AA improvements; `ModelSettings.mortalityTable` currently offers only
	 * RP-2012U, and no table data is loaded either way. See DATA-GAPS.md. What IS built here is
	 * everything around the data: titles, axes, gridlines, legend, and the footnote — so wiring
	 * the series later is a data exercise rather than a page rebuild.
	 *
	 * Series colours are the report's own teal/copper pair, nudged to `#00809a` so the palette
	 * passes the categorical checks (lightness band, chroma floor, CVD separation ΔE 61.7,
	 * contrast). Identity is never colour-alone: both series are also direct-labelled in the
	 * legend, and the axis frame carries no colour meaning.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	let { report }: { report: ReportModel } = $props();
	const m = $derived(report.mortalityAssumptions);

	/** Validated categorical pair — see the header note. */
	const SERIES = [
		{ label: 'Mortality Based on Assumed Life Expectancy', color: '#00809a' },
		{ label: 'Mortality Based on Actuarial Tables', color: '#b98a45' }
	];

	/** Plot geometry. Ticks match the source's 5-year gridlines out to year 65. */
	const PLOT = { w: 620, h: 215, padL: 34, padR: 8, padT: 10, padB: 22 };
	const X_TICKS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65];
	const xFor = (year: number) =>
		PLOT.padL + ((year - 0) / 68) * (PLOT.w - PLOT.padL - PLOT.padR);

	/** Y ticks differ per panel in the source (0–3.5 annual, 0–25 cumulative). */
	const PANELS = [
		{ title: 'Annual Impact', yTicks: [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5] },
		{ title: 'Cumulative Impact', yTicks: [0, 5, 10, 15, 20, 25] }
	];
	const yFor = (value: number, ticks: number[]) => {
		const max = ticks[ticks.length - 1];
		const usable = PLOT.h - PLOT.padT - PLOT.padB;
		return PLOT.padT + usable - (value / max) * usable;
	};
	const fmtTick = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
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
			<svg viewBox="0 0 {PLOT.w} {PLOT.h}" role="img" aria-label="{panel.title} — awaiting mortality table">
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
				<text class="pending" x={PLOT.w / 2} y={PLOT.h / 2} text-anchor="middle">
					Requires mortality table — not yet loaded
				</text>
			</svg>
		</div>
	{/each}

	<div class="legend">
		{#each SERIES as series (series.label)}
			<span class="key">
				<span class="swatch" style:background={series.color}></span>{series.label}
			</span>
		{/each}
	</div>

	<p class="foot">
		Youngest Participant = {m.youngestAge !== null ? `Age ${m.youngestAge}` : '—'}; Oldest
		Participant = {m.oldestAge !== null ? `Age ${m.oldestAge}` : '—'}; Life Expectancy = {m.lifeExpectancyDisplay}
	</p>
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
		width: 9px;
		height: 9px;
		border-radius: 2px;
		margin-right: 7px;
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
</style>
