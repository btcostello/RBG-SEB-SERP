<script lang="ts">
	/**
	 * Legacy Report — E3 Annual Impact on Earnings, Option 3 (section page 5.2-3).
	 * Column [4] (COLI earnings impact) is live; the SERP columns await the accounting engine.
	 */
	import type { ReportModel } from '../../report-data';
	import EarningsLedgerSheet from './EarningsLedgerSheet.svelte';

	let { report }: { report: ReportModel } = $props();
</script>

<EarningsLedgerSheet
	{report}
	pageNo="5.2-3"
	optionId="premium-deposit"
	optionTitle="Option 3 — SERP Benefit Funding Wherewithal Based on COLI Assets"
	closingNote={{
		marker: '*',
		text: 'This table illustrates annual earnings impact of the SERP-PLUS Program. COLI is illustrated to generate credits to earnings in the first year.'
	}}
/>
