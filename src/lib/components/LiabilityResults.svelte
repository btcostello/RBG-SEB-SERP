<script lang="ts">
	/**
	 * LiabilityResults — per-participant and aggregate SERP liability, recomputed live (FR16).
	 * Reads the `$derived` liability store, so it updates as soon as any liability-relevant
	 * input changes (NFR6, sub-second).
	 */
	import { quoteStore } from '$lib/stores/quote.svelte';
	import { liability } from '$lib/stores/liability.svelte';

	function nameFor(insuredId: string): string {
		const insured = quoteStore.current?.census.find((c) => c.id === insuredId);
		return insured ? `${insured.firstName} ${insured.lastName}` : insuredId;
	}
</script>

{#if liability.results}
	{@const results = liability.results}
	<section>
		<h2>Liability results</h2>
		{#if results.perParticipant.length === 0}
			<p class="empty">No SERP participants in the census yet.</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Participant</th>
						<th>Final avg salary</th>
						<th>Annual benefit</th>
						<th>Total benefit cost</th>
						<th>NPV</th>
					</tr>
				</thead>
				<tbody>
					{#each results.perParticipant as p (p.insuredId)}
						<tr>
							<td>{nameFor(p.insuredId)}</td>
							<td class="num">{p.finalAverageSalary}</td>
							<td class="num">{p.annualBenefit}</td>
							<td class="num">{p.totalBenefitCost}</td>
							<td class="num">{p.netPresentValue}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr>
						<th>Aggregate</th>
						<td></td>
						<td></td>
						<td class="num">{results.aggregate.totalBenefitCost}</td>
						<td class="num">{results.aggregate.netPresentValue}</td>
					</tr>
				</tfoot>
			</table>
		{/if}
	</section>
{/if}

<style>
	section {
		margin-top: 1.5rem;
	}
	table {
		border-collapse: collapse;
		width: 100%;
		font-size: 0.9rem;
	}
	th,
	td {
		border: 1px solid #ddd;
		padding: 0.4rem 0.6rem;
		text-align: left;
	}
	tfoot th,
	tfoot td {
		font-weight: 600;
		border-top: 2px solid #999;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.empty {
		color: #666;
	}
</style>
