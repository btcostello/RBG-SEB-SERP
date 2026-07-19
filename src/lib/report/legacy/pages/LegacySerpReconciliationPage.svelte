<script lang="ts">
	/**
	 * Legacy Report — F1 SERP Accounting Entry Worksheet, reconciliation of retirement plan
	 * accounts (section page 6.2). Placeholder — see DATA-GAPS.md.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyAccountingSheet from './LegacyAccountingSheet.svelte';
	import { accountingPeriods, signedColumns } from './accounting-periods';

	let { report }: { report: ReportModel } = $props();
	const columns = $derived(signedColumns(accountingPeriods(report.legacyRefDate)));
</script>

<LegacyAccountingSheet
	{report}
	pageNo="6.2"
	title="SERP Accounting Entry Worksheet — Calendar Year — Consolidated"
	subtitle="Reconciliation of Retirement Plan Accounts"
	{columns}
	rows={[
		{ label: 'Liability for Pension Benefits — beginning of year' },
		{ label: 'To record prior service cost', indent: true },
		{ label: "Add: Current period's accrual", indent: true },
		{ label: 'Liability for Pension Benefits — end of year', strong: true },
		{ label: 'Accumulated other comprehensive income — beginning of year' },
		{ label: 'To record prior service cost (before tax benefit)', indent: true },
		{ label: 'To record tax benefit on prior service cost', indent: true },
		{ label: "Less: Current year's amortization of AOCI", indent: true },
		{ label: "Less: Current year's amortization of tax benefit on AOCI", indent: true },
		{ label: 'Accumulated other comprehensive income — end of year', strong: true }
	]}
/>
