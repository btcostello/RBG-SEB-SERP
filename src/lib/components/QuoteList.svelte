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
		<h2>Saved quotes</h2>
		<ul>
			{#each savedQuotes.summaries as summary (summary.id)}
				<li>
					<span class="name" class:active={quoteStore.current?.id === summary.id}>
						{summary.companyName}
					</span>
					<span class="actions">
						<button type="button" onclick={() => open(summary.id)}>Open</button>
						<button type="button" onclick={() => savedQuotes.remove(summary.id)}>Delete</button>
					</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	section {
		border: 1px solid #ccc;
		border-radius: 6px;
		padding: 1rem;
		margin-bottom: 1.5rem;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}
	li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	.name.active {
		font-weight: 600;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
	}
</style>
