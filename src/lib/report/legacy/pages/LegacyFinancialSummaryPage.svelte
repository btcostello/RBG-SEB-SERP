<script lang="ts">
	/**
	 * Legacy Report — Financial Overview / Summary (source: "J1 Butterfly Chart").
	 *
	 * A one-page financial snapshot for a single funding option (default Option 3, "Funding
	 * Wherewithal"). The source's butterfly bar chart is presented here as plain figure tables —
	 * every value in FULL DOLLARS (per operator). This is the last page of the report and carries
	 * no page number.
	 *
	 * The same COLI accumulated value is shown two ways:
	 *  - Funding Wherewithal — the accumulated value against the obligations it can cover.
	 *  - Cost Recovery — how that accumulated value is applied: after-tax SERP benefits +
	 *    cumulative COLI premiums + a use-of-cash surplus.
	 *
	 * Earnings Impact is a best-guess tie to the 5.2 earnings ledger and is marked provisional.
	 */
	import { REPORT_FUNDING_OPTIONS, type ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	let {
		report,
		strategyId = 'premium-deposit'
	}: { report: ReportModel; strategyId?: string } = $props();

	const r = $derived(report);
	const dash = (v: string | null | undefined) => v ?? '—';

	const optionMeta = $derived(REPORT_FUNDING_OPTIONS.find((o) => o.id === strategyId));
	const fo = $derived(r.financialOverviewByOption[strategyId]);
	const hasFo = $derived(r.hasResults && !!fo);

	// --- Earnings Impact (provisional — best-guess tie to the 5.2 earnings ledger) ---
	const serpLedger = $derived(r.earningsLedgerSerp);
	const optLedger = $derived(r.earningsLedgerByOption[strategyId]);

	function years(rec: Record<number, string> | undefined): number[] {
		if (!rec) return [];
		return Object.keys(rec)
			.map(Number)
			.filter((n) => Number.isFinite(n))
			.sort((a, b) => a - b);
	}
	const firstYear = $derived(years(serpLedger?.col3ByYear ?? optLedger?.coliByYear)[0] ?? null);
	/** A gain is a non-parenthesized, non-zero value. */
	function firstAccretiveYear(rec: Record<number, string> | undefined): number | null {
		for (const y of years(rec)) {
			const v = (rec?.[y] ?? '').trim();
			if (v && !v.startsWith('(') && v.replace(/[$,\s]/g, '').replace(/^0+$/, '') !== '') return y;
		}
		return null;
	}
	const accretiveYear = $derived(firstAccretiveYear(optLedger?.coliByYear));
	const hasEarnings = $derived(r.hasResults && !!serpLedger && !!optLedger && firstYear !== null);
	const yearCell = (rec: Record<number, string> | undefined) =>
		firstYear !== null ? dash(rec?.[firstYear]) : '—';
</script>

<LegacyPageShell {report} pageNo="" numbered={false} pageNoSide="right">
	<div class="fo">
		<div class="fo-head">
			<div class="company">{report.companyName}</div>
			<h1>Financial Overview — Summary</h1>
			<div class="sub">{optionMeta ? `${optionMeta.label} · Option ${optionMeta.number}` : ''}</div>
		</div>

		{#if !hasFo}
			<p class="empty">Run the model to populate the financial overview.</p>
		{:else}
			<!-- Plan population -->
			<section class="sec">
				<h2>Plan</h2>
				<div class="grid2">
					<div class="row"><span class="k">Individuals in Plan</span><span class="v">{r.numSerp}</span></div>
					<div class="row"><span class="k">Average Age</span><span class="v">{r.averageAgeSerp ?? '—'}</span></div>
				</div>
			</section>

			<!-- SERP benefit cost -->
			<section class="sec">
				<h2>SERP Benefit Cost</h2>
				<div class="row"><span class="k">Projected Benefit Value (Benefits Payable)</span><span class="v">{r.totalBenefitCost}</span></div>
				<div class="row"><span class="k">Less: Anticipated Tax Deduction (at {r.taxRateDisplay})</span><span class="v">({r.taxDeduction})</span></div>
				<div class="row total"><span class="k">After-Tax Benefit Cost</span><span class="v">{r.afterTaxCost}</span></div>
			</section>

			<!-- COLI funding -->
			<section class="sec">
				<h2>COLI Funding</h2>
				<div class="row"><span class="k">Annual COLI Premium <sup>*</sup></span><span class="v">{dash(fo?.annualColiPremium)}</span></div>
				<div class="row"><span class="k">Cumulative COLI Premium</span><span class="v">{fo?.cumulativeColiPremium}</span></div>
				<div class="row total"><span class="k">COLI Accumulated Values <sup>†</sup></span><span class="v">{fo?.coliAccumulatedValues}</span></div>
			</section>

			<!-- Two views of the accumulated value -->
			<div class="panels">
				<section class="panel">
					<h3>Funding Wherewithal</h3>
					<p class="cap">Does the COLI cover what the plan owes?</p>
					<div class="row"><span class="k">COLI Accumulated Values</span><span class="v">{fo?.coliAccumulatedValues}</span></div>
					<div class="row"><span class="k">Benefits Payable</span><span class="v">{r.totalBenefitCost}</span></div>
					<div class="row"><span class="k">After-Tax Benefit Cost</span><span class="v">{r.afterTaxCost}</span></div>
				</section>

				<section class="panel">
					<h3>Cost Recovery</h3>
					<p class="cap">How the accumulated value is applied.</p>
					<div class="row"><span class="k">SERP Benefits (after-tax cost)</span><span class="v">{r.afterTaxCost}</span></div>
					<div class="row"><span class="k">COLI Premiums (cumulative)</span><span class="v">{fo?.cumulativeColiPremium}</span></div>
					<div class="row"><span class="k">Use of Cash Factor</span><span class="v">{fo?.useOfCashFactor}</span></div>
					<div class="row total"><span class="k">COLI Accumulated Values</span><span class="v">{fo?.coliAccumulatedValues}</span></div>
				</section>
			</div>

			<p class="fn">
				<sup>*</sup> First-year premium; assumed premium payment period is ten years.
				<sup>†</sup> COLI Accumulated Values = death benefit proceeds at life expectancy + policy
				distributions. Use of Cash Factor = COLI Accumulated Values − After-Tax Benefit Cost −
				Cumulative COLI Premiums.
			</p>

			<!-- Earnings Impact (provisional) -->
			<section class="sec earn">
				<h2>Earnings Impact <span class="prov">(provisional)</span></h2>
				{#if hasEarnings}
					<div class="row"><span class="k">First-Year SERP After-Tax Accrual</span><span class="v">{yearCell(serpLedger?.col3ByYear)}</span></div>
					<div class="row"><span class="k">First-Year COLI Earnings Impact</span><span class="v">{yearCell(optLedger?.coliByYear)}</span></div>
					<div class="row total"><span class="k">First-Year Combined Impact</span><span class="v">{yearCell(optLedger?.combinedByYear)}</span></div>
					<div class="row gap-top"><span class="k">COLI Ultimate Gain (life of program)</span><span class="v">{dash(optLedger?.coliTotal)}</span></div>
					{#if accretiveYear !== null && firstYear !== null}
						<p class="fn">COLI accretive to earnings from year {accretiveYear - firstYear + 1}.</p>
					{/if}
				{:else}
					<p class="empty small">Earnings figures populate once the accounting run completes.</p>
				{/if}
			</section>
		{/if}
	</div>
</LegacyPageShell>

<style>
	.fo-head {
		text-align: center;
		margin-bottom: 20px;
	}
	.fo-head .company {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 12pt;
		color: var(--ink-soft);
		margin-bottom: 4px;
	}
	.fo-head h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 16pt;
	}
	.fo-head .sub {
		font-family: var(--sans);
		font-size: 9pt;
		color: var(--bronze-deep, var(--muted));
		margin-top: 3px;
	}

	.empty {
		font-family: var(--sans);
		font-size: 10pt;
		color: var(--muted);
		text-align: center;
		margin: 40px 0;
	}
	.empty.small {
		margin: 8px 0;
		text-align: left;
	}

	.sec {
		margin-bottom: 16px;
	}
	.sec h2 {
		font-family: var(--sans);
		font-weight: 700;
		font-size: 8.5pt;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		color: var(--bronze-deep, var(--ink-soft));
		border-bottom: 1.5px solid var(--bronze, var(--ink));
		padding-bottom: 4px;
		margin: 0 0 8px;
	}
	.sec h2 .prov {
		font-weight: 500;
		text-transform: none;
		letter-spacing: 0;
		color: var(--muted);
		font-size: 8pt;
	}

	/* two stats side by side under Plan */
	.grid2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0 32px;
	}

	.row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 14px;
		padding: 3px 0;
		font-family: var(--sans);
		font-size: 10pt;
		color: var(--ink-soft);
	}
	.row .v {
		font-family: var(--serif);
		font-weight: 600;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.row.total {
		border-top: 1.5px solid var(--ink);
		margin-top: 3px;
		padding-top: 6px;
	}
	.row.total .k {
		font-weight: 600;
		color: var(--ink);
	}
	.row.gap-top {
		margin-top: 10px;
	}

	/* the two summary views */
	.panels {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
		margin: 4px 0 6px;
	}
	.panel {
		border: 1px solid var(--line);
		border-top: 2.5px solid var(--bronze, var(--ink));
		border-radius: 2px;
		padding: 10px 14px 12px;
		background: var(--paper);
	}
	.panel h3 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 12pt;
		margin: 0 0 2px;
		color: var(--ink);
	}
	.panel .cap {
		font-family: var(--sans);
		font-size: 8pt;
		color: var(--muted);
		margin: 0 0 8px;
	}

	.fn {
		font-family: var(--sans);
		font-size: 8pt;
		color: var(--muted);
		line-height: 1.5;
		margin: 8px 0 4px;
	}

	.earn {
		margin-top: 18px;
		border-top: 1px solid var(--line);
		padding-top: 12px;
	}
</style>
