<script lang="ts">
	/**
	 * Setup screen ("/") — create and configure a quote (Story 1.3).
	 * No active quote -> a create form (company name + tax rate). Active quote -> the
	 * company and model-settings editors, plus a summary of the prospect company.
	 */
	import { quoteStore } from '$lib/stores/quote.svelte';
	import { savedQuotes } from '$lib/stores/saved-quotes.svelte';
	import { liability } from '$lib/stores/liability.svelte';
	import { runState } from '$lib/stores/run-state.svelte';
	import { CompanySchema, fieldErrors } from '$lib/domain';
	import CompanyForm from '$lib/components/CompanyForm.svelte';
	import ModelSettingsForm from '$lib/components/ModelSettingsForm.svelte';
	import CensusEditor from '$lib/components/CensusEditor.svelte';
	import LiabilityResults from '$lib/components/LiabilityResults.svelte';
	import RunButton from '$lib/components/RunButton.svelte';
	import ProgressIndicator from '$lib/components/ProgressIndicator.svelte';
	import AssetResults from '$lib/components/AssetResults.svelte';
	import QuoteList from '$lib/components/QuoteList.svelte';

	let saved = $state(false);

	function saveCurrent() {
		if (!quoteStore.current) return;
		// A completed run already wrote the full Results (incl. the COLI asset aggregate — total
		// death benefit and total first-year premium) onto the quote. Only snapshot the live
		// liability-only results when no run has populated them yet, so saving never clobbers the
		// asset figures the report depends on (FR30); a never-run quote still persists liability (AC3).
		if (runState.status !== 'done') {
			quoteStore.setResults(liability.results);
		}
		void savedQuotes.save(quoteStore.current).then(() => {
			saved = true;
			setTimeout(() => (saved = false), 1500);
		});
	}

	// --- Create-quote form state ---
	// Only the company name is collected up front; the corporate tax rate starts at a documented
	// default and is set by the operator in the company form after the quote is created.
	const DEFAULT_CORPORATE_TAX_RATE = 0.2;
	let newName = $state('');

	const createCandidate = $derived({
		name: newName,
		corporateTaxRate: DEFAULT_CORPORATE_TAX_RATE
	});
	const createErrors = $derived(fieldErrors(CompanySchema, createCandidate));

	function createQuote() {
		if (Object.keys(createErrors).length > 0) return;
		quoteStore.create({
			companyName: createCandidate.name,
			corporateTaxRate: DEFAULT_CORPORATE_TAX_RATE
		});
		newName = '';
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
			<RunButton />
			<ProgressIndicator />
			<LiabilityResults />
			<AssetResults />
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
