<script lang="ts">
	/** Single-action Run trigger (FR23). Disabled while running or with no active quote. */
	import { runState } from '$lib/stores/run-state.svelte';
	import { quoteStore } from '$lib/stores/quote.svelte';
	import { runFailureHeadline } from '$lib/domain';

	const canRun = $derived(!!quoteStore.current && !runState.isRunning);
</script>

<div class="run">
	<button type="button" onclick={() => runState.start()} disabled={!canRun}>
		{runState.isRunning ? 'Running…' : 'Run model'}
	</button>
	<span class="hint">Designs all four COLI funding options for each executive.</span>
	{#if runState.status === 'failed' && runState.error}
		<p class="error">
			{runFailureHeadline(runState.error.kind)}: {runState.error.message}
		</p>
	{/if}
</div>

{#if runState.validationIssues.length > 0}
	<div class="validation" role="alert">
		<p>Fix these before running:</p>
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
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
	}
	button {
		font-family: var(--sans);
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		color: #fff;
		background: var(--accent-deep);
		border: 1px solid var(--accent-deep);
		border-radius: 2px;
		padding: 0.65rem 1.6rem;
		cursor: pointer;
	}
	button:hover:not(:disabled) {
		background: var(--accent);
		border-color: var(--accent);
	}
	button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.hint {
		font-size: 0.8rem;
		color: var(--muted);
	}
	.error {
		width: 100%;
		color: var(--warn-tx);
		font-size: 0.85rem;
		margin: 0.25rem 0 0;
	}
	.validation {
		background: var(--warn-bg, #f8eee7);
		border: 1px solid #d8b39c;
		border-radius: 2px;
		padding: 0.85rem 1.1rem;
		margin-top: 1rem;
		color: var(--warn-tx);
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
