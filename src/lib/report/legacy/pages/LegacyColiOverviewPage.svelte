<script lang="ts">
	/**
	 * Legacy Report — G6 Informational Overview: COLI (Appendix E.2).
	 * Static text only; reproduced verbatim from the source.
	 *
	 * ⚠ Contains a **dated statutory figure** — the IRC §101(j) compensation threshold, "$160,000
	 * for 2025", which is inflation-adjusted annually. It is hardcoded boilerplate here and will
	 * go stale; see DATA-GAPS.md.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyBulletPage, { type BulletItem } from './LegacyBulletPage.svelte';

	let { report }: { report: ReportModel } = $props();

	const ITEMS: BulletItem[] = [
		{
			text: 'The employer purchases life insurance coverage on a select group of employees, directors, or partners, often those participating in a SERP or survivor benefit plan. The employer owns, pays the premiums, and is the sole beneficiary of this life insurance. Upon the death of an insured, the employer receives the life insurance proceeds.'
		},
		{
			text: 'COLI coverage is generally limited to the top 35% of all employees, as measured by compensation, or employees who received in excess of a statutory amount, $160,000 for 2025, adjusted annually for inflation (IRC Section 101(j)).'
		},
		{
			text: 'COLI offers the employer a funding vehicle which can be designed to meet several objectives, including:',
			children: [
				'provides "cost recovery" as mortality occurs by reimbursing the employer for the direct and indirect costs of the program, including the assumed cost of funding the net after tax benefit payments from the insurance assets;',
				'provides the employer with the "funding wherewithal" for net after-tax benefit commitments when due;',
				"protects the employer against risk exposure resulting from participants' premature deaths;",
				'offsets the financial statement impact of accruing the cost of executive retirement benefits.'
			]
		},
		{
			text: "Since the employer is the COLI policy owner and beneficiary, it cannot deduct the premiums paid (IRC Section 264(a)(1)). However, the policy cash surrender values will be carried as an asset on the employer's balance sheet. The net annual charge or credit to cash earnings is the difference between the annual premium paid, the annual change in the cash surrender value, and the annual death proceeds received."
		},
		{
			text: "The lump-sum COLI death proceeds received by the employer at each insured's death will generally be free of federal income taxes [IRC Sec. 101(a)(1)]."
		},
		{
			text: 'Interest paid or accrued on any indebtedness with respect to COLI policies is generally not deductible.'
		},
		{
			text: "COLI cash surrender value increases and death proceeds could become subject to a corporate employer's Alternative Minimum Tax (AMT) liability. However, any such AMT can generally be used as a tax credit in favor of the corporation in a future year when AMT does not apply. Further, FASB ASC 740-10 may allow the tax credit to be recognized as an asset for financial statement purposes."
		},
		{
			text: 'Information reporting is required for tax purposes with regards to life insurance on covered employees.'
		}
	];
</script>

<LegacyBulletPage
	{report}
	title="Informational Overview — COLI"
	items={ITEMS}
	pageNo="Appendix E.2"
	numbered={false}
/>
