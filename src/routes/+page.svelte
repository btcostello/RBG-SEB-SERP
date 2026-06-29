<script lang="ts">
	/**
	 * Setup screen ("/") — create and configure a quote (Story 1.3).
	 * No active quote -> a create form (company name + tax rate). Active quote -> the
	 * company and model-settings editors, plus a summary of the prospect company.
	 */
	import { quoteStore } from '$lib/stores/quote.svelte';
	import { savedQuotes } from '$lib/stores/saved-quotes.svelte';
	import { liability } from '$lib/stores/liability.svelte';
	import { CompanySchema, fieldErrors } from '$lib/domain';
	import CompanyForm from '$lib/components/CompanyForm.svelte';
	import ModelSettingsForm from '$lib/components/ModelSettingsForm.svelte';
	import CensusEditor from '$lib/components/CensusEditor.svelte';
	import LiabilityResults from '$lib/components/LiabilityResults.svelte';
	import QuoteList from '$lib/components/QuoteList.svelte';

	let saved = $state(false);

	function saveCurrent() {
		if (!quoteStore.current) return;
		// Snapshot the live liability results onto the quote so they persist and reopen (AC3).
		quoteStore.setResults(liability.results);
		void savedQuotes.save(quoteStore.current).then(() => {
			saved = true;
			setTimeout(() => (saved = false), 1500);
		});
	}

	// --- Create-quote form state ---
	let newName = $state('');
	let newTaxRateStr = $state('');

	const createCandidate = $derived({
		name: newName,
		corporateTaxRate: newTaxRateStr.trim() === '' ? Number.NaN : Number(newTaxRateStr)
	});
	const createErrors = $derived(fieldErrors(CompanySchema, createCandidate));

	function createQuote() {
		if (Object.keys(createErrors).length > 0) return;
		quoteStore.create({
			companyName: createCandidate.name,
			corporateTaxRate: createCandidate.corporateTaxRate
		});
		newName = '';
		newTaxRateStr = '';
	}
</script>

<svelte:head><title>Schiff SERP — Setup</title></svelte:head>

<main>
	<h1>Schiff SERP</h1>

	<QuoteList />

	{#if !quoteStore.current}
		<section>
			<h2>Create a new quote</h2>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					createQuote();
				}}
			>
				<label>
					<span>Prospect company name</span>
					<input type="text" bind:value={newName} aria-invalid={!!createErrors.name} />
					{#if createErrors.name && newName !== ''}
						<span class="error">{createErrors.name}</span>
					{/if}
				</label>
				<label>
					<span>Corporate tax rate (0–1)</span>
					<input
						type="number"
						step="0.01"
						min="0"
						max="1"
						bind:value={newTaxRateStr}
						aria-invalid={!!createErrors.corporateTaxRate}
					/>
					{#if createErrors.corporateTaxRate && newTaxRateStr !== ''}
						<span class="error">{createErrors.corporateTaxRate}</span>
					{/if}
				</label>
				<button type="submit" disabled={Object.keys(createErrors).length > 0}>Create quote</button>
			</form>
		</section>
	{:else}
		<section>
			<div class="header">
				<h2>{quoteStore.current.company.name || 'Untitled quote'}</h2>
				<div class="header-actions">
					<button type="button" onclick={saveCurrent}>{saved ? 'Saved ✓' : 'Save quote'}</button>
					<button type="button" onclick={() => quoteStore.close()}>New quote</button>
				</div>
			</div>
			<div class="forms">
				<CompanyForm />
				<ModelSettingsForm />
			</div>
			<div class="census">
				<h2>Executive census</h2>
				<CensusEditor />
			</div>
			<LiabilityResults />
		</section>
	{/if}
</main>

<style>
	main {
		max-width: 48rem;
		margin: 0 auto;
		padding: 2rem 1rem;
	}
	form {
		display: grid;
		gap: 0.75rem;
		max-width: 24rem;
	}
	label {
		display: grid;
		gap: 0.25rem;
	}
	.header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}
	.header-actions {
		display: flex;
		gap: 0.5rem;
	}
	.forms {
		display: grid;
		gap: 1.5rem;
	}
	.census {
		margin-top: 1.5rem;
	}
	.error {
		color: #b00020;
		font-size: 0.85rem;
	}
	button {
		justify-self: start;
		padding: 0.5rem 1rem;
	}
</style>
