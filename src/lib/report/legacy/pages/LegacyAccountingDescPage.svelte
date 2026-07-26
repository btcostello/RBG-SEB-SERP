<script lang="ts">
	/**
	 * Legacy Report — G5 Accounting for SERP Programs (Appendix D).
	 *
	 * Static text only: two sections describing the SERP and COLI accounting standards. Reproduced
	 * verbatim from the source, which is firm-standard boilerplate rather than per-quote content
	 * (same operator decision as the other disclosure pages).
	 *
	 * Note this page *describes* the treatment that the GAAP layer will implement — the
	 * placeholder worksheets on pages 6.1–6.6 are the numbers behind this narrative.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyRichProsePage, { type ProseBlock } from './LegacyRichProsePage.svelte';

	let { report }: { report: ReportModel } = $props();

	const BLOCKS: ProseBlock[] = [
		{ h: 'SERP Accounting Treatment' },
		{
			p: 'The Financial Accounting Standards Board (FASB) is the rule-making body for the accounting profession. Any employer that follows generally accepted accounting principles (GAAP) as defined by FASB must comply with FASB pronouncements. Accounting for both "qualified" and "non-qualified" pension benefits is covered under FASB ASC 715-30, Compensation — Retirement Benefits, Defined Benefit Plans — Pension. This Standard supersedes Financial Accounting Standard No. 87, "Employer\'s Accounting for Pensions" (FAS 87), and Accounting Principles Board Opinion No. 8, "Accounting for the Cost of Pension Plans" (APB 8). Virtually all SERPs are subject to FASB ASC 715-30.'
		},
		{
			p: "For fiscal years ending after December 15, 2006, accounting for pensions must comply with the requirement that the present value of the future retirement benefit payments be recognized as a liability on the financial statements of the employer. The determination is based on the unfunded Projected Benefit Obligation (PBO). There is a specific methodology by which the employer must calculate these liabilities. These determinations will impact both the employer's earnings statement and balance sheet."
		},
		{
			p: 'FASB ASC 740-10, Income Taxes, Overall employs an asset and liability approach to deferred income tax accounting. This approach requires an employer to recognize current taxes payable / refundable and to record the future tax consequences of "temporary differences" between financial reporting for the current year and tax return accounting methods and the basis of assets and liabilities. Deferred tax assets are reduced, if necessary, by the amount of any tax benefits that, based on available evidence, are not likely to be realized (valuation reserve). Adoption of this Standard was required for fiscal years beginning after December 15, 1992.'
		},
		{ h: 'COLI Accounting Treatment' },
		{
			p: 'COLI is accounted for independently of the SERP, in accordance with the "Cash Surrender Value" method of accounting (FASB ASC 325-30, Investments — Other, Investments in Insurance Contracts). Under this Standard, the net difference between each premium payment, cash surrender value change, and net death proceeds received is charged or credited to the employer\'s earnings. Premium payments are not deductible, while both cash surrender value increases and death proceeds received should be nontaxable.'
		},
		{
			p: "FASB ASC 740-10 generally does not require tax to be provided on COLI gains since the COLI coverage is projected to be maintained by the employer until the death of each insured, even if the insured were to leave the employ of the employer. Since the financial structure of SERP-PLUS anticipates no policy surrenders prior to any insured's death, no deferred tax liability on COLI gains should be required."
		}
	];
</script>

<LegacyRichProsePage
	{report}
	title="Accounting for SERP Programs"
	blocks={BLOCKS}
	pageNo="Appendix D"
	pageNoSide="right"
	numbered={false}
/>
