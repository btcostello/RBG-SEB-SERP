<script lang="ts">
	/** Legacy Report — D1 Financial Overview, page 1 of 2 (source: "D1 Fin Overview.pdf"), page 4.1. */
	import type { ReportModel } from '../../report-data';
	import LegacyRichProsePage, { type ProseBlock } from './LegacyRichProsePage.svelte';

	let { report }: { report: ReportModel } = $props();

	const BLOCKS: ProseBlock[] = [
		{
			p: 'As can be seen on page 4.2, benefits, when paid to a participant, are tax deductible to the Company. In contrast, contributions to a qualified plan are tax deductible currently, but benefits when paid are not tax deductible.'
		},
		{
			p: 'To the extent the Company has decided to accumulate funds to cover its benefit obligations, the most common choices are: mutual funds (or similar types of financial instruments) or COLI (Company-Owned Life Insurance). Within most variable COLI products are various investment divisions within a separate account which allows the policyholder to allocate the premium among the various investment divisions which fluctuate in value. By using COLI to invest in these investment divisions the Company seeks to take advantage of the tax favored treatment afforded life insurance. Additionally, the life insurance carrier often does not charge for transfers among the investment divisions, nor are such transfers a taxable event. Providers may limit the number of transfers in a policy year and may charge a fee after a certain number of transfers. Many carriers include restrictions on transfers from a fixed account to the investment divisions.'
		},
		{
			p: 'It is important to note that nonqualified plans are technically unfunded arrangements and the COLI is used to “informally” finance the benefit liabilities. As such, the COLI is not considered a Plan asset. See Appendix E for a more detailed discussion of funded and unfunded arrangements.'
		},
		{ p: 'Four benefit funding (financing) options are presented in this analysis:' },
		{ h: 'Option 1' },
		{
			p: 'Option 1 assumes that all SERP benefit payments, net of taxes, are made using Company cash flow, other than the COLI values. Ultimately, all Plan costs, including SERP benefit payments, net of taxes, and COLI premiums, will be recovered by the Company through receipt of tax-free life insurance death proceeds.'
		},
		{ h: 'Option 2' },
		{
			p: 'Option 2 assumes that all SERP benefit payments, net of taxes, are made using COLI policy values, after the initial accumulation period, i.e., ten plan years. Policy values are accessed as benefits come due using tax-free withdrawals and policy loans. Policy values also become available upon receipt of tax-free life insurance death proceeds when insured participants die. The COLI provides funds for SERP benefit payments net of taxes but does not provide for complete cost recovery.'
		}
	];
</script>

<LegacyRichProsePage {report} title="Financial Overview" blocks={BLOCKS} pageNo="4.1" />
