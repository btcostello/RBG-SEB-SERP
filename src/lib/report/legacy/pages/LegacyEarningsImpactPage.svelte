<script lang="ts">
	/**
	 * Legacy Report — E1 Earnings Impact description (source: "E1 Earnings Imp Desc.pdf"),
	 * section page 5.1. Static narrative on GAAP earnings accounting (FASB ASC 715-30 / 740-10 /
	 * 325-30) and the mortality / discount-rate assumptions. Text reproduced verbatim.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyProsePage from './LegacyProsePage.svelte';

	let { report }: { report: ReportModel } = $props();

	const PARAS: string[] = [
		'The earnings impact of this program is based on GAAP (Generally Accepted Accounting Principles), pursuant to FASB ASC 715-30, Compensation - Retirement Benefits, Defined Benefit Plans - Pensions. In addition, a tax paying entity may record a deferred tax asset under FASB ASC 740-10, Income Taxes, Overall to reflect the reduction in taxes that will result from future employee benefit payments.',
		'Prior to the Accounting Standards Codification, some organizations used other accounting methods, such as APB 12 or FAS 106. This model reflects accounting for the proposed nonqualified arrangement in accordance with FASB ASC 715-30.',
		'The GAAP method of accounting for life insurance purchases is set forth in FASB ASC 325-30, Investments — Other, Investments in Insurance Contracts. The policy cash surrender values are recognized as assets on the employer’s balance sheet. The net annual “charge” or “credit” to earnings is the difference between the annual premium paid, the annual change in the cash surrender value, and the annual death proceeds received.',
		'It is necessary to make certain assumptions regarding the mortality of the participants as well as the interest discount rate to be used, in calculating the present value of retirement benefits. In this regard, this actuarial model generally uses the mortality table guidance contained in IRC Sec. 417(e) [Pension Protection Act (PPA) of 2006 (P.L. 109-280)] for the assumption of mortality. This model also employs the Citigroup Pension Discount Curve, matching projected accrued benefit cash flows to comparable corporate bond durations, to develop the interest discount rate assumption. We believe both of these assumptions are consistent with current actuarial standards and industry practice, are reasonable, and produce reasonable results.',
		'As indicated on page 2.4 of this actuarial model, the mortality assumptions used for GAAP purposes differ from those used for the benefit and insurance computations, resulting in slight differences in the total calculated projected benefits.'
	];
</script>

<LegacyProsePage {report} title="Earnings Impact" paragraphs={PARAS} pageNo="5.1" pageNoSide="right" />
