<script lang="ts">
	/**
	 * Legacy Report — E1 Earnings Impact description (source: "E1 Earnings Imp Desc.pdf"),
	 * section page 5.1. Static narrative on GAAP earnings accounting (FASB ASC 715-30 / 740-10 /
	 * 325-30) and the mortality / discount-rate assumptions. Text reproduced verbatim.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyProsePage from './LegacyProsePage.svelte';

	/**
	 * ⚠ The source report's version of this page describes a basis this model does not use: the
	 * IRC 417(e) mortality table and the Citigroup Pension Discount Curve. Both are what a plan's
	 * actuary would use in a real valuation; this tool takes an entered life expectancy and an
	 * entered discount rate. The narrative below says so rather than claiming otherwise, and points
	 * at the valuation that will replace it. See page 2.4 and DATA-GAPS.md.
	 */
	let { report }: { report: ReportModel } = $props();

	const PARAS: string[] = [
		'The earnings impact of this program is based on GAAP (Generally Accepted Accounting Principles), pursuant to FASB ASC 715-30, Compensation - Retirement Benefits, Defined Benefit Plans - Pensions. In addition, a tax paying entity may record a deferred tax asset under FASB ASC 740-10, Income Taxes, Overall to reflect the reduction in taxes that will result from future employee benefit payments.',
		'Prior to the Accounting Standards Codification, some organizations used other accounting methods, such as APB 12 or FAS 106. This model reflects accounting for the proposed nonqualified arrangement in accordance with FASB ASC 715-30.',
		'The GAAP method of accounting for life insurance purchases is set forth in FASB ASC 325-30, Investments — Other, Investments in Insurance Contracts. The policy cash surrender values are recognized as assets on the employer’s balance sheet. The net annual “charge” or “credit” to earnings is the difference between the annual premium paid, the annual change in the cash surrender value, and the annual death proceeds received.',
		'Calculating the present value of retirement benefits requires assumptions about the mortality of the participants and about the interest discount rate. This model assumes each participant lives to the life expectancy entered for them, and applies the accounting discount rate entered for the plan. Both are inputs, chosen to illustrate the arrangement rather than derived from a yield curve or an actuarial table.',
		'A plan in force is valued differently. The plan’s actuary or administrator will select a mortality table — commonly the table prescribed under IRC Sec. 417(e) [Pension Protection Act of 2006, P.L. 109-280] — and will derive the discount rate from a published pension discount curve, matching projected benefit cash flows to comparable corporate bond durations. The figures here are a projection of how the arrangement is expected to behave, not a substitute for that valuation.',
		'Because one mortality assumption is used throughout, the GAAP figures in this model rest on the same basis as the benefit and insurance computations. Appendix G illustrates how the projection would differ on a partial-mortality basis, where participants are assumed to die across a range of ages rather than all at life expectancy.'
	];
</script>

<LegacyProsePage
	{report}
	title="Earnings Impact"
	paragraphs={PARAS}
	pageNo="5.1"
	pageNoSide="right"
/>
