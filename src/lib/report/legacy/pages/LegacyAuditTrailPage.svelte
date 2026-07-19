<script lang="ts">
	/**
	 * Legacy Report — F3 Consolidated FASB ASC 715-30 Audit Trail (section page 6.5).
	 * Placeholder — see DATA-GAPS.md.
	 *
	 * Calendar years are real (30 from the plan reference date, matching the earnings ledger);
	 * all nine columns await the accounting layer.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyAccountingSheet from './LegacyAccountingSheet.svelte';

	let { report }: { report: ReportModel } = $props();

	const LEDGER_YEARS = 30;
	const firstYear = $derived(new Date(`${report.legacyRefDate}T00:00:00`).getFullYear());
	const rows = $derived(
		Array.from({ length: LEDGER_YEARS }, (_, i) => ({ label: String(firstYear + i) }))
	);
	const columns = [
		{ label: '[1] Service Cost' },
		{ label: '[2] Prior Service Cost Level Amort.' },
		{ label: '[3] Interest Accrual' },
		{ label: '[4] Total Pension Cost' },
		{ label: '[5] Gross Benefit Payment' },
		{ label: '[6] Annual Unfunded Accrued Pension Cost' },
		{ label: '[7] EOY Unfunded Accrued Pension Cost' },
		{ label: '[8] BOY Unrecog. Prior Service Cost' },
		{ label: '[9] EOY Unrecog. Prior Service Cost' }
	];
</script>

<LegacyAccountingSheet
	{report}
	pageNo="6.5"
	title="Consolidated FASB ASC 715-30 Audit Trail — Calendar Year"
	firstColumnHeader="Cal Year End 12/31"
	{columns}
	{rows}
/>
