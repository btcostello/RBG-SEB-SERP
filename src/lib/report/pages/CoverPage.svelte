<script lang="ts">
	/**
	 * Cover page (FR28) — the SERP-financed-with-COLI proposal cover, personalized with the
	 * prospect company name from the active quote. Registered in the report registry (FR31).
	 */
	import { quoteStore } from '$lib/stores/quote.svelte';

	const companyName = $derived(quoteStore.current?.company.name?.trim() || 'the prospect company');
</script>

<section class="cover">
	<p class="eyebrow">Proposal</p>
	<h1>Supplemental Executive Retirement Plan</h1>
	<p class="subtitle">Financed with Corporate-Owned Life Insurance</p>

	<p class="prepared-for">
		Prepared for<br />
		<strong>{companyName}</strong>
	</p>
</section>

<style>
	.cover {
		min-height: 70vh;
		display: grid;
		place-content: center;
		justify-items: center;
		text-align: center;
		gap: 1rem;
		padding: 3rem 1rem;
	}
	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.2em;
		font-size: 0.85rem;
		color: #666;
		margin: 0;
	}
	h1 {
		margin: 0;
		font-size: 2.4rem;
		line-height: 1.15;
		max-width: 22ch;
	}
	.subtitle {
		margin: 0;
		font-size: 1.2rem;
		color: #333;
	}
	.prepared-for {
		margin-top: 2.5rem;
		font-size: 1.1rem;
		color: #444;
	}
	.prepared-for strong {
		display: inline-block;
		margin-top: 0.4rem;
		font-size: 1.6rem;
		color: #111;
	}
</style>
