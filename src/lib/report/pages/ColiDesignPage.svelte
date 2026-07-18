<script lang="ts">
	/**
	 * 2.4 COLI policy design (FR30) — per-policy face amount, solved annual premium, and
	 * first-year policy values from the illustration engine, with totals and GPT/MEC flags.
	 */
	import PageShell from './PageShell.svelte';
	import type { ReportModel } from '../report-data';

	let { report }: { report: ReportModel } = $props();

	const anyAdjusted = $derived(report.policies.some((p) => p.gptAdjusted || p.mecAdjusted));

	function flags(policy: { gptAdjusted: boolean; mecAdjusted: boolean }): string {
		const parts: string[] = [];
		if (policy.gptAdjusted) parts.push('GPT');
		if (policy.mecAdjusted) parts.push('MEC');
		return parts.join(' · ');
	}
</script>

<PageShell
	{report}
	eyebrow="Part 2 · Supporting detail"
	title="COLI policy design"
	sub="One policy per insured executive, designed for cost recovery."
	pageNo="2.4"
>
	{#if report.policies.length === 0}
		<p class="small">No COLI participants in this plan.</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th class="txt">Insured</th>
					<th>Issue age</th>
					<th>Gender</th>
					<th class="txt">Risk class</th>
					<th>Face amount</th>
					<th>Annual premium</th>
					<th>Yr-1 account value</th>
					<th>Yr-1 cash surr. value</th>
					<th>Yr-1 death benefit</th>
					{#if anyAdjusted}<th class="txt">Adj.</th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each report.policies as policy, index (policy.name + index)}
					<tr>
						<td class="txt">{policy.name}</td>
						<td>{policy.issueAge}</td>
						<td>{policy.gender}</td>
						<td class="txt">{policy.riskClass}</td>
						<td>{policy.faceAmount}</td>
						<td>{policy.annualPremium}</td>
						<td>{policy.accountValue}</td>
						<td>{policy.cashSurrenderValue}</td>
						<td>{policy.deathBenefit}</td>
						{#if anyAdjusted}<td class="txt">{flags(policy)}</td>{/if}
					</tr>
				{/each}
				<tr class="tot">
					<td class="txt">Total</td>
					<td></td>
					<td></td>
					<td class="txt"></td>
					<td>{report.totalDeathBenefit ?? '—'}</td>
					<td>{report.totalFirstYearPremium ?? '—'}</td>
					<td></td>
					<td></td>
					<td></td>
					{#if anyAdjusted}<td class="txt"></td>{/if}
				</tr>
			</tbody>
		</table>
		<p class="small" style="margin-top:10px">
			Each premium is solved to a net surrender value of $1,000 at age 100, so the policy is
			designed to stay in force for life.
			{#if anyAdjusted}
				&ldquo;GPT&rdquo; marks a design adjusted to satisfy the Guideline Premium Test;
				&ldquo;MEC&rdquo; marks a design adjusted to avoid Modified Endowment Contract status.
			{/if}
			Policy values are illustrated, not guaranteed; carrier illustrations govern.
		</p>
	{/if}
</PageShell>
