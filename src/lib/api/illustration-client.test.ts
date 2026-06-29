import { describe, it, expect, vi } from 'vitest';
import { postIllustration } from './illustration-client';
import { ApiError } from './api-error';
import type { DesignRequest, IllustrationResult } from '$lib/domain';

const request: DesignRequest = {
	issueAge: 40,
	gender: 'M',
	riskClass: 'Standard Non Tobacco',
	faceAmount: '500000.00'
};

const result: IllustrationResult = {
	years: [
		{
			policyYear: 1,
			age: 41,
			premium: '8000.00',
			accountValue: '7000.50',
			cashSurrenderValue: '7000.50',
			deathBenefit: '500000.00'
		}
	],
	gptAdjusted: false,
	mecAdjusted: true,
	solvedAnnualPremium: '8000.00',
	guideline: { singlePremium: '50000.00', levelPremiumA: '6000.00', levelPremiumB: '6500.00' }
};

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

describe('postIllustration (AR6)', () => {
	it('POSTs the same-origin BFF route and returns the parsed result', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(result));
		const out = await postIllustration(request, { fetch: fetchMock });

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('/api/illustration'); // same-origin, never lifeproj
		expect(init.method).toBe('POST');
		expect(out).toEqual(result);
	});

	it('throws an ApiError carrying the server envelope kind on a mapped error', async () => {
		const envelope = { error: { kind: 'projection', message: 'rate miss' } };
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(envelope, 422));

		await expect(postIllustration(request, { fetch: fetchMock })).rejects.toMatchObject({
			kind: 'projection',
			status: 422,
			message: 'rate miss'
		});
	});

	it('surfaces validation details from the envelope', async () => {
		const envelope = {
			error: {
				kind: 'validation',
				message: 'Invalid design request',
				details: [{ field: 'gender', message: 'required' }]
			}
		};
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(envelope, 400));

		await expect(postIllustration(request, { fetch: fetchMock })).rejects.toMatchObject({
			kind: 'validation',
			details: [{ field: 'gender', message: 'required' }]
		});
	});

	it('maps a network failure to a connectivity ApiError', async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
		const error = await postIllustration(request, { fetch: fetchMock }).catch((e) => e);
		expect(error).toBeInstanceOf(ApiError);
		expect(error.kind).toBe('connectivity');
	});
});
