<script lang="ts">
	/**
	 * Legacy Report — F1 SERP Accounting Entry Worksheet, reconciliation of retirement plan accounts
	 * (section page 6.2).
	 *
	 * The same entries as 6.1, arranged as the two account roll-forwards they produce: the liability
	 * and AOCI, each from its opening balance through the period's movements to its close. One
	 * column per period, printed as Debit / (Credit), so credits carry parentheses.
	 *
	 * The first month and the first calendar year both open at plan inception, so both start at zero;
	 * only the second calendar year opens on a real balance, carried from the first year's close.
	 *
	 * AOCI is shown net of its deferred tax benefit, which is why the tax lines sit inside that
	 * roll-forward rather than beside it.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyAccountingSheet from './LegacyAccountingSheet.svelte';
	import { accountingPeriods, signedColumns } from './accounting-periods';
	import { signedCells } from './worksheet-cells';

	let { report }: { report: ReportModel } = $props();
	const columns = $derived(signedColumns(accountingPeriods(report.legacyRefDate)));
	const w = $derived(report.worksheets);
</script>

<LegacyAccountingSheet
	{report}
	pageNo="6.2"
	title="SERP Accounting Entry Worksheet — Calendar Year — Consolidated"
	subtitle="Reconciliation of Retirement Plan Accounts"
	{columns}
	rows={[
		{
			label: 'Liability for Pension Benefits — beginning of year',
			values: signedCells(w?.liabilityBoy)
		},
		{
			label: 'To record prior service cost',
			indent: true,
			values: signedCells(w?.recordPriorServiceCostSigned)
		},
		{
			label: "Add: Current period's accrual",
			indent: true,
			values: signedCells(w?.accrualSigned)
		},
		{
			label: 'Liability for Pension Benefits — end of year',
			strong: true,
			values: signedCells(w?.liabilityEoy)
		},
		{
			label: 'Accumulated other comprehensive income — beginning of year',
			values: signedCells(w?.aociBoy)
		},
		{
			label: 'To record prior service cost (before tax benefit)',
			indent: true,
			values: signedCells(w?.initialPriorServiceCost)
		},
		{
			label: 'To record tax benefit on prior service cost',
			indent: true,
			values: signedCells(w?.recordPriorServiceCostTaxSigned)
		},
		{
			label: "Less: Current year's amortization of AOCI",
			indent: true,
			values: signedCells(w?.amortizationSigned)
		},
		{
			label: "Less: Current year's amortization of tax benefit on AOCI",
			indent: true,
			values: signedCells(w?.amortizationTaxSigned)
		},
		{
			label: 'Accumulated other comprehensive income — end of year',
			strong: true,
			values: signedCells(w?.aociEoy)
		}
	]}
	notes={[
		'Amounts are shown as Debit / (Credit). The liability and accumulated other comprehensive income are both credit balances, so they carry parentheses.',
		'The first month and the first calendar year both begin at plan inception and therefore open at zero. Entries recorded once at inception show as N/A in later periods.',
		'Accumulated other comprehensive income is presented net of its deferred tax benefit.'
	]}
/>
