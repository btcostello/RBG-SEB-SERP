<script lang="ts">
	/**
	 * QuoteList — select among and delete saved quotes (FR34, FR35).
	 * Reads summaries from the saved-quotes façade; opening loads the full quote into the
	 * active quote store, so a reopened quote is identical to what was saved (FR33, NFR11).
	 */
	import { onMount } from 'svelte';
	import { savedQuotes } from '$lib/stores/saved-quotes.svelte';
	import { quoteStore } from '$lib/stores/quote.svelte';

	onMount(() => {
		void savedQuotes.refresh();
	});

	async function open(id: string) {
		const quote = await savedQuotes.load(id);
		if (quote) quoteStore.open(quote);
	}
</script>

{#if savedQuotes.summaries.length > 0}
	<section>
		<p class="eyebrow">Saved</p>
		<h2>Saved quotes</h2>
		<ul>
			{#each savedQuotes.summaries as summary (summary.id)}
				<li class:active={quoteStore.current?.id === summary.id}>
					<span class="name">{summary.companyName}</span>
					<span class="actions">
						<button type="button" class="link" onclick={() => open(summary.id)}>Open</button>
						<button type="button" class="link del" onclick={() => savedQuotes.remove(summary.id)}>
							Delete
						</button>
					</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	section {
		background: var(--paper);
		border: 1px solid var(--line);
		border-top: 3px solid var(--ink);
		border-radius: 2px;
		box-shadow: 0 1px 10px rgba(14, 37, 48, 0.06);
		padding: 1.25rem 1.5rem 1.4rem;
		margin-bottom: 1.5rem;
	}
	.eyebrow {
		font-family: var(--sans);
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--bronze-deep);
		margin: 0 0 0.4rem;
	}
	.eyebrow::before {
		content: '';
		display: inline-block;
		width: 18px;
		height: 2px;
		background: var(--bronze);
		margin-right: 8px;
		vertical-align: 0.22em;
	}
	h2 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 1.25rem;
		color: var(--ink);
		margin: 0 0 0.75rem;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.55rem 0;
		border-top: 1px solid var(--line-soft);
	}
	li:first-child {
		border-top: none;
	}
	.name {
		font-family: var(--serif);
		font-size: 1rem;
		color: var(--ink);
	}
	li.active .name {
		font-weight: 600;
	}
	li.active .name::after {
		content: 'Active';
		font-family: var(--sans);
		font-size: 0.6rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--accent-deep);
		margin-left: 0.6rem;
		vertical-align: 0.1em;
	}
	.actions {
		display: flex;
		gap: 1rem;
		flex: 0 0 auto;
	}
	button.link {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font-family: var(--sans);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--accent-deep);
	}
	button.link:hover {
		text-decoration: underline;
	}
	button.link.del {
		color: var(--muted);
	}
	button.link.del:hover {
		color: var(--warn-tx);
	}
</style>
