<script lang="ts">
	/**
	 * Legacy Report screen ("/report/legacy") — an alternative proposal being built section by
	 * section. Gated on an active quote (not on results) so pages can be previewed during
	 * construction; a banner flags when computed figures are absent until the model is run.
	 */
	import { quoteStore } from '$lib/stores/quote.svelte';
	import LegacyReportView from '$lib/report/legacy/LegacyReportView.svelte';

	const hasQuote = $derived(quoteStore.current != null);
	const hasResults = $derived(quoteStore.current?.results != null);
</script>

<svelte:head><title>SERP Pro — Legacy Report</title></svelte:head>

<main class:paper={hasQuote}>
	{#if hasQuote}
		<div class="actions no-print">
			<button type="button" onclick={() => window.print()}>Print / Save as PDF</button>
			{#if !hasResults}
				<span class="dev-note">Preview — run the model to populate computed figures.</span>
			{/if}
		</div>
		<LegacyReportView />
	{:else}
		<section class="prompt">
			<h1>No quote yet</h1>
			<p>Create a quote to preview the Legacy Report.</p>
			<a href="/">Go to setup</a>
		</section>
	{/if}
</main>

<style>
	main {
		margin: 0 auto;
		padding: 2rem 1rem 3rem;
	}
	/* Desk surface behind the letter-size sheets. */
	main.paper {
		background: #d9d3c6;
		min-height: 100vh;
	}
	.actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin: 0 auto 1.5rem;
		max-width: 7.5in;
	}
	.actions button {
		font: inherit;
		font-weight: 600;
		font-size: 0.85rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #fff;
		background: #0e2530;
		border: 0;
		border-bottom: 2px solid #b98a45;
		padding: 0.55rem 1.4rem;
		cursor: pointer;
	}
	.actions button:hover {
		background: #33525f;
	}
	.dev-note {
		font-size: 0.8rem;
		color: #7a4f01;
		background: #fff4e5;
		border: 1px solid #f0c36d;
		padding: 0.35rem 0.75rem;
		border-radius: 4px;
	}
	.prompt {
		max-width: 60rem;
		margin: 0 auto;
		text-align: center;
		color: #444;
	}

	/* On print, drop the screen page padding so @page margins control the layout. */
	@media print {
		main,
		main.paper {
			max-width: none;
			margin: 0;
			padding: 0;
			background: #fff;
		}
	}
</style>
