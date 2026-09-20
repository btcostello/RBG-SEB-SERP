<script lang="ts">
	/**
	 * Legacy Report — F1 SERP Accounting Entry Worksheet, notes to the financial statements
	 * (section page 6.3-1). Wired from `report.worksheets`, which puts the per-plan-year projection
	 * onto this sheet's three-period axis.
	 *
	 * ## Restated on the post-FAS 158 basis (2026-09-20)
	 *
	 * The source report's version of this page is pre-FAS 158: it runs funded status, then the
	 * unrecognized items, and lands on "Prepaid / (Unfunded Accrued) Pension Cost" as the
	 * balance-sheet amount. FAS 158 (2006, now ASC 715-20) ended that presentation — the full
	 * funded status goes on the balance sheet and the unrecognized items go to AOCI instead of
	 * being netted against the liability.
	 *
	 * That mattered here because pages 6.1 and 6.2 are already post-158: they debit AOCI and credit
	 * the full liability. So the source packet stated two different balance sheets, and the
	 * arithmetic showed it — in the sample, 6.1/6.2 carry a 3,862,213 liability with 2,991,635 in
	 * AOCI, while 6.3 reported 75,333, which is exactly 3,862,213 less the 3,786,880 of
	 * unamortized prior service cost. This page now agrees with the entries that produce it.
	 *
	 * What changed, concretely:
	 * - "Prepaid / (Unfunded Accrued) Pension Cost" is gone as a balance-sheet line. The recognized
	 *   liability IS the funded status. (The accrued-cost measure still appears on the 6.5 audit
	 *   trail, where it is an internal roll-forward rather than a balance-sheet amount.)
	 * - The unrecognized items became an "Amounts Recognized in AOCI" block, shown before and after
	 *   its tax effect, since the after-tax number is what actually hits equity.
	 * - "Unrecognized Transition Obligation" is dropped: it is a pre-158 concept, and transition
	 *   obligations from the 1980s adoption of FAS 87 are long since fully amortized.
	 * - The deferred tax asset on the obligation is stated, because it is the balance the 6.1
	 *   entries build and nothing else on the packet showed it.
	 *
	 * Rows that are structurally zero (plan assets, expected return, actuarial gain/loss) are kept
	 * and labelled rather than dropped — a reader looking for them should see them at zero with a
	 * reason, not wonder whether they were omitted.
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
	pageNo="6.3-1"
	title="SERP Accounting Entry Worksheet — Calendar Year — Consolidated"
	subtitle="Notes to the Financial Statements (FASB ASC 715-20)"
	{columns}
	rows={[
		{ label: 'Notes to Balance Sheet', heading: true },
		{ label: 'Projected Benefit Obligation', values: signedCells(w?.projectedBenefitObligation) },
		{
			label: 'Plan Assets at Fair Market Value',
			note: 'Unfunded plan — COLI is not a plan asset',
			values: signedCells(w?.planAssets)
		},
		{
			label: 'Funded Status — Net Liability Recognized',
			strong: true,
			note: 'Recognized in full on the balance sheet (ASC 715-20)',
			values: signedCells(w?.fundedStatus)
		},
		{ label: 'Amounts Recognized in Accumulated Other Comprehensive Income', heading: true },
		{ label: 'Net Prior Service Cost', indent: true, values: signedCells(w?.netPriorServiceCost) },
		{
			label: 'Net Actuarial Gain / (Loss)',
			indent: true,
			values: signedCells(w?.netActuarialGainLoss)
		},
		{
			label: 'Accumulated Other Comprehensive Income — Before Tax',
			strong: true,
			values: signedCells(w?.aociBeforeTax)
		},
		{ label: 'Deferred Tax Benefit on AOCI', indent: true, values: signedCells(w?.aociTaxBenefit) },
		{
			label: 'Accumulated Other Comprehensive Income — Net of Tax',
			strong: true,
			values: signedCells(w?.aociNetOfTax)
		},
		{ label: 'Related Deferred Tax Asset', heading: true },
		{
			label: 'Deferred Tax Asset on Benefit Obligation',
			note: 'Benefits are deductible when paid, so the obligation is a temporary difference',
			values: signedCells(w?.deferredTaxAsset)
		},
		{ label: 'Notes to Income Statement', heading: true },
		{ label: 'Service Cost', indent: true, values: signedCells(w?.serviceCost) },
		{ label: 'Interest Cost', indent: true, values: signedCells(w?.interestCost) },
		{
			label: 'Expected Return on Plan Assets',
			indent: true,
			values: signedCells(w?.expectedReturnOnAssets)
		},
		{
			label: 'Amortization of Prior Service Cost',
			indent: true,
			values: signedCells(w?.amortization)
		},
		{
			label: 'Amortization of Net Gain / (Loss)',
			indent: true,
			values: signedCells(w?.netActuarialGainLoss)
		},
		{
			label: 'Net Periodic Pension Cost',
			strong: true,
			values: signedCells(w?.netPeriodicPensionCost)
		}
	]}
	notes={[
		'Presented on the post-FASB Statement 158 basis (ASC 715-20): the funded status is recognized on the balance sheet in full, and unamortized prior service cost is carried in accumulated other comprehensive income rather than netted against the liability.',
		'Plan assets and expected return on plan assets are zero by construction. A nonqualified plan is unfunded, and company-owned life insurance is not a plan asset — see Appendix D.',
		'Net actuarial gain / (loss) is zero throughout. A projection has no experience to differ from its own assumptions; gains and losses arise once the plan is in force and actual results diverge.',
		'Deferred tax entries shown relate only to the nonqualified pension liability. The Company should apply its own projected effective federal, state, and local rate.',
		'The entries on these worksheets are illustrative and are not tax, accounting, or legal advice. Consult your professional advisors.'
	]}
/>
