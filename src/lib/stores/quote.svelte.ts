/**
 * Active quote store — Svelte 5 runes (AR12, FR1).
 *
 * Holds the single active Quote the operator is editing. State lives on a shared class
 * instance so `quoteStore.current` is reactive across every component that reads it.
 *
 * All mutations are immutable-style: they reassign `current` (and the nested object being
 * changed) rather than deep-mutating, so `$derived`/`$effect` consumers track correctly and
 * the documented `DEFAULT_MODEL_SETTINGS` are never mutated (FR3).
 */
import {
	createQuote,
	type Company,
	type Insured,
	type ModelSettings,
	type Quote
} from '$lib/domain';

function generateId(): string {
	return crypto.randomUUID();
}

class QuoteStore {
	/** The active quote, or `null` when none has been created/opened yet. */
	current = $state<Quote | null>(null);

	/** True when there is an active quote. */
	get hasQuote(): boolean {
		return this.current !== null;
	}

	/** Create a new quote for a prospect company and make it active (FR1). */
	create(params: { companyName: string; corporateTaxRate: number }): Quote {
		const quote = createQuote({
			id: generateId(),
			companyName: params.companyName,
			corporateTaxRate: params.corporateTaxRate
		});
		this.current = quote;
		return quote;
	}

	/** Replace the active quote (e.g. when reopening a saved quote). */
	open(quote: Quote): void {
		this.current = quote;
	}

	/** Clear the active quote. */
	close(): void {
		this.current = null;
	}

	/** Merge a partial company update into the active quote (FR1). */
	updateCompany(patch: Partial<Company>): void {
		if (!this.current) return;
		this.current = {
			...this.current,
			company: { ...this.current.company, ...patch }
		};
	}

	/** Merge a partial model-settings update; overrides persist on this quote only (FR2, FR3). */
	updateModelSettings(patch: Partial<ModelSettings>): void {
		if (!this.current) return;
		this.current = {
			...this.current,
			modelSettings: { ...this.current.modelSettings, ...patch }
		};
	}

	/** Replace the census (used by the census editor in Story 1.4). */
	setCensus(census: Insured[]): void {
		if (!this.current) return;
		this.current = { ...this.current, census };
	}
}

export const quoteStore = new QuoteStore();
