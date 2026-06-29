import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IllustrationResult } from '$lib/domain';

// Mock the credential boundary so the route uses a fake adapter (no $env, no network).
const { project } = vi.hoisted(() => ({ project: vi.fn() }));
vi.mock('$lib/server/lifeproj/credentials', () => ({
	getLifeprojAdapter: () => ({ project, schema: vi.fn() })
}));

import { POST } from './+server';

const validBody = {
	issueAge: 40,
	gender: 'M',
	riskClass: 'Standard Non Tobacco',
	faceAmount: '500000.00'
};

const result: IllustrationResult = {
	years: [],
	gptAdjusted: false,
	mecAdjusted: false,
	solvedAnnualPremium: '0.00',
	guideline: { singlePremium: '0.00', levelPremiumA: '0.00', levelPremiumB: '0.00' }
};

function postEvent(body: unknown) {
	const request = new Request('http://localhost/api/illustration', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	// Minimal RequestEvent shape the handler uses.
	return { request } as Parameters<typeof POST>[0];
}

describe('POST /api/illustration (AR7, NFR9)', () => {
	beforeEach(() => project.mockReset());

	it('returns the projection result on a valid request', async () => {
		project.mockResolvedValue(result);
		const response = await POST(postEvent(validBody));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(result);
		expect(project).toHaveBeenCalledOnce();
	});

	it('returns a 400 validation envelope and does not call the engine on a bad request', async () => {
		const response = await POST(postEvent({ gender: 'X' }));
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error.kind).toBe('validation');
		expect(body.error.details.length).toBeGreaterThan(0);
		expect(project).not.toHaveBeenCalled();
	});

	// Note: adapter-error → envelope/status pass-through is covered by error-envelope.test.ts
	// (toErrorEnvelope) and illustration-client.test.ts, so it is not duplicated here.
});
