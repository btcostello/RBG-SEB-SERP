<script lang="ts">
	/**
	 * Legacy Report — E3 Annual Impact on Earnings, Option 2 (section page 5.2-2).
	 * Column [4] (COLI earnings impact) is live; the SERP columns await the accounting engine.
	 *
	 * Option 2 alone carries the "~" note instead of the shared "*" one: because the policy funds
	 * the benefits, its combined impact is a net of premiums paid, benefits paid from company cash
	 * flow, and COLI mortality gains. Those three figures are themselves gaps.
	 */
	import type { ReportModel } from '../../report-data';
	import EarningsLedgerSheet from './EarningsLedgerSheet.svelte';

	let { report }: { report: ReportModel } = $props();
</script>

<EarningsLedgerSheet
	{report}
	pageNo="5.2-2"
	optionId="benefit-distribution"
	optionTitle="Option 2 — SERP Benefit Funding from COLI Assets"
	closingNote={{
		marker: '~',
		text: 'Represents the net differences between the total premiums paid, net benefits paid from Company cash flow, and COLI mortality gains in excess of these expenses.'
	}}
/>
