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
	.prompt {
		text-align: center;
		color: #444;
	}
</style>
