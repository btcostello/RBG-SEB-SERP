<script lang="ts">
	/**
	 * Legacy Report — G3 year-by-year option ledger (Appendix C).
	 *
	 * One component serves all eight sheets: four funding options × two year slices, driven by
	 * registry props. The source paginates at plan years 1–21 and 22–45; a longer stream than
	 * that is not displayed, which matches the source's own fixed window — the totals row is
	 * life-of-program regardless of what the sheet shows.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	/**
	 * Everything but `report` is supplied through the registry's `props`, so all of it is
	 * optional here — that keeps this assignable to the registry's `Component<{ report }>` type.
	 * The defaults render an empty sheet rather than crashing if an entry is misconfigured.
	 */
	let {
		report,
		pageNo = '',
		strategyId = '',
		optionTitle = '',
		fromYear = 1,
		toYear = 0,
		showTotals = true
	}: {
		report: ReportModel;
		pageNo?: string;
		strategyId?: string;
		optionTitle?: string;
		fromYear?: number;
		toYear?: number;
		/** The source repeats the totals row on the first sheet of each option only. */
		showTotals?: boolean;
	} = $props();

	const ledger = $derived(report.ledgerByOption[strategyId]);
	const rows = $derived(
		(ledger?.rows ?? []).filter((row) => row.planYear >= fromYear && row.planYear <= toYear)
	);

	const COLUMNS = [
		{ n: 1, label: 'Gross Benefits Payable', key: 'grossBenefits' },
		{ n: 2, label: 'Benefit Tax Deduction', key: 'taxDeduction' },
		{ n: 3, label: 'Net Benefits Paid', key: 'netBenefitsPaid' },
		{ n: 4, label: 'Net Benefits Paid from Company Cash Flow', key: 'netFromCompanyCashFlow' },
		{ n: 5, label: 'Net Benefits Paid from COLI Assets', key: 'netFromColiAssets' },
		{ n: 6, label: 'COLI Premiums', key: 'coliPremiums' },
		{ n: 7, label: 'COLI Death Proceeds Received', key: 'coliDeathProceeds' },
		{ n: 8, label: 'COLI Loans and Withdrawals', key: 'coliLoansWithdrawals' },
		{ n: 9, label: 'COLI Cash Surrender Value', key: 'coliCashSurrenderValue' },
		{ n: 10, label: 'COLI Face Amount', key: 'coliFaceAmount' }
	] as const;
</script>

<LegacyPageShell {report} {pageNo} numbered={false} pageNoSide="right">
	<div class="ol-head">
		<div class="company">{report.companyName}</div>
		<h1>{optionTitle}</h1>
	</div>

	<table>
		<thead>
			<tr class="colno">
				<th></th>
				{#each COLUMNS as column (column.n)}<th>[{column.n}]</th>{/each}
			</tr>
			<tr>
				<th class="txt">Plan Year</th>
				{#each COLUMNS as column (column.n)}<th>{column.label}</th>{/each}
			</tr>
		</thead>
		<tbody>
			{#if showTotals && ledger}
				<tr class="totals">
					<td class="txt">Totals</td>
					{#each COLUMNS as column (column.n)}
						<td class="num">{ledger.totals[column.key]}</td>
					{/each}
				</tr>
			{/if}
			{#each rows as row (row.planYear)}
				<tr>
					<td class="txt">{row.planYear}</td>
					{#each COLUMNS as column (column.n)}<td class="num">{row[column.key]}</td>{/each}
				</tr>
			{/each}
			{#if rows.length === 0}
				<tr>
					<td class="txt empty" colspan={COLUMNS.length + 1}>
						No projected plan years in this range — run the model to populate the ledger.
					</td>
				</tr>
			{/if}
		</tbody>
	</table>
</LegacyPageShell>

<style>
	.ol-head {
		text-align: center;
		margin-bottom: 12px;
	}
	.ol-head .company {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 12pt;
		color: var(--ink-soft);
		margin-bottom: 4px;
	}
	.ol-head h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 12.5pt;
	}
	table {
		font-size: 7.2pt;
		/* Ten currency columns exceed a portrait sheet's width. The sheet is registered
		   landscape, which gives them room; constraining the width too means that if anything
		   renders this portrait, columns compress instead of clipping off the page edge. */
		width: 100%;
		table-layout: auto;
	}
	th,
	td {
		padding: 1px 5px;
	}
	thead th {
		font-size: 6.3pt;
		vertical-align: bottom;
		text-align: right;
	}
	thead tr.colno th {
		font-size: 6.2pt;
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
	tbody tr.totals td {
		font-family: var(--serif);
		font-weight: 600;
		color: var(--ink);
		border-bottom: 1px solid var(--line);
	}
	td.empty {
		font-style: italic;
		color: var(--muted);
		text-align: center;
	}
</style>
