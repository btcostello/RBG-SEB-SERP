<script lang="ts">
	/**
	 * Legacy Report — B4 Plan Specifications and Actuarial Assumptions (source: "B4 Plan Specs.pdf"),
	 * section page 2.3. Static narrative on assumption selection, tax rate, salary scale, NRA, and
	 * ERISA "top hat" participation. Text reproduced verbatim.
	 */
	import type { ReportModel } from '../../report-data';
	import LegacyProsePage from './LegacyProsePage.svelte';

	let { report }: { report: ReportModel } = $props();

	const PARAS: string[] = [
		'Various assumptions are used to develop this SERP model. While the Company has significant flexibility in selecting the various specifications used for the analysis, Schiff Executive Benefits recommends that the Company use realistic assumptions both individually and in the aggregate. If the Company is comfortable that the aggregate assumptions are reasonable, then the assumption as to results should be reasonable.',
		'Schiff Executive Benefits also recommends that the Company annually review the benefit program and conduct an actuarial valuation, with current data and current assumptions, to confirm the anticipated results continue to be reasonable. Schiff Executive Benefits can assist in this Annual Review.',
		"Of particular note is the assumption for Long Term Corporate Marginal Tax Rate. This assumption is intended to reflect the long term nature of this program (often 30 to 40 years or longer). Consequently, the rate may not reflect the Company's current marginal tax rate.",
		"The assumption for Average Annual Growth in Salary (Salary Scale) should also reflect the Company's best judgment of the impact of inflation on executive salaries. Actual annual changes and promotions are typically taken into account as part of the annual review process.",
		'Normal Retirement Age (NRA) can also be a unique age for each participant, or tier of participants, as the Company may desire.',
		'Participation in a SERP is typically limited to a “top hat” group of executives as defined by ERISA. “Top hat” is broadly defined as a select group of key management or highly compensated individuals. Individuals who do not fall within the “top hat” definition generally must be excluded from participation to avoid adverse consequences under ERISA.'
	];
</script>

<LegacyProsePage
	{report}
	title="Plan Specifications and Actuarial Assumptions"
	paragraphs={PARAS}
	pageNo="2.3"
/>
