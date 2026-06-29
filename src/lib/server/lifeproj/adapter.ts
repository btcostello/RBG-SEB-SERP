/**
 * lifeproj anti-corruption adapter (FR4, FR19, FR20, NFR8, NFR9, NFR12, NFR13).
 *
 * The SOLE module that knows the lifeproj wire shape and the SOLE holder of the API key. It
 * maps a domain `DesignRequest` (camelCase, actuarial-only) → the snake_case wire body, injects
 * `X-API-Key` server-side, POSTs `/api/v1/project`, and maps the response → a domain
 * `IllustrationResult`. Failures map to the typed, discriminated error model.
 *
 * Configuration (base URL, API key, fetch) is injected, so this module never imports `$env`
 * and stays unit-testable. The credential is read from `$env` only at the call site
 * (see `credentials.ts`), keeping it server-side and out of the browser bundle (NFR13).
 */
import * as v from 'valibot';
import { Big, formatMoney } from '$lib/money/money';
import type { DesignRequest, IllustrationResult } from '$lib/domain';
import {
	WireErrorSchema,
	WireProjectRequestSchema,
	WireProjectResponseSchema,
	type WireProjectRequest,
	type WireProjectResponse
} from './wire-schemas';
import {
	LifeprojAuthError,
	LifeprojConnectivityError,
	LifeprojProjectionError,
	LifeprojValidationError
} from './errors';

const PROJECT_PATH = '/api/v1/project';
const SCHEMA_PATH = '/api/v1/schema';
const DEFAULT_TIMEOUT_MS = 30_000;

/** Wire money is a JS number; cents strings convert losslessly. Confined to this boundary. */
function toWireNumber(moneyString: string): number {
	return Number(moneyString);
}

/** Wire number → domain decimal string, rounded to cents via the centralized policy (AR2). */
function toMoneyString(wireNumber: number): string {
	return formatMoney(new Big(wireNumber));
}

/** Map a domain DesignRequest to the snake_case wire body (actuarial fields only, NFR12). */
export function mapDesignRequestToWire(request: DesignRequest): WireProjectRequest {
	const wire: WireProjectRequest = {
		issue_age: request.issueAge,
		gender: request.gender,
		health: request.riskClass,
		face_amount: toWireNumber(request.faceAmount)
	};
	if (request.productType !== undefined) wire.product_type = request.productType;
	if (request.dbOption !== undefined) wire.db_option = request.dbOption;
	if (request.annualPremium !== undefined)
		wire.annual_premium = toWireNumber(request.annualPremium);
	if (request.premiumMode !== undefined) wire.premium_mode = request.premiumMode;
	if (request.creditedRate !== undefined) wire.credited_rate = request.creditedRate;
	if (request.qualificationTest !== undefined) wire.qualification_test = request.qualificationTest;
	if (request.maturityAge !== undefined) wire.maturity_age = request.maturityAge;
	if (request.solve !== undefined) {
		wire.solve = {
			value: toWireNumber(request.solve.value),
			when: request.solve.when,
			...(request.solve.basis !== undefined ? { basis: request.solve.basis } : {})
		};
	}
	return wire;
}

/** Map a parsed wire response to the domain IllustrationResult (camelCase, money strings). */
export function mapWireResponseToResult(wire: WireProjectResponse): IllustrationResult {
	return {
		years: wire.report.map((row) => ({
			policyYear: row.policy_year,
			age: row.age,
			premium: toMoneyString(row.premium),
			accountValue: toMoneyString(row.account_value),
			// The wire report exposes no separate surrender value; use account value as the net
			// surrender value (MVP — calibratable once /schema confirms a CSV field).
			cashSurrenderValue: toMoneyString(row.account_value),
			deathBenefit: toMoneyString(row.death_benefit)
		})),
		gptAdjusted: wire.gpt_adjusted,
		mecAdjusted: wire.mec_adjusted,
		solvedAnnualPremium: toMoneyString(wire.summary.initial_annual_premium),
		guideline: {
			singlePremium: toMoneyString(wire.summary.guideline_single_premium),
			levelPremiumA: toMoneyString(wire.summary.guideline_level_premium_a),
			levelPremiumB: toMoneyString(wire.summary.guideline_level_premium_b)
		}
	};
}

/** Inspect a non-OK response and throw the matching typed error (never returns). */
async function throwForErrorResponse(response: Response): Promise<never> {
	let body: unknown = null;
	try {
		body = await response.json();
	} catch {
		// Non-JSON error body — fall through to status-based mapping.
	}
	const parsed = v.safeParse(WireErrorSchema, body);
	const wireError = parsed.success ? parsed.output : undefined;

	switch (response.status) {
		case 400:
			throw new LifeprojValidationError(wireError?.details ?? []);
		case 401:
			throw new LifeprojAuthError();
		case 422:
			throw new LifeprojProjectionError(wireError?.message ?? 'lifeproj projection failed');
		default:
			throw new LifeprojConnectivityError(`lifeproj returned HTTP ${response.status}`);
	}
}

export interface LifeprojAdapterConfig {
	baseUrl: string;
	apiKey: string;
	/** Injectable for tests; defaults to the global fetch. */
	fetch?: typeof fetch;
	/** Per-call timeout in ms (default 30s). */
	timeoutMs?: number;
}

export interface LifeprojAdapter {
	/** Run a single projection. Throws a typed LifeprojError on any failure (whole-call fail). */
	project(request: DesignRequest, signal?: AbortSignal): Promise<IllustrationResult>;
	/** Fetch the engine's self-describing schema (open endpoint, no key). Raw JSON. */
	schema(signal?: AbortSignal): Promise<unknown>;
}

export function createLifeprojAdapter(config: LifeprojAdapterConfig): LifeprojAdapter {
	const fetchImpl = config.fetch ?? globalThis.fetch;
	const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const base = config.baseUrl.replace(/\/$/, '');

	/** fetch with a per-call timeout (+ optional caller signal); network failure → typed error. */
	async function fetchWithTimeout(
		path: string,
		init: RequestInit,
		callerSignal?: AbortSignal
	): Promise<Response> {
		const timeoutController = new AbortController();
		const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
		const signal = callerSignal
			? AbortSignal.any([callerSignal, timeoutController.signal])
			: timeoutController.signal;
		try {
			return await fetchImpl(base + path, { ...init, signal });
		} catch (error) {
			throw new LifeprojConnectivityError(
				`Could not reach lifeproj at ${base + path}: ${(error as Error).message}`,
				{ cause: error }
			);
		} finally {
			clearTimeout(timer);
		}
	}

	return {
		async project(request, callerSignal) {
			// Validate the outbound body so only actuarial wire fields ever leave (NFR12).
			const body = v.parse(WireProjectRequestSchema, mapDesignRequestToWire(request));

			const response = await fetchWithTimeout(
				PROJECT_PATH,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-API-Key': config.apiKey
					},
					body: JSON.stringify(body)
				},
				callerSignal
			);

			if (!response.ok) {
				await throwForErrorResponse(response);
			}

			let json: unknown;
			try {
				json = await response.json();
			} catch (error) {
				throw new LifeprojConnectivityError('lifeproj returned a non-JSON success body', {
					cause: error
				});
			}
			return mapWireResponseToResult(v.parse(WireProjectResponseSchema, json));
		},

		async schema(callerSignal) {
			const response = await fetchWithTimeout(SCHEMA_PATH, { method: 'GET' }, callerSignal);
			if (!response.ok) {
				await throwForErrorResponse(response);
			}
			try {
				return await response.json();
			} catch (error) {
				throw new LifeprojConnectivityError('lifeproj returned a non-JSON schema body', {
					cause: error
				});
			}
		}
	};
}
