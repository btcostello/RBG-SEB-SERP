<script lang="ts">
	/** Single-action Run trigger (FR23). Disabled while running or with no active quote. */
	import { runState } from '$lib/stores/run-state.svelte';
	import { quoteStore } from '$lib/stores/quote.svelte';

	const canRun = $derived(!!quoteStore.current && !runState.isRunning);
</script>

<div class="run">
	<button type="button" onclick={() => runState.start()} disabled={!canRun}>
		{runState.isRunning ? 'Running…' : 'Run model'}
	</button>
	{#if runState.status === 'failed' && runState.error}
		<p class="error">Run failed: {runState.error.message}</p>
	{/if}
</div>

<style>
	.run {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 1rem 0;
	}
	button {
		padding: 0.5rem 1.25rem;
		font-weight: 600;
	}
	.error {
		color: #b00020;
		margin: 0;
	}
</style>
