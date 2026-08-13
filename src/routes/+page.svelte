<script lang="ts">
	/**
	 * Setup screen ("/") — create and configure a quote (Story 1.3).
	 * No active quote -> a create form (company name + tax rate). Active quote -> the
	 * company and model-settings editors, plus a summary of the prospect company.
	 */
	import * as v from 'valibot';
	import { quoteStore } from '$lib/stores/quote.svelte';
	import { savedQuotes } from '$lib/stores/saved-quotes.svelte';
	import { liability } from '$lib/stores/liability.svelte';
	import { runState } from '$lib/stores/run-state.svelte';
	import { CompanySchema, QuoteSchema, fieldErrors } from '$lib/domain';
	import CompanyForm from '$lib/components/CompanyForm.svelte';
	import ModelSettingsForm from '$lib/components/ModelSettingsForm.svelte';
	import CensusEditor from '$lib/components/CensusEditor.svelte';
	import RunButton from '$lib/components/RunButton.svelte';
	import ProgressIndicator from '$lib/components/ProgressIndicator.svelte';
	import WorkspaceResults from '$lib/components/WorkspaceResults.svelte';
	import QuoteList from '$lib/components/QuoteList.svelte';

	let saved = $state(false);
	let saveError = $state<string | null>(null);

	async function saveCurrent() {
		if (!quoteStore.current) return;
		saveError = null;
		// Guard FIRST: the server validates the whole quote against QuoteSchema, and a single blank or
		// non-numeric cell (most often an advanced census column) serializes to `null` and gets the
		// ENTIRE save rejected with a 400. Run the same check here — before touching the results calc,
		// which itself throws on an incomplete row — so the failure surfaces as a clear message
		// pointing at the incomplete rows, never a silent no-op that looks like a save.
		if (!v.is(QuoteSchema, quoteStore.current)) {
			saveError =
				'Some inputs are incomplete or invalid. Fix the census rows marked "!" before saving — nothing was saved.';
			return;
		}
		// A completed run already wrote the full Results (incl. the COLI asset aggregate — total
		// death benefit and total first-year premium) onto the quote. Only snapshot the live
		// liability-only results when no run has populated them yet, so saving never clobbers the
		// asset figures the report depends on (FR30); a never-run quote still persists liability (AC3).
		// Best-effort: if the live calc can't produce results, keep whatever is already on the quote
		// rather than aborting the save.
		if (runState.status !== 'done') {
			try {
				quoteStore.setResults(liability.results);
			} catch {
				// Leave the prior results snapshot in place.
			}
		}
		try {
			await savedQuotes.save(quoteStore.current);
			saved = true;
			setTimeout(() => (saved = false), 1500);
		} catch (e) {
			// Surface network/DB failures instead of swallowing them — a failed save must never look
			// like a successful one.
			saveError =
				e instanceof Error ? `Could not save: ${e.message}` : 'Could not save the quote. Please try again.';
		}
	}

	/**
	 * Fork the CURRENT in-memory quote — unsaved edits included — into a new saved copy and switch to
	 * editing that copy. The original's last saved snapshot (if any) is untouched, and no content is
	 * lost: the copy is a full clone of the live state. Same validate-first + surface-failures
	 * guarantees as {@link saveCurrent}.
	 */
	async function saveAsCopy() {
		if (!quoteStore.current) return;
		saveError = null;
		if (!v.is(QuoteSchema, quoteStore.current)) {
			saveError =
				'Some inputs are incomplete or invalid. Fix the census rows marked "!" before copying — nothing was saved.';
			return;
		}
		if (runState.status !== 'done') {
			try {
				quoteStore.setResults(liability.results);
			} catch {
				// Leave the prior results snapshot in place.
			}
		}
		try {
			const copy = await savedQuotes.saveCopyOf(quoteStore.current);
			quoteStore.open(copy); // continue editing the fork
			saved = true;
			setTimeout(() => (saved = false), 1500);
		} catch (e) {
			saveError =
				e instanceof Error ? `Could not save copy: ${e.message}` : 'Could not save a copy. Please try again.';
		}
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

<svelte:head><title>SERP-PLUS — Setup</title></svelte:head>

<main>
	<header class="masthead">
		<p class="eyebrow">COLI-Financed SERP · Proposal Workspace</p>
		<h1>SERP-PLUS</h1>
		<p class="byline">by The Ridgeback Group and Schiff Executive Benefits</p>
	</header>

	<QuoteList />

	{#if !quoteStore.current}
		<section class="panel create">
			<p class="eyebrow">New quote</p>
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
				<button class="btn btn-primary" type="submit" disabled={Object.keys(createErrors).length > 0}>
					Create quote
				</button>
			</form>
		</section>
	{:else}
		<section class="workspace">
			<div class="ws-header">
				<div>
					<p class="eyebrow">Active quote</p>
					<h2>{quoteStore.current.company.name || 'Untitled quote'}</h2>
				</div>
				<div class="ws-actions">
					<button class="btn btn-primary" type="button" onclick={saveCurrent}>
						{saved ? 'Saved ✓' : 'Save quote'}
					</button>
					<button class="btn btn-ghost" type="button" onclick={saveAsCopy}>Save as copy</button>
					<button class="btn btn-ghost" type="button" onclick={() => quoteStore.close()}>
						New quote
					</button>
				</div>
			</div>

			{#if saveError}
				<p class="save-error" role="alert">{saveError}</p>
			{/if}

			<!-- Inputs on top -->
			<div class="setup">
				<div class="setup-block">
					<p class="sec-eyebrow">Plan setup</p>
					<div class="forms">
						<CompanyForm />
						<ModelSettingsForm />
					</div>
				</div>

				<div class="setup-block">
					<CensusEditor />
				</div>

				<div class="run-block">
					<RunButton />
					<ProgressIndicator />
				</div>
			</div>

			<!-- Results below -->
			<div class="results">
				<WorkspaceResults />
			</div>
		</section>
	{/if}
</main>

<style>
	main {
		max-width: 66rem;
		margin: 0 auto;
		padding: 2.5rem 1.5rem 5rem;
	}

	/* ---- masthead ---- */
	.masthead {
		margin-bottom: 2rem;
	}
	.masthead h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 2.4rem;
		line-height: 1.05;
		letter-spacing: -0.015em;
		color: var(--ink);
		margin: 0 0 0.3rem;
	}
	.masthead .byline {
		font-family: var(--sans);
		font-size: 0.82rem;
		font-weight: 500;
		color: var(--muted);
		margin: 0;
	}

	/* ---- eyebrow ---- */
	.eyebrow {
		font-family: var(--sans);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--bronze-deep);
		margin: 0 0 0.5rem;
	}
	.eyebrow::before {
		content: '';
		display: inline-block;
		width: 20px;
		height: 2px;
		background: var(--bronze);
		margin-right: 9px;
		vertical-align: 0.22em;
	}

	/* section eyebrow inside the setup panel */
	.sec-eyebrow {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--bronze-deep);
		margin: 0 0 1rem;
		padding-bottom: 0.55rem;
		border-bottom: 1px solid var(--line);
		position: relative;
	}
	.sec-eyebrow::after {
		content: '';
		position: absolute;
		left: 0;
		bottom: -1px;
		width: 40px;
		height: 2px;
		background: var(--bronze);
	}

	/* ---- create panel (white card on the canvas) ---- */
	.panel {
		background: var(--paper);
		border: 1px solid var(--line);
		border-top: 3px solid var(--ink);
		border-radius: 2px;
		box-shadow: 0 1px 10px rgba(14, 37, 48, 0.06);
		padding: 1.5rem 1.75rem 1.75rem;
	}
	.panel h2 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 1.5rem;
		color: var(--ink);
		margin: 0;
	}
	.panel.create form {
		display: grid;
		gap: 0.85rem;
		max-width: 24rem;
		margin-top: 1rem;
	}
	.panel.create form input {
		width: 100%;
		max-width: 20rem;
	}
	label {
		display: grid;
		gap: 0.3rem;
		font-size: 0.85rem;
		color: var(--ink-soft);
	}

	/* ---- workspace: inputs on top, results below ---- */
	.workspace {
		display: flex;
		flex-direction: column;
		gap: 2.75rem;
	}
	.ws-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid var(--line);
		padding-bottom: 1.1rem;
	}
	.ws-header h2 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 1.7rem;
		color: var(--ink);
		margin: 0;
	}
	.ws-actions {
		display: flex;
		gap: 0.5rem;
		flex: 0 0 auto;
	}

	/* input band (a calm contained panel, distinct from the open results below) */
	.setup {
		background: var(--paper);
		border: 1px solid var(--line);
		border-radius: 2px;
		box-shadow: 0 1px 8px rgba(14, 37, 48, 0.05);
		padding: 1.75rem 1.9rem 1.9rem;
		display: flex;
		flex-direction: column;
		gap: 2.25rem;
	}
	.forms {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
		gap: 1.5rem;
		/* Each fieldset takes its natural height so the shorter column's inputs don't stretch. */
		align-items: start;
	}
	.run-block {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		border-top: 1px solid var(--line-soft);
		padding-top: 1.6rem;
	}

	/* ---- buttons ---- */
	.btn {
		font-family: var(--sans);
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		padding: 0.55rem 1.15rem;
		border-radius: 2px;
		border: 1px solid transparent;
		cursor: pointer;
		white-space: nowrap;
	}
	.btn-primary {
		background: var(--ink);
		color: #fff;
		border-color: var(--ink);
	}
	.btn-primary:hover:not(:disabled) {
		background: var(--accent-deep);
		border-color: var(--accent-deep);
	}
	.btn-primary:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.btn-ghost {
		background: transparent;
		color: var(--ink-soft);
		border-color: var(--line);
	}
	.btn-ghost:hover {
		color: var(--ink);
		border-color: var(--ink-soft);
	}

	.error {
		color: var(--warn-tx);
		font-size: 0.8rem;
	}

	/* Save-failure banner: a failed save must read as a clear error, never a silent no-op. */
	.save-error {
		margin: -1.5rem 0 0;
		padding: 0.7rem 1rem;
		background: var(--warn-bg, #f8eee7);
		border: 1px solid #d8b39c;
		border-radius: 2px;
		color: var(--warn-tx);
		font-size: 0.85rem;
		font-weight: 500;
	}
</style>
