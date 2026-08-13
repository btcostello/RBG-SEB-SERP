/**
 * Live liability store (FR16, NFR6, AR12).
 *
 * Liability is a `$derived` of the active quote: whenever any liability-relevant input
 * (census, model settings) changes, `current` recomputes via the pure engine and `results`
 * re-maps to the domain `Results` snapshot. The engine is fast and in-browser, so the view
 * updates sub-second. Nothing here mutates the quote — the snapshot is written onto the quote
 * explicitly at save time (see the Setup route), avoiding reactive loops.
 */
import * as v from 'valibot';
import { quoteStore } from './quote.svelte';
import { computeLiability, type LiabilityResult } from '$lib/engine/compute-liability';
import { toResults } from '$lib/engine/results-mapping';
import { InsuredSchema, type Results } from '$lib/domain';

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
		// The engine is intentionally strict: a blank or non-numeric cell in a half-typed row makes a
		// pure formula throw (e.g. a NaN retirement age yields an empty salary path). The live preview
		// must tolerate rows still being edited, so compute over only the census rows that currently
		// satisfy the schema — a completed row's figures keep showing while another is mid-edit, and a
		// row joins the results the moment it validates. The try/catch is a backstop for a transiently
		// invalid model setting (e.g. a cleared NPV rate): blank the preview rather than crash the page.
		const validCensus = quote.census.filter((insured) => v.is(InsuredSchema, insured));
		try {
			return computeLiability({
				census: validCensus,
				settings: quote.modelSettings,
				asOf: today()
			});
		} catch {
			return null;
		}
	});

	/** Domain Results snapshot (decimal strings) for display, persistence, and the report. */
	readonly results = $derived.by((): Results | null =>
		this.current ? toResults(this.current) : null
	);
}

export const liability = new LiabilityStore();
