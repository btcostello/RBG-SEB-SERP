<script lang="ts">
	/**
	 * Census Summary page (FR29) — lists the plan participants with their key fields so the
	 * client sees who the plan covers. Registered in the report registry (FR31). Salary is
	 * formatted from decimal-string money (AR2).
	 */
	import { quoteStore } from '$lib/stores/quote.svelte';
	import { money, formatMoney } from '$lib/money/money';

	const census = $derived(quoteStore.current?.census ?? []);

	function displaySalary(value: string): string {
		return formatMoney(money(value));
	}
</script>

<section class="page">
	<h2>Census Summary</h2>

	{#if census.length === 0}
		<p class="empty">No participants in this plan.</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Gender</th>
					<th>Date of birth</th>
					<th>Date of hire</th>
					<th>Current salary</th>
					<th>Benefit (% of FAS)</th>
					<th>Risk class</th>
					<th>Plan</th>
				</tr>
			</thead>
			<tbody>
				{#each census as insured (insured.id)}
					<tr>
						<td>{insured.firstName} {insured.lastName}</td>
						<td>{insured.gender}</td>
						<td>{insured.dateOfBirth}</td>
						<td>{insured.dateOfHire}</td>
						<td class="num">{displaySalary(insured.currentSalary)}</td>
						<td class="num">{insured.benefitPercentage}</td>
						<td>{insured.riskClass}</td>
						<td>{insured.planMembership}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<style>
	.page {
		padding: 1rem 0;
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
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.empty {
		color: #666;
	}
</style>
