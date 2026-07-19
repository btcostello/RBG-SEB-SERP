<script lang="ts">
	/**
	 * Legacy Report — G2 Analysis of COLI Face Amount to Pre-Retirement Survivor Benefit
	 * Liability, Option 1 (Appendix — Page B.1).
	 */
	import type { ReportModel } from '../../report-data';
	import FaceSurvivorSheet from './FaceSurvivorSheet.svelte';

	let { report }: { report: ReportModel } = $props();
</script>

<FaceSurvivorSheet
	{report}
	pageNo="Appendix — Page B.1"
	strategyId="cost-recovery"
	optionTitle="Cost Recovery Option 1"
	faceColumnLabel="Cost Recovery Option"
	note="This model analyzes the policy cost recovery status over the lives of the insured participants. COLI can also be designed to provide cost recovery in the event of immediate liabilities created by the premature death of one or more SERP participants in any year. The greatest liability exposure tends to be during the early program years. The above analysis demonstrates the impact of a death in the current year, as well as a death in the year immediately prior to normal retirement age (NRA − 1), and compares the net after-tax value of pre-retirement survivor benefits to the life insurance amount."
/>
