<script lang="ts">
	/**
	 * Legacy Report — E1 Earnings Impact description (source: "E1 Earnings Imp Desc.pdf"),
	 * section page 5.1. Static narrative on GAAP earnings accounting (FASB ASC 715-30 / 740-10 /
	 * 325-30) and the mortality / discount-rate assumptions. Text reproduced verbatim.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyProsePage from './LegacyProsePage.svelte';

	/**
	 * The mortality half of the source's narrative is true of this model again: the accounting
	 * liability IS valued on the 417(e) table — see `engine/expected-benefits.ts` and
	 * `engine/mortality/irs-417e.ts`.
	 *
	 * ⚠ The discount rate half is still not. The source claims a Citigroup Pension Discount Curve;
	 * this model takes an entered accounting rate. The narrative says so rather than claiming
	 * otherwise, and points at the valuation that will replace it.
	 */
	let { report }: { report: ReportModel } = $props();

	const PARAS: string[] = [
		'The earnings impact of this program is based on GAAP (Generally Accepted Accounting Principles), pursuant to FASB ASC 715-30, Compensation - Retirement Benefits, Defined Benefit Plans - Pensions. In addition, a tax paying entity may record a deferred tax asset under FASB ASC 740-10, Income Taxes, Overall to reflect the reduction in taxes that will result from future employee benefit payments.',
		'Prior to the Accounting Standards Codification, some organizations used other accounting methods, such as APB 12 or FAS 106. This model reflects accounting for the proposed nonqualified arrangement in accordance with FASB ASC 715-30.',
		'The GAAP method of accounting for life insurance purchases is set forth in FASB ASC 325-30, Investments — Other, Investments in Insurance Contracts. The policy cash surrender values are recognized as assets on the employer’s balance sheet. The net annual “charge” or “credit” to earnings is the difference between the annual premium paid, the annual change in the cash surrender value, and the annual death proceeds received.',
		'Calculating the present value of retirement benefits requires assumptions about the mortality of the participants and about the interest discount rate. For the accounting liability this model uses the mortality table prescribed under IRC Sec. 417(e) [Pension Protection Act of 2006, P.L. 109-280] — the unisex table derived from the static tables under Treasury Regulation section 1.430(h)(3)-1 — so the obligation is weighted by the probability of each benefit actually being paid. The interest discount rate is an input, chosen to illustrate the arrangement; a plan in force will derive it from a published pension discount curve, matching projected benefit cash flows to comparable corporate bond durations.',
		'The obligation reflects three payments, each weighted differently. A benefit is paid while the participant lives; it is paid regardless during any guaranteed period, once benefits have commenced; and if the participant dies before retirement the plan pays the survivor benefit instead. Dying before retirement is therefore not the absence of a cost.',
		'As indicated on page 2.4, the mortality assumption used for GAAP purposes differs from the single assumed age at death used for the benefit and insurance computations. The two are answering different questions — one the expected cost of the promise, the other what the arrangement looks like for a participant who lives exactly as long as assumed — and their totals do not tie.'
	];
</script>

<LegacyProsePage
	{report}
	title="Earnings Impact"
	paragraphs={PARAS}
	pageNo="5.1"
	pageNoSide="right"
/>
