<script lang="ts">
	/**
	 * Legacy Report — F1 SERP Accounting Entry Worksheet, journal entries (section page 6.1).
	 * Placeholder: all amounts await the GAAP accounting layer — see DATA-GAPS.md.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyAccountingSheet from './LegacyAccountingSheet.svelte';
	import { accountingPeriods, debitCreditColumns } from './accounting-periods';

	let { report }: { report: ReportModel } = $props();
	const columns = $derived(debitCreditColumns(accountingPeriods(report.legacyRefDate)));
</script>

<LegacyAccountingSheet
	{report}
	pageNo="6.1"
	title="SERP Accounting Entry Worksheet — Calendar Year — Consolidated"
	{columns}
	rows={[
		{ label: 'Initial Entries', heading: true },
		{ label: 'Accumulated other comprehensive income (AOCI)' },
		{ label: 'Liability for pension benefits', indent: true,
		  note: 'To record prior service cost of retirement obligations — before tax benefit' },
		{ label: 'Deferred Tax Asset' },
		{ label: 'Deferred tax benefit — AOCI', indent: true,
		  note: 'To record tax benefit on initial prior service cost (Note 1)' },
		{ label: 'Annual Entries', heading: true },
		{ label: 'Pension Expense' },
		{ label: 'Liability for Pension Benefits', indent: true,
		  note: "To record current period's service and interest cost (Note 2)" },
		{ label: 'Deferred Tax Asset' },
		{ label: 'Deferred Income Tax Expense', indent: true,
		  note: "To record deferred tax benefit on current year's pension expense (Note 1)" },
		{ label: 'Pension Expense' },
		{ label: 'Accumulated other comprehensive income (AOCI)', indent: true,
		  note: "To record current year's amortization of prior service cost" },
		{ label: 'Deferred Tax Benefit — AOCI' },
		{ label: 'Deferred Income Tax Expense', indent: true,
		  note: "To record tax benefit of current year's amortization of prior service cost (Note 1)" }
	]}
	notes={[
		'This worksheet provides suggested accounting entries but should not be considered tax or accounting advice.'
	]}
/>
