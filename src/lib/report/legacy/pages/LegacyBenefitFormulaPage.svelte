<script lang="ts">
	/**
	 * Legacy Report — B2 SERP Benefit Formula (source: "B2 SERP Benefit Formula.pdf"), page 2.1.
	 * Static description of how DB SERP benefits can be structured. Text reproduced verbatim.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyProsePage from './LegacyProsePage.svelte';

	let { report }: { report: ReportModel } = $props();

	const PARAS: string[] = [
		"The program proposed is commonly referred to as a nonqualified Defined Benefit SERP (Supplemental Executive Retirement Plan). Under this structure, each participant's retirement benefit is based upon a specified percentage of the participant's final average salary.",
		'The Company has broad flexibility in benefit design, depending upon the Company\'s objectives. For example, it can structure this type of SERP with different percentages for each participant or management tier; or fixed dollar retirement benefits can be used (e.g. $75,000 per year). Alternatively, benefits can be structured on a “Unit Credit” approach, using the same or different unit credits for past and future service. The Company can also have different unit credit formulas for each tier of management.',
		'The benefit payment period may also offer flexibility. A typical benefit payment period is the participant\'s lifetime, with a guaranteed minimum period of ten years. The organization may have the ability to offer an alternative benefit that has the same “actuarial equivalent” (or present value equivalent) under the terms of the plan document. Alternatively, a “term certain” period may be offered, such as a benefit for a fixed period of 10 or 15 years. In addition, joint and survivor benefit options may be provided.',
		"Similarly, pre-retirement survivor benefits can be structured in a different manner, with a different formula for each management tier. It is important to point out that these survivor benefits do not represent life insurance; these benefits are taxable to a participant's beneficiaries when received, and the benefits are deductible by the Company when paid (assuming, of course, that the Company is a taxpayer). At the same time, participants are not taxed currently on the value of the survivor benefit, as they would be were the benefits structured as life insurance."
	];
</script>

<LegacyProsePage {report} title="SERP Benefit Formula" paragraphs={PARAS} pageNo="2.1" />
