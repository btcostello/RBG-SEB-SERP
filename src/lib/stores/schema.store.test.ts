import { describe, it, expect, vi } from 'vitest';
import { SchemaStore, extractRiskClasses, extractDefaults } from './schema.svelte';
import { RISK_CLASSES } from '$lib/domain';

const ENGINE_RISK_CLASSES = [...RISK_CLASSES];

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

describe('extractRiskClasses (tolerant to schema shape)', () => {
	it('finds the enum under a fields map', () => {
		const schema = { fields: { health: { type: 'string', enum: ENGINE_RISK_CLASSES } } };
		expect(extractRiskClasses(schema)).toEqual(ENGINE_RISK_CLASSES);
	});

	it('finds the enum under a fields array', () => {
		const schema = { fields: [{ name: 'health', values: ENGINE_RISK_CLASSES }] };
		expect(extractRiskClasses(schema)).toEqual(ENGINE_RISK_CLASSES);
	});

	it('returns null when no risk-class-like enum exists', () => {
		expect(extractRiskClasses({ fields: { issue_age: { type: 'integer' } } })).toBeNull();
		expect(extractRiskClasses({ unrelated: ['a', 'b', 'c'] })).toBeNull();
	});
});

describe('extractDefaults', () => {
	it('returns a top-level defaults object', () => {
		expect(extractDefaults({ defaults: { credited_rate: 0.05 } })).toEqual({ credited_rate: 0.05 });
	});
	it('returns null when absent', () => {
		expect(extractDefaults({ fields: {} })).toBeNull();
	});
});

describe('SchemaStore.load', () => {
	it('reconciles risk classes from the discovered schema (FR22)', async () => {
		const discovered = ['Preferred Best Non Tobacco', 'Standard Non Tobacco', 'Standard Tobacco'];
		const store = new SchemaStore();
		await store.load({
			fetch: vi.fn().mockResolvedValue(jsonResponse({ fields: { health: { enum: discovered } } }))
		});
		expect(store.status).toBe('ready');
		expect(store.riskClasses).toEqual(discovered);
		expect(store.usingFallback).toBe(false);
		expect(store.notice).toBeNull();
	});

	it('falls back to seeded risk classes + a non-blocking notice when unreachable (AR10/M-1)', async () => {
		const store = new SchemaStore();
		await store.load({ fetch: vi.fn().mockRejectedValue(new Error('offline')) });
		expect(store.status).toBe('fallback');
		expect(store.usingFallback).toBe(true);
		expect(store.riskClasses).toEqual(ENGINE_RISK_CLASSES);
		expect(store.notice).toBeTruthy();
	});

	it('keeps the seeded set if the schema lacks a recognizable enum', async () => {
		const store = new SchemaStore();
		await store.load({ fetch: vi.fn().mockResolvedValue(jsonResponse({ fields: {} })) });
		expect(store.status).toBe('ready');
		expect(store.riskClasses).toEqual(ENGINE_RISK_CLASSES);
	});

	it('is idempotent — a second load does not refetch once ready', async () => {
		const store = new SchemaStore();
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ fields: {} }));
		await store.load({ fetch: fetchMock });
		await store.load({ fetch: fetchMock });
		expect(fetchMock).toHaveBeenCalledOnce();
	});
});
