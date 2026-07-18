<script lang="ts">
	/**
	 * 2.2 Plan census (FR29) — every participant with age, service, and recognized salary,
	 * with a totals row. An asterisk marks a SERP participant not insured under COLI.
	 */
	import PageShell from './PageShell.svelte';
	import type { ReportModel } from '../report-data';

	let { report }: { report: ReportModel } = $props();

	const hasUninsured = $derived(report.census.some((row) => !row.coliInsured));
</script>

<PageShell
	{report}
	eyebrow="Part 2 · Supporting detail"
	title="Plan census"
	sub="{report.numSerp} SERP participant{report.numSerp === 1
		? ''
		: 's'} · {report.numColi} insured under COLI."
	pageNo="2.2"
>
	{#if report.census.length === 0}
		<p class="small">No participants in this plan.</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>#</th>
					<th class="txt">Participant</th>
					<th>Gender</th>
					<th>Date of birth</th>
					<th>Age</th>
					<th>Date of hire</th>
					<th>Service</th>
					<th>Recognized salary</th>
				</tr>
			</thead>
			<tbody>
				{#each report.census as row, index (row.name + index)}
					<tr>
						<td>{index + 1}</td>
						<td class="txt">{row.name}{row.coliInsured ? '' : ' *'}</td>
						<td>{row.gender}</td>
						<td>{row.dateOfBirth}</td>
						<td>{row.age}</td>
						<td>{row.dateOfHire}</td>
						<td>{row.serviceYears}</td>
						<td>{row.salary}</td>
					</tr>
				{/each}
				<tr class="tot">
					<td></td>
					<td class="txt">Total</td>
					<td></td>
					<td></td>
					<td></td>
					<td></td>
					<td></td>
					<td>{report.censusPayroll}</td>
				</tr>
			</tbody>
		</table>
		<p class="small" style="margin-top:10px">
			Age nearest birthday and completed years of service as of the valuation date.
			{#if hasUninsured}An asterisk denotes a participant for whom COLI is not purchased.{/if}
		</p>
	{/if}
</PageShell>
