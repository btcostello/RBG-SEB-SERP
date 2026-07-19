<script lang="ts">
	/**
	 * Legacy Report — E3 Annual Impact on Earnings, Option 3 (section page 5.2-3).
	 * Placeholder: every column awaits the accounting engine — see DATA-GAPS.md.
	 */
	import type { ReportModel } from '../../report-data';
	import EarningsLedgerSheet from './EarningsLedgerSheet.svelte';

	let { report }: { report: ReportModel } = $props();
</script>

<EarningsLedgerSheet
	{report}
	pageNo="5.2-3"
	optionTitle="Option 3 — SERP Benefit Funding Wherewithal Based on COLI Assets"
	closingNote={{
		marker: '*',
		text: 'This table illustrates annual earnings impact of the SERP-PLUS Program. COLI is illustrated to generate credits to earnings in the first year.'
	}}
/>
