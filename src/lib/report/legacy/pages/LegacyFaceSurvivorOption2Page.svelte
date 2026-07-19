<script lang="ts">
	/**
	 * Legacy Report — G2 Analysis of COLI Face Amount to Pre-Retirement Survivor Benefit
	 * Liability, Option 2 (Appendix — Page B.2).
	 */
	import type { ReportModel } from '../../report-data';
	import FaceSurvivorSheet from './FaceSurvivorSheet.svelte';

	let { report }: { report: ReportModel } = $props();
</script>

<FaceSurvivorSheet
	{report}
	pageNo="Appendix — Page B.2"
	strategyId="benefit-distribution"
	optionTitle="Policy Funding Option 2"
	faceColumnLabel="Policy Funding Option"
	note="This model analyzes the policy funded status over the lives of the insured participants. COLI can also be designed to provide cost recovery in the event of immediate liabilities created by the premature death of one or more SERP participants in any year. The greatest liability exposure tends to be during the early program years. The above analysis demonstrates the impact of a death in the current year, as well as a death in the year immediately prior to normal retirement age (NRA − 1), and compares the net after-tax value of pre-retirement survivor benefits to the life insurance amount."
/>
