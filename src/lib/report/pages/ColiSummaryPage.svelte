<script lang="ts">
	/**
	 * COLI Summary page (FR30) — the headline funding numbers: total death benefit and total
	 * first-year premium, from the computed Results aggregate. Registered in the report registry
	 * (FR31). Monetary values are formatted from decimal-string money (AR2).
	 */
	import { quoteStore } from '$lib/stores/quote.svelte';
	import { formatMoneyDisplay } from '$lib/money/money';

	const aggregate = $derived(quoteStore.current?.results?.aggregate ?? null);

	/** Display a decimal-string money value as currency; '—' when not yet computed. */
	function displayMoney(value: string | undefined): string {
		return value === undefined ? '—' : `$${formatMoneyDisplay(value)}`;
	}
</script>

<section class="page">
	<h2>COLI Summary</h2>

	{#if aggregate}
		<dl class="headline">
			<div class="figure">
				<dt>Total death benefit</dt>
				<dd>{displayMoney(aggregate.totalDeathBenefit)}</dd>
			</div>
			<div class="figure">
				<dt>Total first-year premium</dt>
				<dd>{displayMoney(aggregate.totalFirstYearPremium)}</dd>
			</div>
		</dl>
	{:else}
		<p class="empty">Run the model to compute the COLI funding numbers.</p>
	{/if}
</section>

<style>
	.page {
		padding: 1rem 0;
	}
	.headline {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 1.5rem;
		margin: 1rem 0;
	}
	.figure {
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 1.25rem 1.5rem;
	}
	dt {
		font-size: 0.9rem;
		color: #555;
		margin-bottom: 0.5rem;
	}
	dd {
		margin: 0;
		font-size: 1.8rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: #111;
	}
	.empty {
		color: #666;
	}
</style>
