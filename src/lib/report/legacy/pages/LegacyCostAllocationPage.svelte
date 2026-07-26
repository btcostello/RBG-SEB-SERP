<script lang="ts">
	/**
	 * Legacy Report — F4 Pension Expense Allocation by Participant (section page 6.6).
	 *
	 * All five columns are live, from the accounting module (`report.costAllocation`): each SERP
	 * participant's reference-year service cost, prior-service amortisation, interest, total pension
	 * expense, and share of the consolidated total. Cells show "—" before a run.
	 */
	import { type ReportModel } from '../../report-data';
	import LegacyAccountingSheet from './LegacyAccountingSheet.svelte';

	let { report }: { report: ReportModel } = $props();

	const year = $derived(new Date(`${report.legacyRefDate}T00:00:00`).getFullYear());
	/** SERP participants only — a COLI-only life carries no pension expense to allocate. */
	const rows = $derived([
		{ label: 'Totals', strong: true, values: report.costAllocation?.totals },
		...report.legacyCensus.map((row) => ({
			label: row.name,
			indent: true,
			values: report.costAllocation?.byInsuredId[row.insuredId]
		}))
	]);
	const columns = [
		{ label: '[1] Service Cost' },
		{ label: '[2] Prior Service Cost Amortization' },
		{ label: '[3] Interest Accrual' },
		{ label: '[4] Total Pension Expense' },
		{ label: '[5] Total Pension Expense % of Total' }
	];
</script>

<LegacyAccountingSheet
	{report}
	pageNo="6.6"
	title={`Calendar Year ${year} Pension Expense Allocation by Participant`}
	firstColumnHeader="Participant"
	{columns}
	{rows}
/>
