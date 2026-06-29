import { describe, it, expect, vi } from 'vitest';
import { createLifeprojAdapter, mapDesignRequestToWire } from './adapter';
import {
	LifeprojAuthError,
	LifeprojConnectivityError,
	LifeprojProjectionError,
	LifeprojValidationError
} from './errors';
import type { DesignRequest } from '$lib/domain';

const request: DesignRequest = {
	issueAge: 40,
	gender: 'M',
	riskClass: 'Standard Non Tobacco',
	faceAmount: '500000.00',
	productType: 'IUL',
	annualPremium: '8000.00',
	solve: { value: '1000.00', when: 100, basis: 'age' }
};

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

const successBody = {
	report: [
		{
			policy_year: 1,
			age: 41,
			attained_age: 40,
			premium: 8000,
			account_value: 7000.5,
			death_benefit: 500000,
			status: 'in_force'
		},
		{
			policy_year: 2,
			age: 42,
			attained_age: 41,
			premium: 8000,
			account_value: 14500.25,
			death_benefit: 500000,
			status: 'in_force'
		}
	],
	charges: [],
	credits: [],
	loans: [],
	summary: {
		initial_face_amount: 500000,
		initial_annual_premium: 8000,
		guideline_single_premium: 50000,
		guideline_level_premium_a: 6000,
		guideline_level_premium_b: 6500,
		lapse_year: null
	},
	solve: null,
	gpt_adjusted: false,
	mec_adjusted: true,
	policy: {}
};

describe('mapDesignRequestToWire (NFR12)', () => {
	it('maps camelCase domain fields to snake_case wire fields', () => {
		const wire = mapDesignRequestToWire(request);
		expect(wire.issue_age).toBe(40);
		expect(wire.gender).toBe('M');
		expect(wire.health).toBe('Standard Non Tobacco');
		expect(wire.face_amount).toBe(500000);
		expect(wire.annual_premium).toBe(8000);
		expect(wire.product_type).toBe('IUL');
		expect(wire.solve).toEqual({ value: 1000, when: 100, basis: 'age' });
	});

	it('carries no name / DOB / identifier fields (PII cannot leak)', () => {
		const wire = mapDesignRequestToWire(request) as Record<string, unknown>;
		for (const forbidden of ['name', 'first_name', 'last_name', 'dob', 'date_of_birth', 'id']) {
			expect(wire).not.toHaveProperty(forbidden);
		}
	});
});

describe('createLifeprojAdapter.project', () => {
	it('injects X-API-Key server-side and POSTs the project endpoint (FR4, NFR13)', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(successBody));
		const adapter = createLifeprojAdapter({
			baseUrl: 'https://engine.example',
			apiKey: 'secret-key',
			fetch: fetchMock
		});

		await adapter.project(request);

		expect(fetchMock).toHaveBeenCalledOnce();
		const [calledUrl, init] = fetchMock.mock.calls[0];
		expect(calledUrl).toBe('https://engine.example/api/v1/project');
		expect(init.method).toBe('POST');
		expect(init.headers['X-API-Key']).toBe('secret-key');
		expect(JSON.parse(init.body).health).toBe('Standard Non Tobacco');
	});

	it('maps a 200 response to an IllustrationResult with money strings (FR20, NFR8)', async () => {
		const adapter = createLifeprojAdapter({
			baseUrl: 'https://engine.example',
			apiKey: 'k',
			fetch: vi.fn().mockResolvedValue(jsonResponse(successBody))
		});

		const result = await adapter.project(request);

		expect(result.years).toHaveLength(2);
		expect(result.years[0]).toEqual({
			policyYear: 1,
			age: 41,
			premium: '8000.00',
			accountValue: '7000.50',
			cashSurrenderValue: '7000.50',
			deathBenefit: '500000.00'
		});
		expect(result.gptAdjusted).toBe(false);
		expect(result.mecAdjusted).toBe(true);
		expect(result.solvedAnnualPremium).toBe('8000.00');
		expect(result.guideline).toEqual({
			singlePremium: '50000.00',
			levelPremiumA: '6000.00',
			levelPremiumB: '6500.00'
		});
	});

	it('maps 400 to LifeprojValidationError with field details (AR8)', async () => {
		const body = {
			error: 'validation_failed',
			details: [{ field: 'gender', message: 'must be one of M, F' }]
		};
		const adapter = createLifeprojAdapter({
			baseUrl: 'https://e',
			apiKey: 'k',
			fetch: vi.fn().mockResolvedValue(jsonResponse(body, 400))
		});

		await expect(adapter.project(request)).rejects.toMatchObject({
			kind: 'validation',
			details: [{ field: 'gender', message: 'must be one of M, F' }]
		});
		await expect(adapter.project(request)).rejects.toBeInstanceOf(LifeprojValidationError);
	});

	it('maps 401 to LifeprojAuthError', async () => {
		const adapter = createLifeprojAdapter({
			baseUrl: 'https://e',
			apiKey: 'k',
			fetch: vi.fn().mockResolvedValue(jsonResponse({ error: 'unauthorized' }, 401))
		});
		await expect(adapter.project(request)).rejects.toBeInstanceOf(LifeprojAuthError);
	});

	it('maps 422 to LifeprojProjectionError carrying the message', async () => {
		const adapter = createLifeprojAdapter({
			baseUrl: 'https://e',
			apiKey: 'k',
			fetch: vi
				.fn()
				.mockResolvedValue(jsonResponse({ error: 'projection_failed', message: 'rate miss' }, 422))
		});
		await expect(adapter.project(request)).rejects.toMatchObject({
			kind: 'projection',
			message: 'rate miss'
		});
		await expect(adapter.project(request)).rejects.toBeInstanceOf(LifeprojProjectionError);
	});

	it('maps a network failure to LifeprojConnectivityError', async () => {
		const adapter = createLifeprojAdapter({
			baseUrl: 'https://e',
			apiKey: 'k',
			fetch: vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
		});
		await expect(adapter.project(request)).rejects.toBeInstanceOf(LifeprojConnectivityError);
	});
});
