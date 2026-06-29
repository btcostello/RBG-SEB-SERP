<script lang="ts">
	/** Progress indicator for the run (FR27, NFR7): computing → designing N/total. */
	import { runState } from '$lib/stores/run-state.svelte';
</script>

{#if runState.isRunning}
	<div class="progress" role="status">
		{#if runState.status === 'computing'}
			Computing liability…
		{:else}
			Designing policies {runState.progress.completed}/{runState.progress.total}…
		{/if}
	</div>
{/if}

<style>
	.progress {
		background: #e8f0fe;
		border: 1px solid #aac4f5;
		border-radius: 6px;
		padding: 0.5rem 0.75rem;
		font-size: 0.9rem;
		color: #1a3a7a;
	}
</style>
