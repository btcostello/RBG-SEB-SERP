/**
 * Postgres-backed QuoteRepository (server-only) — the durable replacement for the localStorage
 * implementation. Implements the exact same interface, so nothing in the stores/UI/calc changes;
 * the browser reaches it through the API routes + the HTTP repository.
 *
 * Each quote round-trips as `jsonb`: money stays a decimal string, so every value survives
 * byte-for-byte, and on read the stored object is validated against `QuoteSchema` (the single
 * place a future `schemaVersion` migration would live).
 */
import * as v from 'valibot';
import { QuoteSchema, type Quote } from '$lib/domain';
import type { QuoteRepository, QuoteSummary } from '$lib/persistence/quote-repository';
import { ensureSchema, getSql } from '../db/client';

export class PostgresQuoteRepository implements QuoteRepository {
	async list(): Promise<QuoteSummary[]> {
		await ensureSchema();
		const rows = await getSql()<{ id: string; company_name: string }[]>`
			SELECT id, company_name FROM quotes ORDER BY company_name ASC, id ASC
		`;
		return rows.map((row) => ({ id: row.id, companyName: row.company_name }));
	}

	async get(id: string): Promise<Quote | null> {
		await ensureSchema();
		const rows = await getSql()<{ data: unknown }[]>`SELECT data FROM quotes WHERE id = ${id}`;
		if (rows.length === 0) return null;
		// jsonb comes back already parsed; validate it against the current schema.
		return v.parse(QuoteSchema, rows[0].data);
	}

	async save(quote: Quote): Promise<void> {
		await ensureSchema();
		const sql = getSql();
		await sql`
			INSERT INTO quotes (id, company_name, data, updated_at)
			VALUES (${quote.id}, ${quote.company.name}, ${sql.json(quote as never)}, now())
			ON CONFLICT (id) DO UPDATE SET
				company_name = EXCLUDED.company_name,
				data = EXCLUDED.data,
				updated_at = now()
		`;
	}

	async delete(id: string): Promise<void> {
		await ensureSchema();
		await getSql()`DELETE FROM quotes WHERE id = ${id}`;
	}
}

let instance: QuoteRepository | null = null;

/** The server-side repository singleton (long-lived under adapter-node). */
export function getServerQuoteRepository(): QuoteRepository {
	if (!instance) instance = new PostgresQuoteRepository();
	return instance;
}
