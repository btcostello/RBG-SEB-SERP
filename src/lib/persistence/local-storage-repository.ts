/**
 * localStorage-backed QuoteRepository (FR33–FR35).
 *
 * Each quote is stored under `schiff-serp:quote:<id>`. Listing scans those keys, so there is
 * no separate index to keep in sync. The repository depends on a minimal `KeyValueStorage`
 * port (a structural subset of the DOM `Storage`) so it can be unit-tested against an
 * in-memory fake and is decoupled from the global `localStorage`.
 */
import type { Quote } from '$lib/domain';
import type { QuoteRepository, QuoteSummary } from './quote-repository';
import { deserializeQuote, serializeQuote } from './serialization';

/** The slice of the DOM Storage API this repository needs. `localStorage` satisfies it. */
export interface KeyValueStorage {
	readonly length: number;
	key(index: number): string | null;
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

const KEY_PREFIX = 'schiff-serp:quote:';

export class LocalStorageQuoteRepository implements QuoteRepository {
	constructor(private readonly storage: KeyValueStorage) {}

	async list(): Promise<QuoteSummary[]> {
		const summaries: QuoteSummary[] = [];
		for (let i = 0; i < this.storage.length; i++) {
			const key = this.storage.key(i);
			if (!key || !key.startsWith(KEY_PREFIX)) continue;
			const json = this.storage.getItem(key);
			if (!json) continue;
			try {
				const quote = deserializeQuote(json);
				summaries.push({ id: quote.id, companyName: quote.company.name });
			} catch {
				// Skip corrupt or schema-incompatible entries rather than breaking the whole list.
			}
		}
		summaries.sort((a, b) => a.companyName.localeCompare(b.companyName));
		return summaries;
	}

	async get(id: string): Promise<Quote | null> {
		const json = this.storage.getItem(KEY_PREFIX + id);
		return json ? deserializeQuote(json) : null;
	}

	async save(quote: Quote): Promise<void> {
		this.storage.setItem(KEY_PREFIX + quote.id, serializeQuote(quote));
	}

	async delete(id: string): Promise<void> {
		this.storage.removeItem(KEY_PREFIX + id);
	}
}

let instance: QuoteRepository | null = null;

/**
 * The browser-backed repository singleton. Resolves `localStorage` lazily at call time, so
 * importing this module is SSR-safe — only call it in the browser (event handlers / onMount).
 */
export function getQuoteRepository(): QuoteRepository {
	if (!instance) {
		instance = new LocalStorageQuoteRepository(localStorage);
	}
	return instance;
}
