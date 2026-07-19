<script lang="ts">
	/**
	 * Legacy Report — F1 SERP Accounting Entry Worksheet, notes to the financial statements
	 * (section page 6.3). Placeholder — see DATA-GAPS.md.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyAccountingSheet from './LegacyAccountingSheet.svelte';
	import { accountingPeriods, signedColumns } from './accounting-periods';

	let { report }: { report: ReportModel } = $props();
	const columns = $derived(signedColumns(accountingPeriods(report.legacyRefDate)));
</script>

<LegacyAccountingSheet
	{report}
	pageNo="6.3"
	title="SERP Accounting Entry Worksheet — Calendar Year — Consolidated"
	{columns}
	rows={[
		{ label: 'Notes to Balance Sheet', heading: true },
		{ label: 'Projected Benefit Obligation' },
		{ label: 'Plan Assets at Fair Market Value' },
		{ label: 'Funded Status', strong: true },
		{ label: 'Unrecognized Transition Obligation' },
		{ label: 'Unrecognized Prior Service Cost' },
		{ label: 'Unrecognized Gain / (Loss)' },
		{ label: 'Prepaid / (Unfunded Accrued) Pension Cost', strong: true },
		{ label: 'Notes to Income Statement', heading: true },
		{ label: 'Service Cost', indent: true },
		{ label: 'Interest Cost', indent: true },
		{ label: 'Expected Return on Assets', indent: true },
		{ label: 'Amortization of Transition Obligation', indent: true },
		{ label: 'Amortization of Prior Service Cost', indent: true },
		{ label: 'Amortization of Gain / (Loss)', indent: true },
		{ label: 'Pension Expense', strong: true }
	]}
/>
