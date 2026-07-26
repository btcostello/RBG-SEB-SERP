<script lang="ts">
	/**
	 * Shared layout for the four "Annual Impact on Earnings — Summary" ledger sheets
	 * (source: "E3 Earnings Imp Ledger.pdf", section pages 5.2-1 … 5.2-4) — one per funding
	 * option, identical in structure and differing only in title, page number, and closing note.
	 *
	 * **All five columns are live**, from the accounting module: the SERP columns [1][2][3] via
	 * `report.earningsLedgerSerp` (option-independent), and COLI [4] + combined [5] via
	 * `report.earningsLedgerByOption[optionId]`. Columns show "—" before a run; the per-option
	 * columns also show "—" when that option's solve was infeasible (the SERP columns still show).
	 * The `**` mortality-weighting footnote is not yet applied (death-at-LE basis).
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	let {
		report,
		pageNo,
		optionId,
		optionTitle,
		closingNote
	}: {
		report: ReportModel;
		pageNo: string;
		/** Funding strategy id this sheet displays — keys columns [4]/[5] into the accounting series. */
		optionId: string;
		/** e.g. "Option 1 - Recovery of Net Program Costs from COLI upon Mortality". */
		optionTitle: string;
		/** The per-option note above the shared footnotes (marked * or ~ in the source). */
		closingNote: { marker: string; text: string };
	} = $props();

	/**
	 * 30 calendar years from the plan effective date (falling back to the valuation date when no
	 * effective date is set) — the same reference the census and projections pages key off, so the
	 * ledger lines up with them. Totals cover the whole program, not just these years.
	 */
	const LEDGER_YEARS = 30;
	const firstYear = $derived(new Date(`${report.legacyRefDate}T00:00:00`).getFullYear());
	const years = $derived(Array.from({ length: LEDGER_YEARS }, (_, i) => firstYear + i));

	/** SERP columns [1][2][3] — option-independent; undefined pre-run / when there are no SERP lives. */
	const serp = $derived(report.earningsLedgerSerp);
	/** COLI [4] + combined [5] for this option; undefined pre-run / when the option is suppressed. */
	const opt = $derived(report.earningsLedgerByOption?.[optionId]);
	/** A value once run (falling back to "0" past program end), else the placeholder "—". */
	const val = (map: Record<number, string> | undefined, year: number): string =>
		map ? (map[year] ?? '0') : GAP;

	/** Placeholder for a column with no data yet (pre-run, or a suppressed option). */
	const GAP = '—';
</script>

<LegacyPageShell {report} {pageNo} pageNoSide="right">
	<div class="el-head">
		<div class="company">{report.companyName}</div>
		<h1>Annual Impact on Earnings — Summary</h1>
		<div class="option">{optionTitle}</div>
	</div>

	<table>
		<thead>
			<tr class="colno">
				<th></th>
				<th>[1]</th>
				<th>[2]</th>
				<th>[3]</th>
				<th>[4]</th>
				<th>[5]</th>
			</tr>
			<tr>
				<th class="txt">Calendar Year Ending 12/31</th>
				<th>Pre-Tax SERP Earnings Impact</th>
				<th>Benefit Tax Deduction</th>
				<th>Net SERP Earnings Impact <sup>**</sup></th>
				<th>Hypothetical COLI Earnings Impact</th>
				<th>Combined Earnings Impact</th>
			</tr>
		</thead>
		<tbody>
			<tr class="totals">
				<td class="txt">Totals <sup>^</sup></td>
				<td class="num" class:gap={!serp}>{serp ? serp.col1Total : GAP}</td>
				<td class="num" class:gap={!serp}>{serp ? serp.col2Total : GAP}</td>
				<td class="num" class:gap={!serp}>{serp ? serp.col3Total : GAP}</td>
				<td class="num" class:gap={!opt}>{opt ? opt.coliTotal : GAP}</td>
				<td class="num" class:gap={!opt}>{opt ? opt.combinedTotal : GAP}</td>
			</tr>
			{#each years as year (year)}
				<tr>
					<td class="txt">{year}</td>
					<td class="num" class:gap={!serp}>{val(serp?.col1ByYear, year)}</td>
					<td class="num" class:gap={!serp}>{val(serp?.col2ByYear, year)}</td>
					<td class="num" class:gap={!serp}>{val(serp?.col3ByYear, year)}</td>
					<td class="num" class:gap={!opt}>{val(opt?.coliByYear, year)}</td>
					<td class="num" class:gap={!opt}>{val(opt?.combinedByYear, year)}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<div class="notes">
		<p><sup>{closingNote.marker}</sup> {closingNote.text}</p>
		<p>
			<sup>**</sup> Reflects impact of actuarial mortality projections required under GAAP Accounting;
			the projected proportion of plan participants living at the beginning of the year of average
			life expectancy is not yet computed.
		</p>
		<p>
			<sup>^</sup> Represents Total over the life of the program, not limited to the {LEDGER_YEARS}
			years displayed.
		</p>
	</div>
</LegacyPageShell>

<style>
	.el-head {
		text-align: center;
		margin-bottom: 12px;
	}
	.el-head .company {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 12pt;
		color: var(--ink-soft);
		margin-bottom: 4px;
	}
	.el-head h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 14pt;
	}
	.el-head .option {
		font-family: var(--sans);
		font-size: 9pt;
		color: var(--ink-soft);
		margin-top: 3px;
	}
	table {
		font-size: 7.6pt;
	}
	th,
	td {
		/* 31 body rows plus three footnotes fill the sheet; this keeps it inside one page. */
		padding: 1px 6px;
	}
	thead th {
		font-size: 6.6pt;
		vertical-align: bottom;
		text-align: right;
	}
	thead tr.colno th {
		font-size: 6.4pt;
		color: var(--muted);
		border-bottom: none;
		padding-bottom: 0;
	}
	th.txt,
	td.txt {
		text-align: left;
		white-space: nowrap;
	}
	td.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	td.gap {
		color: var(--line);
	}
	tbody tr.totals td {
		font-family: var(--serif);
		font-weight: 600;
		color: var(--ink);
		border-bottom: 1px solid var(--line);
	}
	.notes {
		margin-top: 8px;
	}
	.notes p {
		font-family: var(--sans);
		font-size: 7.2pt;
		color: var(--muted);
		line-height: 1.35;
		margin-bottom: 3px;
	}
</style>
