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
import * as v from 'valibot';
import { browser } from '$app/environment';
import {
	createQuote,
	QuoteSchema,
	type Company,
	type Insured,
	type ModelSettings,
	type Quote,
	type Results
} from '$lib/domain';

function generateId(): string {
	return crypto.randomUUID();
}

/**
 * Session-storage key for the active working quote. The quote lives in memory for reactivity,
 * but is mirrored here so a page reload or a direct visit to `/report` (a full page load, which
 * resets in-memory state) rehydrates the same quote — including its computed results — instead
 * of showing an empty screen. Cleared when the quote is closed. This is the transient working
 * copy; the explicit "Save quote" flow still persists named quotes separately (localStorage).
 */
const ACTIVE_QUOTE_KEY = 'schiff:active-quote';

class QuoteStore {
	/** The active quote, or `null` when none has been created/opened yet. */
	current = $state<Quote | null>(null);

	constructor() {
		if (!browser) return;
		// Rehydrate a working quote persisted from a previous page load, if it still validates.
		try {
			const raw = sessionStorage.getItem(ACTIVE_QUOTE_KEY);
			if (raw) {
				const parsed = v.safeParse(QuoteSchema, JSON.parse(raw));
				if (parsed.success) this.current = parsed.output;
				else sessionStorage.removeItem(ACTIVE_QUOTE_KEY); // stale/incompatible shape
			}
		} catch {
			// Corrupt storage — ignore and start fresh.
		}
		// Mirror every change (edits, run results, close) back to session storage.
		$effect.root(() => {
			$effect(() => {
				const quote = this.current;
				try {
					if (quote) sessionStorage.setItem(ACTIVE_QUOTE_KEY, JSON.stringify(quote));
					else sessionStorage.removeItem(ACTIVE_QUOTE_KEY);
				} catch {
					// Storage unavailable/full — persistence is best-effort.
				}
			});
		});
	}

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

	/** Replace the census wholesale. */
	setCensus(census: Insured[]): void {
		if (!this.current) return;
		this.current = { ...this.current, census };
	}

	/** Add an executive to the census; the store assigns a stable id (FR5, AR12). */
	addInsured(data: Omit<Insured, 'id'>): Insured {
		const insured: Insured = { ...data, id: generateId() };
		if (!this.current) return insured;
		this.current = { ...this.current, census: [...this.current.census, insured] };
		return insured;
	}

	/** Merge a partial update into one insured, immutably (FR5, AR12). */
	updateInsured(id: string, patch: Partial<Omit<Insured, 'id'>>): void {
		if (!this.current) return;
		this.current = {
			...this.current,
			census: this.current.census.map((insured) =>
				insured.id === id ? { ...insured, ...patch } : insured
			)
		};
	}

	/** Remove an insured from the census, immutably (FR5, AR12). */
	removeInsured(id: string): void {
		if (!this.current) return;
		this.current = {
			...this.current,
			census: this.current.census.filter((insured) => insured.id !== id)
		};
	}

	/** Snapshot the computed results onto the active quote (carried on serialize, FR16/NFR11). */
	setResults(results: Results | null): void {
		if (!this.current) return;
		this.current = { ...this.current, results };
	}
}

export const quoteStore = new QuoteStore();
