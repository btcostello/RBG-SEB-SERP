/**
 * Live liability store (FR16, NFR6, AR12).
 *
 * Liability is a `$derived` of the active quote: whenever any liability-relevant input
 * (census, model settings) changes, `current` recomputes via the pure engine and `results`
 * re-maps to the domain `Results` snapshot. The engine is fast and in-browser, so the view
 * updates sub-second. Nothing here mutates the quote — the snapshot is written onto the quote
 * explicitly at save time (see the Setup route), avoiding reactive loops.
 */
import { quoteStore } from './quote.svelte';
import { computeLiability, type LiabilityResult } from '$lib/engine/compute-liability';
import { toResults } from '$lib/engine/results-mapping';
import type { Results } from '$lib/domain';

/** Valuation date = today (local), ISO YYYY-MM-DD. Drives age-nearest-birthday + NPV timing. */
function today(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

class LiabilityStore {
	/** Engine result (Big) derived from the active quote, or `null` when no quote is active. */
	readonly current = $derived.by((): LiabilityResult | null => {
		const quote = quoteStore.current;
		if (!quote) return null;
		return computeLiability({
			census: quote.census,
			settings: quote.modelSettings,
			asOf: today()
		});
	});

	/** Domain Results snapshot (decimal strings) for display, persistence, and the report. */
	readonly results = $derived.by((): Results | null =>
		this.current ? toResults(this.current) : null
	);
}

export const liability = new LiabilityStore();
