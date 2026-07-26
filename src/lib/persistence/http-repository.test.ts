/**
 * HttpQuoteRepository — contract tests against a stubbed `fetch`. These lock the client half of
 * the persistence swap: correct URLs/methods, 404 → null on load, schema validation on read, and
 * a thrown error on any non-OK response. The Postgres half is verified against a live database.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpQuoteRepository } from './http-repository';
import { makeInsured } from '$lib/testing/fixtures';
import { DEFAULT_MODEL_SETTINGS, SCHEMA_VERSION, type Quote } from '$lib/domain';

function makeQuote(): Quote {
	return {
		schemaVersion: SCHEMA_VERSION,
		id: 'q1',
		company: { name: 'Acme Widgets', corporateTaxRate: 0.21 },
		modelSettings: { ...DEFAULT_MODEL_SETTINGS },
		census: [makeInsured({ id: 'a' })],
		results: null
	};
}

function stubFetch(impl: (url: string, init?: RequestInit) => Response) {
	const spy = vi.fn((input: string | URL | Request, init?: RequestInit) =>
		Promise.resolve(impl(String(input), init))
	);
	vi.stubGlobal('fetch', spy);
	return spy;
}

afterEach(() => vi.unstubAllGlobals());

const repo = new HttpQuoteRepository();

describe('HttpQuoteRepository', () => {
	it('lists via GET /api/quotes', async () => {
		const fetchSpy = stubFetch(() => Response.json([{ id: 'q1', companyName: 'Acme Widgets' }]));
		const summaries = await repo.list();
		expect(fetchSpy).toHaveBeenCalledWith('/api/quotes');
		expect(summaries).toEqual([{ id: 'q1', companyName: 'Acme Widgets' }]);
	});

	it('loads and validates a quote via GET /api/quotes/:id', async () => {
		const quote = makeQuote();
		const fetchSpy = stubFetch(() => Response.json(quote));
		const loaded = await repo.get('q1');
		expect(fetchSpy).toHaveBeenCalledWith('/api/quotes/q1');
		expect(loaded?.company.name).toBe('Acme Widgets');
	});

	it('returns null when a quote is not found (404)', async () => {
		stubFetch(() => new Response(null, { status: 404 }));
		expect(await repo.get('missing')).toBeNull();
	});

	it('saves via POST /api/quotes with a JSON body', async () => {
		const fetchSpy = stubFetch(() => new Response(null, { status: 204 }));
		await repo.save(makeQuote());
		const [url, init] = fetchSpy.mock.calls[0];
		expect(url).toBe('/api/quotes');
		expect(init?.method).toBe('POST');
		expect(JSON.parse(init?.body as string).id).toBe('q1');
	});

	it('deletes via DELETE /api/quotes/:id', async () => {
		const fetchSpy = stubFetch(() => new Response(null, { status: 204 }));
		await repo.delete('q1');
		expect(fetchSpy).toHaveBeenCalledWith('/api/quotes/q1', { method: 'DELETE' });
	});

	it('throws on a non-OK response', async () => {
		stubFetch(() => new Response(null, { status: 500 }));
		await expect(repo.list()).rejects.toThrow(/Failed to list/);
	});
});
