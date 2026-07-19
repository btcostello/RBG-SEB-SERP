<script lang="ts">
	/**
	 * Legacy Report — E3 Annual Impact on Earnings, Option 1 (section page 5.2-1).
	 * Placeholder: every column awaits the accounting engine — see DATA-GAPS.md.
	 */
	import type { ReportModel } from '../../report-data';
	import EarningsLedgerSheet from './EarningsLedgerSheet.svelte';

	let { report }: { report: ReportModel } = $props();
</script>

<EarningsLedgerSheet
	{report}
	pageNo="5.2-1"
	optionTitle="Option 1 — Recovery of Net Program Costs from COLI upon Mortality"
	closingNote={{
		marker: '*',
		text: 'This table illustrates annual earnings impact of the SERP-PLUS Program. COLI is illustrated to generate credits to earnings in the second year.'
	}}
/>
