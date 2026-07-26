/**
 * Rows rendered in keyed `{#each}` blocks must carry a stable, unique key.
 *
 * Keying by name looked safe until a census contained two participants sharing one — two blank
 * rows both abbreviate to "F. Last" — at which point Svelte throws `each_key_duplicate` and the
 * WHOLE report fails to render, with no console error and the previous page left on screen.
 * These tests pin the invariant at the data layer, where it is cheap to check.
 */
import { describe, it, expect } from 'vitest';
import { deriveReport } from './report-data';
import { createQuote, type Insured, type Quote } from '$lib/domain';
import { makeInsured } from '$lib/testing/fixtures';

/** Two participants with identical names — and two entirely blank rows, as the UI can create. */
function quoteWithDuplicateNames(): Quote {
	const census: Insured[] = [
		makeInsured({ id: 'a', firstName: 'Jane', lastName: 'Smith', planMembership: 'BOTH' }),
		makeInsured({ id: 'b', firstName: 'Jane', lastName: 'Smith', planMembership: 'BOTH' }),
		makeInsured({ id: 'c', firstName: '', lastName: '', planMembership: 'BOTH' }),
		makeInsured({ id: 'd', firstName: '', lastName: '', planMembership: 'BOTH' })
	];
	const quote = createQuote({ id: 'q', companyName: 'Acme', corporateTaxRate: 0.21 });
	quote.census = census;
	return quote;
}

const unique = (keys: string[]) => new Set(keys).size === keys.length;

describe('keyed row identity (report render safety)', () => {
	const report = deriveReport(quoteWithDuplicateNames(), '2026-07-18');

	it('gives face-vs-survivor rows a unique key despite duplicate names', () => {
		for (const analysis of Object.values(report.faceSurvivorByOption)) {
			expect(analysis.rows.length).toBeGreaterThan(0);
			// The display names genuinely collide — that is the point of the fixture.
			expect(unique(analysis.rows.map((r) => r.name))).toBe(false);
			expect(unique(analysis.rows.map((r) => r.insuredId))).toBe(true);
		}
	});

	it('gives legacy census and projection rows a unique key', () => {
		expect(unique(report.legacyCensus.map((r) => String(r.index)))).toBe(true);
		expect(unique(report.legacyProjections.map((r) => String(r.index)))).toBe(true);
	});

	it('gives ledger rows a unique key per plan year', () => {
		for (const ledger of Object.values(report.ledgerByOption)) {
			expect(unique(ledger.rows.map((r) => String(r.planYear)))).toBe(true);
		}
	});

	it('derives a report at all from a census of blank rows', () => {
		// The original failure surfaced as a blank page, not an exception here — but a census of
		// half-filled rows is exactly what the UI produces mid-entry, so it must not throw.
		expect(() => deriveReport(quoteWithDuplicateNames(), '2026-07-18')).not.toThrow();
		expect(report.benefitStatement).not.toBeNull();
	});
});
