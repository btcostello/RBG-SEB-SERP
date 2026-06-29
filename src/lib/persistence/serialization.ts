/**
 * Quote ⇄ JSON serialization (NFR11, AR18).
 *
 * Money lives in the Quote as decimal strings, so JSON round-trips every monetary value
 * exactly (e.g. "162240.00" survives byte-for-byte). On read, the JSON is validated against
 * the QuoteSchema, which both guarantees shape and gives a single place to handle a future
 * schemaVersion migration.
 */
import * as v from 'valibot';
import { QuoteSchema, type Quote } from '$lib/domain';

/** Serialize a quote to a storage string. */
export function serializeQuote(quote: Quote): string {
	return JSON.stringify(quote);
}

/**
 * Parse and validate a stored quote string back into a Quote. Throws if the JSON is malformed
 * or does not satisfy the current schema (e.g. an incompatible schemaVersion).
 */
export function deserializeQuote(json: string): Quote {
	const parsed: unknown = JSON.parse(json);
	return v.parse(QuoteSchema, parsed);
}
