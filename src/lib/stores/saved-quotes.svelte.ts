/**
 * Saved-quotes store — a thin reactive façade over the QuoteRepository (FR33–FR35).
 *
 * The UI reads `savedQuotes.summaries` and calls save/remove/load here; it never touches the
 * repository directly, and the repository is reached only through the QuoteRepository
 * interface — so swapping localStorage for a DB changes nothing in stores or UI (NFR14).
 */
import { getQuoteRepository } from '$lib/persistence/local-storage-repository';
import type { QuoteRepository, QuoteSummary } from '$lib/persistence/quote-repository';
import type { Quote } from '$lib/domain';

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

	/** Load a full quote by id for reopening (FR33). */
	async load(id: string): Promise<Quote | null> {
		return this.repo().get(id);
	}
}

export const savedQuotes = new SavedQuotesStore();
