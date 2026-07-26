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
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--fill);
		border: 1px solid var(--line);
		border-left: 3px solid var(--accent);
		border-radius: 2px;
		padding: 0.55rem 0.9rem;
		font-size: 0.85rem;
		color: var(--ink-soft);
	}
</style>
