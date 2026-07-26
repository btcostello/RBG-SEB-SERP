<script lang="ts">
	/**
	 * Shared layout for the Appendix B face-vs-survivor analysis (source "G2 Face Survivor.pdf"),
	 * one sheet per funding option.
	 *
	 * Asks whether the COLI death benefit would cover the after-tax survivor liability if a
	 * participant died — now, and in the year before normal retirement age. The ratio column is
	 * the answer: under 100% the policy does not cover the liability at that point.
	 *
	 * Survivor and after-tax columns are pure derivations and show pre-run; the face and ratio
	 * columns come from the option's illustration and are results-gated.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';

	let {
		report,
		pageNo,
		strategyId,
		optionTitle,
		faceColumnLabel,
		note
	}: {
		report: ReportModel;
		pageNo: string;
		/** Funding strategy id whose face amounts this sheet analyses. */
		strategyId: string;
		/** e.g. "Cost Recovery Option 1". */
		optionTitle: string;
		/** Second line of the face column group, e.g. "Cost Recovery Option". */
		faceColumnLabel: string;
		note: string;
	} = $props();

	const analysis = $derived(report.faceSurvivorByOption[strategyId]);
	const dash = (v: string | null) => v ?? '—';
</script>

<LegacyPageShell {report} {pageNo} numbered={false} pageNoSide="right">
	<div class="fs-head">
		<div class="company">{report.companyName}</div>
		<h1>
			Analysis of COLI Face Amount ({optionTitle}) to Pre-Retirement Survivor Benefit Liability
		</h1>
	</div>

	{#if analysis}
		<table>
			<thead>
				<tr class="groups">
					<th colspan="3"></th>
					<th colspan="2" class="group">Total Survivor Benefit Payable</th>
					<th colspan="2" class="group">After-tax Total Survivor Benefit Payable</th>
					<th colspan="2" class="group">COLI Face Amount<span class="sub">{faceColumnLabel}</span></th>
					<th colspan="2" class="group">
						Ratio of COLI Face Amount<span class="sub">to After-tax Survivor Benefit</span>
					</th>
				</tr>
				<tr>
					<th class="txt">Participant</th>
					<th>Age</th>
					<th>NRA</th>
					<th>Current Year</th>
					<th>NRA − 1</th>
					<th>Current Year</th>
					<th>NRA − 1</th>
					<th>Current Year</th>
					<th>NRA − 1</th>
					<th>Current Year</th>
					<th>NRA − 1</th>
				</tr>
			</thead>
			<tbody>
				<tr class="totals">
					<td class="txt">Totals</td>
					<td></td>
					<td></td>
					<td class="num">{analysis.totalSurvivorCurrent}</td>
					<td></td>
					<td class="num">{analysis.totalAfterTaxCurrent}</td>
					<td></td>
					<td class="num" class:gap={!analysis.totalFaceCurrent}>
						{dash(analysis.totalFaceCurrent)}
					</td>
					<td></td>
					<td class="num" class:gap={!analysis.totalRatioCurrent}>
						{dash(analysis.totalRatioCurrent)}
					</td>
					<td></td>
				</tr>
				<!-- Keyed by id, not name: names are not unique, and a duplicate key throws. -->
				{#each analysis.rows as row (row.insuredId)}
					<tr>
						<td class="txt">{row.name}</td>
						<td class="num">{row.age}</td>
						<td class="num">{row.nra}</td>
						<td class="num">{row.survivorCurrent}</td>
						<td class="num">{row.survivorAtNra}</td>
						<td class="num">{row.afterTaxCurrent}</td>
						<td class="num">{row.afterTaxAtNra}</td>
						<td class="num" class:gap={!row.faceCurrent}>{dash(row.faceCurrent)}</td>
						<td class="num" class:gap={!row.faceAtNra}>{dash(row.faceAtNra)}</td>
						<td class="num" class:gap={!row.ratioCurrent}>{dash(row.ratioCurrent)}</td>
						<td class="num" class:gap={!row.ratioAtNra}>{dash(row.ratioAtNra)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}

	<div class="notes"><p>{note}</p></div>
</LegacyPageShell>

<style>
	.fs-head {
		text-align: center;
		margin-bottom: 12px;
	}
	.fs-head .company {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 12pt;
		color: var(--ink-soft);
		margin-bottom: 4px;
	}
	.fs-head h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 12pt;
		line-height: 1.3;
	}
	table {
		font-size: 7.4pt;
	}
	th,
	td {
		padding: 1.6px 5px;
	}
	thead th {
		font-size: 6.4pt;
		vertical-align: bottom;
		text-align: right;
	}
	th.group {
		text-align: center;
		border-bottom: 1px solid var(--line);
	}
	th.group .sub {
		display: block;
		font-weight: 400;
		color: var(--muted);
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
		margin-top: 10px;
	}
	.notes p {
		font-family: var(--sans);
		font-size: 7.2pt;
		color: var(--muted);
		line-height: 1.4;
	}
</style>
