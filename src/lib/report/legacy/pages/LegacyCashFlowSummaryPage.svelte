<script lang="ts">
	/**
	 * Legacy Report — D5 Cash Flow Summary, Totals for Life of Plan (source: "D5 CF Summary.pdf"),
	 * section page 4.5. The Earnings Summary section is intentionally omitted (per operator:
	 * redundant to the cash-flow rows).
	 *
	 * Option 1 (Cost Recovery) is derived from the persisted illustration streams
	 * (report.cashFlow): net benefits paid, COLI premiums (over the premium-payment period),
	 * death benefits at life expectancy, net COLI gain/(loss), aggregate cash flow, and cost
	 * recovery. Options 2–4 require additional illustrations (funding strategies 2–4) → gaps.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	let { report }: { report: ReportModel } = $props();

	// Option 1 (Cost Recovery) values from the life-of-plan cash-flow derivation, or null pre-run.
	const cf = $derived(report.cashFlow);
	const opt1 = $derived({
		companyCashFlow: cf?.netBenefitsCompanyCashFlow ?? null,
		coliAssets: cf?.netBenefitsColiAssets ?? null,
		netTotal: cf?.netBenefitsTotal ?? null,
		premiums: cf?.coliPremiums ?? null,
		deathBenefits: cf?.coliDeathBenefits ?? null,
		loansWithdrawals: cf?.coliLoansWithdrawals ?? null,
		netGainLoss: cf?.netColiGainLoss ?? null,
		aggregate: cf?.aggregateCashFlow ?? null,
		costRecovery: cf?.costRecovery ?? null
	});

	type Row = { label: string; mark?: string; v: string | null; strong?: boolean };
	const rows = $derived<Row[]>([
		{ label: 'Net Benefits Paid from Company Cash Flow', mark: '^', v: opt1.companyCashFlow },
		{ label: 'Net Benefits Paid from COLI Assets', v: opt1.coliAssets },
		{ label: 'Net Benefits Paid — Total', v: opt1.netTotal, strong: true },
		{ label: 'COLI Premiums', v: opt1.premiums },
		{ label: 'COLI Death Benefits', v: opt1.deathBenefits },
		{ label: 'COLI Policy Loans and Withdrawals', v: opt1.loansWithdrawals },
		{ label: 'Net COLI Gain / (Loss)', v: opt1.netGainLoss },
		{ label: 'Net Program Aggregate Cash Flow', mark: '*', v: opt1.aggregate },
		{ label: 'COLI Cost Recovery', mark: '*', v: opt1.costRecovery }
	]);
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
					<th>[1]<br />Cost Recovery</th>
					<th>[2]<br />Benefit Funding</th>
					<th>[3]<br />Funding Wherewithal</th>
					<th>[4]<br />Bene Funding + Cost Recov</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.label)}
					<tr class:strong={row.strong}>
						<td class="txt">{row.label}{row.mark ? ` ${row.mark}` : ''}</td>
						<td class="num" class:gap={!row.v}>{row.v ?? '—'}</td>
						<td class="num gap">—</td>
						<td class="num gap">—</td>
						<td class="num gap">—</td>
					</tr>
				{/each}
			</tbody>
		</table>

		<div class="notes">
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
