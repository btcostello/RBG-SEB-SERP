/**
 * QuoteRepository — the persistence seam (FR33–FR35, NFR14).
 *
 * The rest of the app (stores, UI) depends ONLY on this interface, never on a concrete
 * storage mechanism. The MVP implementation is localStorage-backed; swapping to a database
 * later is a reimplementation of this interface and touches no calc/UI code.
 *
 * The interface is async (Promise-returning) even though localStorage is synchronous, so a
 * future remote/DB implementation is a drop-in with no caller changes.
 */
import type { Quote } from '$lib/domain';

/** Lightweight listing entry — enough to populate the saved-quotes list (one per company). */
export interface QuoteSummary {
	id: string;
	companyName: string;
}

export interface QuoteRepository {
	/** All saved quotes as summaries (FR34). */
	list(): Promise<QuoteSummary[]>;
	/** Load a full quote by id, or `null` if not found (FR33). */
	get(id: string): Promise<Quote | null>;
	/** Persist (insert or overwrite) a quote by its id (FR33). */
	save(quote: Quote): Promise<void>;
	/** Remove a quote from storage (FR35). */
	delete(id: string): Promise<void>;
}
