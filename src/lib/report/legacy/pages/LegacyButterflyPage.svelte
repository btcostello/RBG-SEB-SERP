<script lang="ts">
	/**
	 * Legacy Report — J1 Butterfly Chart (source: "J1 Butterfly Chart.pdf"), landscape.
	 *
	 * The source page is a "butterfly": two wings of figures flanking the Schiff Executive
	 * Benefits mark in the centre gutter. It carries the same figures as the portrait
	 * `LegacyFinancialSummaryPage` — this sheet is the operator's at-a-glance arrangement of them,
	 * so every derivation below is deliberately the *same* one the portrait page uses. Changing a
	 * figure means changing it in both, or the two sheets will disagree inside one report.
	 *
	 * Source geometry (US-Letter landscape, 792x612pt) reproduced proportionally:
	 *   wings   x 50.9-267.8 and 525.7-740.9  (~31% of the frame each)
	 *   gutter  x 267.8-525.7                 (~37%, wider than either wing)
	 *   logo    187.18 x 66.12pt centred at x=396.2 — the exact page centre.
	 *
	 * Units: the source prints the right wing in millions/thousands ("$11.9", "$343.9"). This
	 * sheet prints FULL DOLLARS instead, matching the standing operator decision on the portrait
	 * summary — the two pages show the same figure the same way. The scale labels are dropped
	 * accordingly rather than left to lie about the numbers beneath them.
	 */
	import { REPORT_FUNDING_OPTIONS, shortDate, type ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';
	import logoUrl from '$lib/assets/schiff-executive-benefits.jpg';

	let { report, strategyId = 'premium-deposit' }: { report: ReportModel; strategyId?: string } =
		$props();

	const r = $derived(report);
	const dash = (v: string | null | undefined) => v ?? '—';
	/** Obligations the accumulated value has to cover — shown as deductions, house convention. */
	const neg = (v: string | null | undefined) => (v ? `(${v})` : '—');

	const optionMeta = $derived(REPORT_FUNDING_OPTIONS.find((o) => o.id === strategyId));
	const fo = $derived(r.financialOverviewByOption[strategyId]);
	const hasFo = $derived(r.hasResults && !!fo);

	// --- Earnings Impact — same provisional tie to the 5.2 earnings ledger as the portrait page ---
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
	<div class="bf">
		<div class="bf-head">
			<div class="company">{report.companyName}</div>
			<h1>Summary</h1>
			<div class="sub">{optionMeta ? `${optionMeta.label} · Option ${optionMeta.number}` : ''}</div>
		</div>

		{#if !hasFo}
			<p class="empty">Run the model to populate the summary.</p>
		{:else}
			<div class="wings">
				<!-- ============ LEFT WING ============ -->
				<div class="wing">
					<div class="titlecard">
						<div class="t1">Executive Summary</div>
						<div class="t2">Specifications &amp; Actuarial Assumptions</div>
					</div>

					<section class="panel">
						<h2>Participants</h2>
						<div class="row">
							<span class="k">Individuals in Plan</span><span class="v">{r.numSerp}</span>
						</div>
						<div class="row">
							<span class="k">Average Age</span><span class="v">{r.averageAgeSerp ?? '—'}</span>
						</div>
						<div class="row">
							<span class="k">Projected Benefit Value</span><span class="v"
								>{r.totalBenefitCost}</span
							>
						</div>
					</section>

					<section class="panel">
						<h2>Financial Overview</h2>
						<div class="row">
							<span class="k">Benefits Payable</span><span class="v">{r.totalBenefitCost}</span>
						</div>
						<div class="row">
							<span class="k">Tax Deduction</span><span class="v">{neg(r.taxDeduction)}</span>
						</div>
						<div class="row total">
							<span class="k">After Tax Benefit Cost</span><span class="v">{r.afterTaxCost}</span>
						</div>
						<div class="row gap-top">
							<span class="k">Annual COLI Premium</span>
							<span class="v">{dash(fo?.annualColiPremium)}</span>
						</div>
						<div class="row">
							<span class="k">Cumulative COLI Premium</span>
							<span class="v">{dash(fo?.cumulativeColiPremium)}</span>
						</div>
					</section>

					<div class="runline">
						<span class="k">Model Run Date</span><span class="v">{shortDate(r.asOf)}</span>
					</div>
				</div>

				<!-- ============ CENTRE — the butterfly's body ============ -->
				<div class="body">
					<img src={logoUrl} alt="Schiff Executive Benefits" />
				</div>

				<!-- ============ RIGHT WING ============ -->
				<div class="wing">
					<section class="panel">
						<h2>Cash Flow Impact</h2>

						<div class="grouplabel">Funding Wherewithal</div>
						<div class="row">
							<span class="k">COLI Accumulated Values</span>
							<span class="v">{dash(fo?.coliAccumulatedValues)}</span>
						</div>
						<div class="row">
							<span class="k">Benefits Payable</span><span class="v">{neg(r.totalBenefitCost)}</span
							>
						</div>
						<div class="row">
							<span class="k">A/T Benefits Cost</span><span class="v">{neg(r.afterTaxCost)}</span>
						</div>

						<div class="grouplabel spaced">Cost Recovery</div>
						<div class="row">
							<span class="k">SERP Benefits</span><span class="v">{r.afterTaxCost}</span>
						</div>
						<div class="row">
							<span class="k">COLI Premiums</span>
							<span class="v">{dash(fo?.cumulativeColiPremium)}</span>
						</div>
						<div class="row">
							<span class="k">Use of Cash Factor</span><span class="v"
								>{dash(fo?.useOfCashFactor)}</span
							>
						</div>
						<div class="row total">
							<span class="k">COLI Accumulated Values</span>
							<span class="v">{dash(fo?.coliAccumulatedValues)}</span>
						</div>
					</section>

					<section class="panel">
						<h2>Earnings Impact</h2>
						{#if hasEarnings}
							<div class="grouplabel">First Year</div>
							<div class="row">
								<span class="k">SERP A/T Accrual</span>
								<span class="v">{yearCell(serpLedger?.col3ByYear)}</span>
							</div>
							<div class="row">
								<span class="k">COLI Gain</span><span class="v"
									>{yearCell(optLedger?.coliByYear)}</span
								>
							</div>
							<div class="row total">
								<span class="k">Total</span><span class="v"
									>{yearCell(optLedger?.combinedByYear)}</span
								>
							</div>
							{#if accretiveYear !== null && firstYear !== null}
								<p class="accretive">
									COLI accretive to earnings from year {accretiveYear - firstYear + 1}
								</p>
							{/if}
							<div class="row gap-top">
								<span class="k">COLI Ultimate Gain</span>
								<span class="v">{dash(optLedger?.coliTotal)}</span>
							</div>
						{:else}
							<p class="empty small">
								Earnings figures populate once the accounting run completes.
							</p>
						{/if}
					</section>
				</div>
			</div>

			<p class="note">
				Note: See Disclosure Report and Basic Illustration for important information about
				Assumptions, Guarantees, and applicable Federal Tax and Securities Laws.
			</p>
		{/if}
	</div>
</LegacyPageShell>

<style>
	/* The source frames the whole sheet in a hairline box; keep that. */
	.bf {
		display: flex;
		flex-direction: column;
		height: 100%;
		border: 1px solid var(--line);
		padding: 12px 18px 10px;
	}

	.bf-head {
		text-align: center;
		margin-bottom: 10px;
	}
	.bf-head .company {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 12pt;
		color: var(--ink-soft);
		margin-bottom: 2px;
	}
	.bf-head h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 14pt;
		letter-spacing: 0.01em;
	}
	.bf-head .sub {
		font-family: var(--sans);
		font-size: 9pt;
		color: var(--bronze-deep, var(--muted));
		margin-top: 3px;
	}

	/*
	 * Wing / body / wing. Source proportions are ~31% / 37% / 31% — the gutter is wider than
	 * either wing, which is what gives the page its air. Kept close, with the wings a shade
	 * wider so full-dollar figures sit comfortably.
	 */
	.wings {
		display: grid;
		grid-template-columns: 1.1fr 0.8fr 1.1fr;
		gap: 0 20px;
		align-items: start;
		flex: 1;
	}
	.wing {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	/* Centre: the mark, vertically centred on the wings as in the source. */
	.body {
		align-self: center;
		display: flex;
		justify-content: center;
	}
	.body img {
		width: 100%;
		max-width: 200px;
		height: auto;
		/* The source asset is a JPEG on white; the sheet is white too, so it sits flush. */
	}

	/* Left wing's opening card — a title, not data, exactly as the source has it. */
	.titlecard {
		border: 1px solid var(--line);
		border-top: 2.5px solid var(--bronze, var(--ink));
		padding: 10px 12px;
		text-align: center;
		background: var(--fill);
	}
	.titlecard .t1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 12.5pt;
		color: var(--ink);
		line-height: 1.2;
	}
	.titlecard .t2 {
		font-family: var(--sans);
		font-size: 8.5pt;
		color: var(--muted);
		margin-top: 4px;
		line-height: 1.35;
	}

	.panel {
		border: 1px solid var(--line);
		border-top: 2.5px solid var(--bronze, var(--ink));
		padding: 7px 10px 8px;
		background: var(--paper);
	}
	.panel h2 {
		font-family: var(--sans);
		font-weight: 700;
		font-size: 8.5pt;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		color: var(--bronze-deep, var(--ink-soft));
		border-bottom: 1.5px solid var(--bronze, var(--ink));
		padding-bottom: 3px;
		margin: 0 0 6px;
	}
	.grouplabel {
		font-family: var(--sans);
		font-weight: 600;
		font-size: 8.5pt;
		color: var(--ink);
		margin-bottom: 2px;
	}
	.grouplabel.spaced {
		margin-top: 9px;
	}

	.row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		padding: 1.5px 0;
		font-family: var(--sans);
		font-size: 9pt;
		color: var(--ink-soft);
	}
	.row .k {
		overflow-wrap: anywhere;
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
		padding-top: 5px;
	}
	.row.total .k {
		font-weight: 600;
		color: var(--ink);
	}
	.row.gap-top {
		margin-top: 7px;
	}

	.accretive {
		font-family: var(--sans);
		font-size: 8pt;
		font-style: italic;
		color: var(--pos-tx);
		margin: 6px 0 0;
	}

	/* Source prints the run date under the left wing, outside the panels. */
	.runline {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		font-family: var(--sans);
		font-size: 9pt;
		color: var(--muted);
		padding: 0 12px;
	}
	.runline .v {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.note {
		font-family: var(--sans);
		font-size: 8pt;
		color: var(--muted);
		line-height: 1.4;
		margin: 8px 0 0;
	}

	.empty {
		font-family: var(--sans);
		font-size: 10pt;
		color: var(--muted);
		text-align: center;
		margin: 40px 0;
	}
	.empty.small {
		margin: 6px 0;
		text-align: left;
		font-size: 9pt;
	}
</style>
