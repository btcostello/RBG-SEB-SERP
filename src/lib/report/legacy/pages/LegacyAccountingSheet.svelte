<script lang="ts">
	/**
	 * Shared layout for the accounting worksheets (source F1–F4, section pages 6.1 … 6.6).
	 *
	 * ⚠ **Placeholder pages.** All six sheets depend on a GAAP accounting layer the app does not
	 * have — see the "Missing subsystem" note in DATA-GAPS.md. Every figure renders "—"; what is
	 * reproduced is the structure (titles, column groups, row labels, notes) so wiring the numbers
	 * later is a binding exercise rather than a rebuild.
	 *
	 * Deliberately generic: all six sheets are the same shape — a label column, N numeric columns
	 * optionally gathered under group headers, and closing notes. One component beats six
	 * near-identical tables while the contents are all placeholders.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyPageShell from './LegacyPageShell.svelte';
	import type { SheetColumn, SheetRow } from './accounting-sheet-types';

	let {
		report,
		pageNo,
		title,
		subtitle,
		firstColumnHeader = '',
		columns,
		rows,
		notes = []
	}: {
		report: ReportModel;
		pageNo: string;
		title: string;
		subtitle?: string;
		firstColumnHeader?: string;
		columns: SheetColumn[];
		rows: SheetRow[];
		notes?: string[];
	} = $props();

	/** Collapse consecutive columns sharing a group into spanning header cells. */
	const groups = $derived(
		columns.reduce<{ group?: string; groupSub?: string; span: number }[]>((acc, column) => {
			const open = acc[acc.length - 1];
			if (open && open.group === column.group && open.groupSub === column.groupSub) {
				open.span += 1;
			} else {
				acc.push({ group: column.group, groupSub: column.groupSub, span: 1 });
			}
			return acc;
		}, [])
	);
	const hasGroups = $derived(groups.some((g) => g.group !== undefined));

	/** Placeholder until the accounting engine lands — see DATA-GAPS.md. */
	const GAP = '—';
</script>

<LegacyPageShell {report} {pageNo} pageNoSide="right">
	<div class="as-head">
		<div class="company">{report.companyName}</div>
		<h1>{title}</h1>
		{#if subtitle}<div class="subtitle">{subtitle}</div>{/if}
	</div>

	<table>
		<thead>
			{#if hasGroups}
				<tr class="groups">
					<th></th>
					{#each groups as g, i (i)}
						<th colspan={g.span} class="group">
							{#if g.group}{g.group}{#if g.groupSub}<span class="sub">{g.groupSub}</span>{/if}{/if}
						</th>
					{/each}
				</tr>
			{/if}
			<tr>
				<th class="txt">{firstColumnHeader}</th>
				{#each columns as column, i (i)}<th>{column.label}</th>{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row, i (i)}
				{#if row.heading}
					<tr class="heading">
						<td class="txt" colspan={columns.length + 1}>{row.label}</td>
					</tr>
				{:else}
					<tr class:strong={row.strong}>
						<td class="txt" class:indent={row.indent}>
							{row.label}
							{#if row.note}<span class="rownote">{row.note}</span>{/if}
						</td>
						{#each columns.keys() as c (c)}<td class="num gap">{GAP}</td>{/each}
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>

	{#if notes.length > 0}
		<div class="notes">
			{#each notes as note, i (i)}<p>{note}</p>{/each}
		</div>
	{/if}
</LegacyPageShell>

<style>
	.as-head {
		text-align: center;
		margin-bottom: 12px;
	}
	.as-head .company {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 12pt;
		color: var(--ink-soft);
		margin-bottom: 4px;
	}
	.as-head h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 13.5pt;
	}
	.as-head .subtitle {
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
		padding: 1.4px 6px;
	}
	thead th {
		font-size: 6.6pt;
		vertical-align: bottom;
		text-align: right;
	}
	th.group {
		text-align: center;
		font-size: 6.4pt;
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
	}
	td.txt.indent {
		padding-left: 20px;
	}
	td.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	td.gap {
		color: var(--line);
	}
	tr.heading td {
		font-family: var(--serif);
		font-weight: 600;
		color: var(--ink);
		padding-top: 7px;
	}
	tbody tr.strong td {
		font-family: var(--serif);
		font-weight: 600;
		color: var(--ink);
		border-top: 1px solid var(--line);
	}
	.rownote {
		display: block;
		font-size: 6.6pt;
		color: var(--muted);
		font-style: italic;
	}
	.notes {
		margin-top: 10px;
	}
	.notes p {
		font-family: var(--sans);
		font-size: 7.2pt;
		color: var(--muted);
		line-height: 1.35;
		margin-bottom: 3px;
	}
</style>
