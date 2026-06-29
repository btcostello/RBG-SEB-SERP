<script lang="ts">
	/**
	 * Report screen ("/report") — renders the data-driven report once a run is complete.
	 * Until results are ready it prompts the operator to run the model (supports FR28–30).
	 */
	import { runState } from '$lib/stores/run-state.svelte';
	import ReportView from '$lib/report/ReportView.svelte';
</script>

<svelte:head><title>Schiff SERP — Report</title></svelte:head>

<main>
	{#if runState.status === 'done'}
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
		max-width: 60rem;
		margin: 0 auto;
		padding: 2rem 1rem;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 1.5rem;
	}
	.actions button {
		padding: 0.5rem 1.25rem;
		font-weight: 600;
	}
	.prompt {
		text-align: center;
		color: #444;
	}

	/* On print, drop the screen page padding so @page margins control the layout. */
	@media print {
		main {
			max-width: none;
			margin: 0;
			padding: 0;
		}
	}
</style>
