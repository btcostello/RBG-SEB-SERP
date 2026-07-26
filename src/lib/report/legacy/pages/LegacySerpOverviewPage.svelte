<script lang="ts">
	/**
	 * Legacy Report — G6 Informational Overview: SERPs (Appendix E.1).
	 * Static text only; reproduced verbatim from the source.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyBulletPage, { type BulletItem } from './LegacyBulletPage.svelte';

	let { report }: { report: ReportModel } = $props();

	const ITEMS: BulletItem[] = [
		{
			text: 'A SERP is a "nonqualified", "unfunded" plan generally designed to provide supplemental retirement and/or survivor benefits to a select group of key management or highly compensated personnel, and/or outside directors, or partners. Nonqualified means that the SERP is not entitled to special tax treatment. However, a SERP is not encumbered by the coverage and benefit restrictions imposed on "qualified" plans by the Internal Revenue Code (IRC). Furthermore, the employer is generally not required to comply with nondiscrimination rules that are imposed on "qualified" plans under ERISA.'
		},
		{
			text: "Unfunded means that none of the assets used to fund the SERP may be placed beyond the claims of the employer's general creditors. However, employers may informally set aside assets, including COLI on participants' lives, intended to finance SERP benefit payments as long as the covered SERP participant does not obtain a legal interest in these assets greater than that of a general creditor."
		},
		{
			text: "SERPs require no qualification by the Internal Revenue Service. Information reporting is required for tax purposes with regards to SERP benefit for plan participants. A one time notification letter to the Labor Department that a SERP has been established will generally satisfy ERISA reporting requirements. ERISA periodic reporting and disclosure are generally not required. Benefits may vary from participant to participant, at the employer's sole discretion. Benefit vesting schedules may generally be as flexible as the employer desires. However, in not-for-profit organizations, benefits are typically vested only upon retirement, to avoid early taxation of the benefits."
		},
		{
			text: 'The employer may deduct SERP payments when made to a participant [IRC Sec. 404(a)(5)] or to his/her survivors [IRC Sec. 162] as ordinary business expenses (so long as the payments are not held to be unreasonable).'
		},
		{
			text: "Deferred tax assets relating to the temporary differences in timing of the employer's deductions for the SERP benefits are recognized under FASB ASC 740-10."
		},
		{
			text: 'Generally, SERP benefits paid to a retired employee are fully taxable as ordinary income [IRC Sec 61(a)]. Furthermore, SERP benefits should not cause a loss of Social Security benefits because they are considered "earned" when no longer subject to a substantial risk of forfeiture, usually during the period of active employment [SSR73-30].'
		},
		{
			text: "SERP benefits paid to a deceased participant's survivors are regarded as income in respect of a decedent [IRC Sec. 691(a)]. The present value of the survivor benefits will ordinarily be includable in the deceased participant's gross estate for federal estate tax purposes [IRC Sec. 2039(a)]. However, the survivors or estate who receive the benefit payments may be entitled to an income tax deduction for any federal estate taxes attributable to the present value included in the participant's estate [IRC Sec. 691(c)(1)(A)]. Benefits payable to a surviving spouse may qualify for the marital deduction and may not incur federal estate taxes."
		},
		{
			text: 'SERP benefits paid to employees of not-for-profit organizations, under an IRC Sec. 457(f) plan, are generally subject to income taxation upon vesting based on the present value of benefits; subsequent payments are received, in-part, income tax free, based upon an annuity exclusion ratio.'
		}
	];
</script>

<LegacyBulletPage
	{report}
	title="Informational Overview — SERPs"
	items={ITEMS}
	pageNo="Appendix E.1"
	numbered={false}
/>
