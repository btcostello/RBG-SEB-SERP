<script lang="ts">
	/**
	 * Report screen ("/report") — renders the data-driven proposal once results exist on the
	 * active quote (a fresh run or a reopened saved quote). Until then it prompts the operator
	 * to run the model (supports FR28–30).
	 */
	import { quoteStore } from '$lib/stores/quote.svelte';
	import ReportView from '$lib/report/ReportView.svelte';

	const hasReport = $derived(quoteStore.current?.results != null);
</script>

<svelte:head><title>Schiff SERP — Report</title></svelte:head>

<main class:paper={hasReport}>
	{#if hasReport}
		<div class="actions no-print">
			<button type="button" onclick={() => window.print()}>Print / Save as PDF</button>
		</div>
		<ReportView />
	{:else}
		<section class="prompt">
			<h1>No report yet</h1>
			<p>Run the model to generate the proposal.</p>
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
		justify-content: center;
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
