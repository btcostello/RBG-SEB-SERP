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

{#if runState.validationIssues.length > 0}
	<div class="validation" role="alert">
		<p>Fix these issues before running:</p>
		<ul>
			{#each runState.validationIssues as issue (issue.label + issue.field + issue.message)}
				<li><strong>{issue.label}:</strong> {issue.message}</li>
			{/each}
		</ul>
	</div>
{/if}

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
	.validation {
		background: #fdecea;
		border: 1px solid #f5c2c0;
		border-radius: 6px;
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
		color: #7a1c17;
	}
	.validation p {
		margin: 0 0 0.5rem;
		font-weight: 600;
	}
	.validation ul {
		margin: 0;
		padding-left: 1.25rem;
	}
</style>
