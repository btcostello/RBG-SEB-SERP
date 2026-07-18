<script lang="ts">
	/** Legacy Report — D1 Financial Overview, page 2 of 2 (source: "D1 Fin Overview.pdf"), page 4.2. */
	import type { ReportModel } from '../../report-data';
	import LegacyRichProsePage, { type ProseBlock } from './LegacyRichProsePage.svelte';

	let { report }: { report: ReportModel } = $props();

	const BLOCKS: ProseBlock[] = [
		{ h: 'Option 3' },
		{
			p: 'Option 3 assumes that all SERP benefit payments, net of taxes, are made using Company cash flow, other than the COLI values, similar in approach to Option 1. However, the annual premiums payments are identical to those used in Option 2, thereby creating a COLI asset pool identical to Option 2. Consequently, the COLI assets are available to provide the economic ability or “financial wherewithal” to pay the value of the benefits, net of taxes, using COLI assets after the accumulation period, if and when required by the Company. To the extent that the COLI assets are not used to pay the SERP benefits, net of taxes, as they become due, the COLI provides cost recovery of all Plan costs through the receipt of tax-free life insurance death proceeds.'
		},
		{ h: 'Option 4' },
		{
			p: 'Option 4 assumes that all SERP benefit payments, net of taxes, are made using COLI policy values, after the initial accumulation period, identical in approach to Option 2. Further, the annual premium contributions are sufficient to also recover all additional plan costs from the life insurance death proceeds. The additional plan costs include the COLI premiums plus the value of the SERP benefit payments, net of taxes, made during the accumulation period. The COLI provides funds for SERP benefit payments and cost recovery.'
		},
		{ h: 'Note' },
		{
			p: "In each of these options, the COLI policy values are used to either cost recover or directly pay SERP benefits, in both cases net of taxes. The balance of the cash needed to pay SERP payments is generated from the tax benefit of the Company's deduction. To the extent that additional COLI values are used by the Company (to pay gross benefits, for example), there may not be sufficient COLI values in some years to provide for cost recovery or pay benefits."
		}
	];
</script>

<LegacyRichProsePage {report} title="Financial Overview" blocks={BLOCKS} pageNo="4.2" pageNoSide="right" />
