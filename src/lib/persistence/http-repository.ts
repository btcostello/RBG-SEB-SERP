/**
 * HTTP-backed QuoteRepository (browser) — talks to the /api/quotes routes, which persist to
 * Postgres server-side. Implements the same QuoteRepository interface as the localStorage version,
 * so the saved-quotes store and UI are unchanged (the interface was async from day one for exactly
 * this swap).
 *
 * Loaded quotes are validated against QuoteSchema before use, the same guarantee the localStorage
 * path gives via `deserializeQuote`.
 */
import * as v from 'valibot';
import { QuoteSchema, type Quote } from '$lib/domain';
import type { QuoteRepository, QuoteSummary } from './quote-repository';
import { serializeQuote } from './serialization';

const BASE = '/api/quotes';

export class HttpQuoteRepository implements QuoteRepository {
	async list(): Promise<QuoteSummary[]> {
		const res = await fetch(BASE);
		if (!res.ok) throw new Error(`Failed to list saved quotes (${res.status}).`);
		return (await res.json()) as QuoteSummary[];
	}

	async get(id: string): Promise<Quote | null> {
		const res = await fetch(`${BASE}/${encodeURIComponent(id)}`);
		if (res.status === 404) return null;
		if (!res.ok) throw new Error(`Failed to load quote (${res.status}).`);
		return v.parse(QuoteSchema, await res.json());
	}

	async save(quote: Quote): Promise<void> {
		const res = await fetch(BASE, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: serializeQuote(quote)
		});
		if (!res.ok) throw new Error(`Failed to save quote (${res.status}).`);
	}

	async delete(id: string): Promise<void> {
		const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
		if (!res.ok) throw new Error(`Failed to delete quote (${res.status}).`);
	}
}

let instance: QuoteRepository | null = null;

/** The browser-backed repository singleton (HTTP → Postgres). */
export function getQuoteRepository(): QuoteRepository {
	if (!instance) instance = new HttpQuoteRepository();
	return instance;
}
