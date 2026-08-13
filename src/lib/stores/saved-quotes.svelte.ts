/**
 * Saved-quotes store — a thin reactive façade over the QuoteRepository (FR33–FR35).
 *
 * The UI reads `savedQuotes.summaries` and calls save/remove/load here; it never touches the
 * repository directly, and the repository is reached only through the QuoteRepository
 * interface — so swapping localStorage for a DB changes nothing in stores or UI (NFR14).
 */
import { getQuoteRepository } from '$lib/persistence/http-repository';
import type { QuoteRepository, QuoteSummary } from '$lib/persistence/quote-repository';
import { duplicateQuote, type Quote } from '$lib/domain';

class SavedQuotesStore {
	/** Saved quote summaries, refreshed after every mutation. */
	summaries = $state<QuoteSummary[]>([]);

	private repo(): QuoteRepository {
		return getQuoteRepository();
	}

	/** Reload the list from storage. */
	async refresh(): Promise<void> {
		this.summaries = await this.repo().list();
	}

	/** Save (insert or overwrite) a quote and refresh the list (FR33). */
	async save(quote: Quote): Promise<void> {
		await this.repo().save(quote);
		await this.refresh();
	}

	/** Delete a quote and refresh the list (FR35). */
	async remove(id: string): Promise<void> {
		await this.repo().delete(id);
		await this.refresh();
	}

	/**
	 * Save a copy of a quote object: clone it under a fresh id and a distinct "(copy)" name, persist
	 * the copy, and refresh the list. The source quote is passed by value, so this works for both a
	 * saved snapshot ({@link duplicate}) and the live in-memory quote ("Save as copy" in the setup
	 * workspace). Returns the new copy.
	 */
	async saveCopyOf(quote: Quote): Promise<Quote> {
		const copy = duplicateQuote(quote, crypto.randomUUID(), this.summaries.map((s) => s.companyName));
		await this.repo().save(copy);
		await this.refresh();
		return copy;
	}

	/**
	 * Duplicate a saved quote: load its stored snapshot, then save a copy. Non-destructive — it
	 * leaves the original and the active quote untouched. Returns the copy, or `null` if the source
	 * no longer exists.
	 */
	async duplicate(id: string): Promise<Quote | null> {
		const original = await this.repo().get(id);
		if (!original) return null;
		return this.saveCopyOf(original);
	}

	/** Load a full quote by id for reopening (FR33). */
	async load(id: string): Promise<Quote | null> {
		return this.repo().get(id);
	}
}

export const savedQuotes = new SavedQuotesStore();
