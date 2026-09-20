<script lang="ts">
	/**
	 * Legacy Report — F1 SERP Accounting Entry Worksheet, journal entries (section page 6.1).
	 *
	 * Wired from `report.worksheets`, which puts the per-plan-year projection onto this sheet's
	 * three-period axis. Every line pairs a debit with its credit, so the two rows of a pair carry
	 * the same amount on opposite sides.
	 *
	 * The source report stops after the accrual entries, which leaves the story half told: the
	 * liability and the deferred tax asset are built up and never worked off. The "Benefit Payment
	 * Entries" block closes the loop — paying a benefit draws the liability down, and because a
	 * nonqualified benefit is deductible when PAID rather than when accrued, the payment is also when
	 * the deferred tax asset unwinds into a current deduction. For a CFO that timing is the point,
	 * not a footnote.
	 *
	 * Payroll tax is deliberately not modelled. Nonqualified deferred compensation is subject to FICA
	 * under the special timing rule of section 3121(v)(2) — generally at vesting rather than at
	 * payment — but the amount depends on each participant's wage base in the vesting year, which is
	 * the administrator's record rather than anything this tool projects. It is noted instead.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyAccountingSheet from './LegacyAccountingSheet.svelte';
	import { accountingPeriods, debitCreditColumns } from './accounting-periods';
	import { creditCells, debitCells } from './worksheet-cells';

	let { report }: { report: ReportModel } = $props();
	const columns = $derived(debitCreditColumns(accountingPeriods(report.legacyRefDate)));
	const w = $derived(report.worksheets);
</script>

<LegacyAccountingSheet
	{report}
	pageNo="6.1"
	title="SERP Accounting Entry Worksheet — Calendar Year — Consolidated"
	{columns}
	rows={[
		{ label: 'Initial Entries', heading: true },
		{
			label: 'Accumulated other comprehensive income (AOCI)',
			values: debitCells(w?.initialPriorServiceCost)
		},
		{
			label: 'Liability for pension benefits',
			indent: true,
			note: 'To record prior service cost of retirement obligations — before tax benefit',
			values: creditCells(w?.initialPriorServiceCost)
		},
		{ label: 'Deferred Tax Asset', values: debitCells(w?.initialPriorServiceCostTax) },
		{
			label: 'Deferred tax benefit — AOCI',
			indent: true,
			note: 'To record tax benefit on initial prior service cost (Note 1)',
			values: creditCells(w?.initialPriorServiceCostTax)
		},

		{ label: 'Annual Entries', heading: true },
		{ label: 'Pension Expense', values: debitCells(w?.accrual) },
		{
			label: 'Liability for Pension Benefits',
			indent: true,
			note: "To record current period's service and interest cost (Note 2)",
			values: creditCells(w?.accrual)
		},
		{ label: 'Deferred Tax Asset', values: debitCells(w?.accrualTax) },
		{
			label: 'Deferred Income Tax Expense',
			indent: true,
			note: "To record deferred tax benefit on current year's pension expense (Note 1)",
			values: creditCells(w?.accrualTax)
		},
		{ label: 'Pension Expense', values: debitCells(w?.amortization) },
		{
			label: 'Accumulated other comprehensive income (AOCI)',
			indent: true,
			note: "To record current year's amortization of prior service cost",
			values: creditCells(w?.amortization)
		},
		{ label: 'Deferred Tax Benefit — AOCI', values: debitCells(w?.amortizationTax) },
		{
			label: 'Deferred Income Tax Expense',
			indent: true,
			note: "To record tax benefit of current year's amortization of prior service cost (Note 1)",
			values: creditCells(w?.amortizationTax)
		},

		{ label: 'Benefit Payment Entries', heading: true },
		{ label: 'Liability for Pension Benefits', values: debitCells(w?.benefitsPaid) },
		{
			label: 'Cash',
			indent: true,
			note: 'To record benefit payments made to participants during the period',
			values: creditCells(w?.benefitsPaid)
		},
		{ label: 'Current Income Tax Expense', values: debitCells(w?.benefitsPaidTax) },
		{
			label: 'Deferred Tax Asset',
			indent: true,
			note: 'To release the deferred tax asset as the benefit becomes deductible on payment (Note 6)',
			values: creditCells(w?.benefitsPaidTax)
		}
	]}
	notes={[
		'This worksheet provides suggested accounting entries but should not be considered tax or accounting advice.',
		'1. Deferred tax entries are shown at the Company’s corporate rate and relate only to the nonqualified pension liability. The Company should apply its own projected effective federal, state, and local rate.',
		'2. Initial entries are recorded once, at plan inception, and therefore show as N/A in later periods.',
		'6. Benefit payments are deductible to the Company when paid, not when accrued. The deferred tax asset built up by the annual entries is released in the year a benefit is paid — the year the Company takes the deduction.',
		'Payroll taxes are not shown. Nonqualified deferred compensation is generally subject to FICA under the special timing rule of Internal Revenue Code section 3121(v)(2) — when the benefit vests rather than when it is paid — and the amount turns on each participant’s wage base in that year. The plan administrator determines it.'
	]}
/>
