<script lang="ts">
	/**
	 * Legacy Report — F3 Consolidated FASB ASC 715-30 Audit Trail (section page 6.5).
	 *
	 * All nine columns are live, from the accounting module (`report.auditTrail`). Calendar years
	 * span 30 from the plan reference date, matching the 5.2 earnings ledger. Cells show "—" before
	 * a run or when there are no SERP participants.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyAccountingSheet from './LegacyAccountingSheet.svelte';

	let { report }: { report: ReportModel } = $props();

	const LEDGER_YEARS = 30;
	const firstYear = $derived(new Date(`${report.legacyRefDate}T00:00:00`).getFullYear());
	const rows = $derived(
		Array.from({ length: LEDGER_YEARS }, (_, i) => {
			const year = firstYear + i;
			return { label: String(year), values: report.auditTrail?.byYear[year] };
		})
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
