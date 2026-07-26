<script lang="ts">
	/**
	 * Interactive Report ("/report/interactive") — the web-native, drillable version of the
	 * proposal, structured as a buyer's decision journey (problem → people → promise → cost →
	 * choice → books → risk → decision). Full build in progress; this scaffolds the route so the
	 * workspace deliverable link resolves.
	 */
	import { quoteStore } from '$lib/stores/quote.svelte';

	const hasResults = $derived(quoteStore.current?.results != null);
</script>

<svelte:head><title>SERP Pro — Interactive Report</title></svelte:head>

<main>
	{#if hasResults}
		<p class="eyebrow">Interactive Report</p>
		<h1>{quoteStore.current?.company.name}</h1>
		<p class="lede">The explorable, buyer-decision version of the proposal is being built here.</p>
		<a class="back" href="/">← Back to workspace</a>
	{:else}
		<section class="prompt">
			<h1>No results yet</h1>
			<p>Run the model to generate the interactive report.</p>
			<a href="/">Go to workspace</a>
		</section>
	{/if}
</main>

<style>
	main {
		max-width: 60rem;
		margin: 0 auto;
		padding: 3rem 1.5rem 5rem;
	}
	.eyebrow {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--bronze-deep);
		margin: 0 0 0.6rem;
	}
	h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 2.2rem;
		margin: 0 0 0.75rem;
	}
	.lede {
		color: var(--ink-soft);
		max-width: 40rem;
	}
	.back {
		display: inline-block;
		margin-top: 1.5rem;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: var(--accent-deep);
		text-decoration: none;
	}
	.prompt {
		text-align: center;
		color: var(--ink-soft);
	}
</style>
