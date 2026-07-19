<script lang="ts">
	/**
	 * Legacy Report — D5 Cash Flow Summary, Totals for Life of Plan (source: "D5 CF Summary.pdf"),
	 * section page 4.5. The Earnings Summary section is intentionally omitted (per operator:
	 * redundant to the cash-flow rows).
	 *
	 * All four options are derived from their own persisted illustration streams
	 * (report.cashFlowByOption): net benefits paid, COLI premiums, death benefits at life
	 * expectancy, policy loans/withdrawals, net COLI gain/(loss), aggregate cash flow, and cost
	 * recovery. An option the run did not design shows "—" down its column.
	 */
	import {
		REPORT_FUNDING_OPTIONS,
		type CashFlowOptionDisplay,
		type ReportModel
	} from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	let { report }: { report: ReportModel } = $props();

	type Row = {
		label: string;
		mark?: string;
		strong?: boolean;
		pick: (cf: CashFlowOptionDisplay) => string;
	};
	const ROWS: Row[] = [
		{
			label: 'Net Benefits Paid from Company Cash Flow',
			mark: '^',
			pick: (cf) => cf.netBenefitsCompanyCashFlow
		},
		{ label: 'Net Benefits Paid from COLI Assets', pick: (cf) => cf.netBenefitsColiAssets },
		{ label: 'Net Benefits Paid — Total', strong: true, pick: (cf) => cf.netBenefitsTotal },
		{ label: 'COLI Premiums', pick: (cf) => cf.coliPremiums },
		{ label: 'COLI Death Benefits', pick: (cf) => cf.coliDeathBenefits },
		{ label: 'COLI Policy Loans and Withdrawals', pick: (cf) => cf.coliLoansWithdrawals },
		{ label: 'Net COLI Gain / (Loss)', pick: (cf) => cf.netColiGainLoss },
		{ label: 'Net Program Aggregate Cash Flow', mark: '*', pick: (cf) => cf.aggregateCashFlow },
		{ label: 'COLI Cost Recovery', mark: '*', pick: (cf) => cf.costRecovery }
	];

	/**
	 * Options designed for this run but with no reportable cash flow — a solve that failed for
	 * any participant invalidates the whole column, so it is suppressed rather than shown.
	 */
	const unsolvedOptions = $derived(
		REPORT_FUNDING_OPTIONS.filter(
			(option) => report.fundingOptions[option.id] && !report.cashFlowByOption[option.id]
		)
	);

	/** One cell per option per row; null renders the "—" gap. */
	const rows = $derived(
		ROWS.map((row) => ({
			...row,
			cells: REPORT_FUNDING_OPTIONS.map((option) => {
				const cf = report.cashFlowByOption[option.id];
				return cf ? row.pick(cf) : null;
			})
		}))
	);
</script>

<LegacyPageShell {report} pageNo="4.5" pageNoSide="right">
	<div class="cf">
		<div class="cf-head">
			<div class="company">{report.companyName}</div>
			<h1>Cash Flow Summary — Totals for Life of Plan</h1>
		</div>

		<table>
			<thead>
				<tr>
					<th></th>
					<th colspan="4" class="group">Benefit Funding Options</th>
				</tr>
				<tr>
					<th class="txt"></th>
					{#each REPORT_FUNDING_OPTIONS as option (option.id)}
						<th>[{option.number}]<br />{option.label}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.label)}
					<tr class:strong={row.strong}>
						<td class="txt">{row.label}{row.mark ? ` ${row.mark}` : ''}</td>
						{#each row.cells as cell, i (REPORT_FUNDING_OPTIONS[i].id)}
							<td class="num" class:gap={!cell}>{cell ?? '—'}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>

		<div class="notes">
			{#if unsolvedOptions.length > 0}
				<p>
					<strong>Not shown:</strong>
					{unsolvedOptions.map((o) => `Option ${o.number}`).join(', ')} could not be solved for
					every participant, so no totals are reported for
					{unsolvedOptions.length > 1 ? 'those columns' : 'that column'}.
				</p>
			{/if}
			<p>
				<sup>*</sup> Generally, the Aggregate Cash Flow target for both Option 1 and Option 4 is zero;
				corresponding Cost Recovery target is 100%.
			</p>
			<p>
				<sup>^</sup> Assumed Mortality at Life Expectancy (generally age 84), for benefit and insurance
				computations.
			</p>
			<p>
				<sup>^</sup> Mortality Table used pursuant to IRC 417(e), for accounting liability &amp; other
				calculations, as required under GAAP.
			</p>
		</div>
	</div>
</LegacyPageShell>

<style>
	.cf-head {
		text-align: center;
		margin-bottom: 16px;
	}
	.cf-head .company {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 12pt;
		color: var(--ink-soft);
		margin-bottom: 5px;
	}
	.cf-head h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 15.5pt;
	}
	table {
		font-size: 8.5pt;
	}
	th,
	td {
		padding: 4px 7px;
	}
	th.group {
		text-align: center;
		font-size: 7pt;
		border-bottom: 1px solid var(--line);
	}
	thead th {
		font-size: 6.8pt;
		vertical-align: bottom;
	}
	tbody tr.strong td {
		font-family: var(--serif);
		font-weight: 600;
		color: var(--ink);
		border-top: 1px solid var(--line);
	}
	td.gap {
		color: var(--line);
	}
	.notes {
		margin-top: 16px;
	}
	.notes p {
		font-family: var(--sans);
		font-size: 8pt;
		color: var(--muted);
		line-height: 1.45;
		margin: 0 0 4px;
	}
</style>
