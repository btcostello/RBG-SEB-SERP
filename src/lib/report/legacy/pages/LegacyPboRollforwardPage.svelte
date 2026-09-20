<script lang="ts">
	/**
	 * Legacy Report — Projected Benefit Obligation Roll-Forward (section page 6.3-2).
	 *
	 * Not in the source report, added because it is the table a CFO looks for first: how the
	 * obligation builds up, what works it back down, and what sits on the balance sheet beside it.
	 * The audit trail on 6.5 already carries every component, but as a column of annual costs
	 * rather than as the reconciliation an accountant reads.
	 *
	 * Benefits paid are shown as a deduction, because they are the only thing that reduces the
	 * obligation — nothing else on the roll-forward does. The two balance columns then give the
	 * balance-sheet position: AOCI before tax (the unamortised prior service cost) and the deferred
	 * tax asset on the obligation.
	 *
	 * This is a projection of a hypothetical plan, not a record of one. Actual figures come from
	 * the plan's administrator.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyAccountingSheet from './LegacyAccountingSheet.svelte';

	let { report }: { report: ReportModel } = $props();

	const LEDGER_YEARS = 30;
	const firstYear = $derived(new Date(`${report.legacyRefDate}T00:00:00`).getFullYear());
	const rows = $derived(
		Array.from({ length: LEDGER_YEARS }, (_, i) => {
			const year = firstYear + i;
			return { label: String(year), values: report.pboRollforward?.byYear[year] };
		})
	);
	const columns = [
		{ label: '[1] Obligation — Beginning of Year' },
		{ label: '[2] Service Cost' },
		{ label: '[3] Interest Cost' },
		{ label: '[4] Benefits Paid' },
		{ label: '[5] Obligation — End of Year' },
		{ label: '[6] AOCI (Before Tax)' },
		{ label: '[7] Deferred Tax Asset' }
	];
</script>

<LegacyAccountingSheet
	{report}
	pageNo="6.3-2"
	title="Projected Benefit Obligation Roll-Forward — Calendar Year"
	subtitle="Reconciliation of the Benefit Obligation and Related Balance Sheet Amounts"
	firstColumnHeader="Cal Year End 12/31"
	{columns}
	{rows}
	notes={[
		'Columns [1] through [5] reconcile the projected benefit obligation: the beginning balance, plus the benefit earned and the interest accrued during the year, less the benefits actually paid, equals the ending balance.',
		'Column [6] is the unamortized prior service cost carried in accumulated other comprehensive income, before its tax effect. Column [7] is the deferred tax asset on the obligation — the benefit is deductible when paid rather than when accrued, so the whole obligation is a temporary difference.',
		'There are no plan assets. A nonqualified plan is unfunded, and company-owned life insurance is not a plan asset — see Appendix D.',
		'Figures are projected for a hypothetical plan on the stated assumptions. They illustrate how the obligation is expected to behave; they are not a substitute for the valuation a plan administrator or actuary will produce once the plan is in force.'
	]}
	dense
/>
