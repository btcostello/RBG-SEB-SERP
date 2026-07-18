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

/** As above, but preserves "the engine did not send this" as undefined rather than "0.00". */
function toOptionalMoneyString(wireNumber: number | undefined): string | undefined {
	return wireNumber === undefined ? undefined : toMoneyString(wireNumber);
}

/** Domain period → wire period. `amount` is only meaningful for `kind: 'specify'`. */
function toWirePeriod<K extends string>(period: {
	startYear: number;
	endYear: number;
	kind: K;
	amount?: string;
}): { start_year: number; end_year: number; kind: K; amount?: number } {
	return {
		start_year: period.startYear,
		end_year: period.endYear,
		kind: period.kind,
		...(period.amount !== undefined ? { amount: toWireNumber(period.amount) } : {})
	};
}

/** Map a domain DesignRequest to the snake_case wire body (actuarial fields only, NFR12). */
export function mapDesignRequestToWire(request: DesignRequest): WireProjectRequest {
	const wire: WireProjectRequest = {
		issue_age: request.issueAge,
		gender: request.gender,
		health: request.riskClass,
		face_amount: toWireNumber(request.faceAmount)
	};
	if (request.facePeriods !== undefined) wire.face_periods = request.facePeriods.map(toWirePeriod);
	if (request.productType !== undefined) wire.product_type = request.productType;
	if (request.dbOption !== undefined) wire.db_option = request.dbOption;
	if (request.dboPeriods !== undefined)
		wire.dbo_periods = request.dboPeriods.map((period) => ({
			start_year: period.startYear,
			end_year: period.endYear,
			option: period.option
		}));
	if (request.annualPremium !== undefined)
		wire.annual_premium = toWireNumber(request.annualPremium);
	if (request.premiumPeriods !== undefined)
		wire.premium_periods = request.premiumPeriods.map(toWirePeriod);
	if (request.premiumMode !== undefined) wire.premium_mode = request.premiumMode;
	if (request.distributionPeriods !== undefined)
		wire.distribution_periods = request.distributionPeriods.map(toWirePeriod);
	if (request.distributionType !== undefined) wire.distribution_type = request.distributionType;
	if (request.creditedRate !== undefined) wire.credited_rate = request.creditedRate;
	if (request.qualificationTest !== undefined) wire.qualification_test = request.qualificationTest;
	if (request.mecHandling !== undefined) wire.mec_handling = request.mecHandling;
	if (request.maturityAge !== undefined) wire.maturity_age = request.maturityAge;
	if (request.solve !== undefined) {
		const { mode, metric, target, value, when, basis } = request.solve;
		wire.solve = {
			when,
			...(mode !== undefined ? { mode } : {}),
			...(metric !== undefined ? { metric } : {}),
			...(target !== undefined ? { target } : {}),
			...(value !== undefined ? { value: toWireNumber(value) } : {}),
			...(basis !== undefined ? { basis } : {})
		};
	}
	return wire;
}

/** Map a parsed wire response to the domain IllustrationResult (camelCase, money strings). */
export function mapWireResponseToResult(wire: WireProjectResponse): IllustrationResult {
	// `loans[]` is a parallel per-year table; fold it into the year rows so downstream cash-flow
	// derivations read one stream instead of joining two.
	const loanByYear = new Map((wire.loans ?? []).map((row) => [row.policy_year, row]));

	const result: IllustrationResult = {
		years: wire.report.map((row) => {
			const loan = loanByYear.get(row.policy_year);
			return {
				policyYear: row.policy_year,
				age: row.age,
				premium: toMoneyString(row.premium),
				accountValue: toMoneyString(row.account_value),
				// Prefer the engine's own surrender value; fall back to the account value only if an
				// older deployment omits it (the pre-v1 approximation).
				cashSurrenderValue: toMoneyString(row.cash_surrender_value ?? row.account_value),
				deathBenefit: toMoneyString(row.death_benefit),
				...(row.net_account_value !== undefined
					? { netAccountValue: toMoneyString(row.net_account_value) }
					: {}),
				...(row.status !== undefined ? { status: row.status } : {}),
				...(loan?.withdrawal !== undefined
					? { withdrawal: toMoneyString(loan.withdrawal) }
					: {}),
				...(loan?.new_loan !== undefined ? { loan: toMoneyString(loan.new_loan) } : {}),
				...(loan?.eoy_loan_balance !== undefined
					? { loanBalance: toMoneyString(loan.eoy_loan_balance) }
					: {})
			};
		}),
		gptAdjusted: wire.gpt_adjusted,
		mecAdjusted: wire.mec_adjusted,
		solvedAnnualPremium: toMoneyString(wire.summary.initial_annual_premium),
		guideline: {
			singlePremium: toMoneyString(wire.summary.guideline_single_premium),
			levelPremiumA: toMoneyString(wire.summary.guideline_level_premium_a),
			levelPremiumB: toMoneyString(wire.summary.guideline_level_premium_b)
		}
	};

	if (wire.summary.lapse_year !== undefined) result.lapseYear = wire.summary.lapse_year;
	if (wire.summary.mec_year !== undefined) result.mecYear = wire.summary.mec_year;
	if (wire.solve !== undefined) {
		result.solve =
			wire.solve === null
				? null
				: {
						feasible: wire.solve.feasible,
						...(wire.solve.reason !== undefined ? { reason: wire.solve.reason } : {}),
						...(wire.solve.metric !== undefined ? { metric: wire.solve.metric } : {}),
						...(wire.solve.target_kind !== undefined
							? { targetKind: wire.solve.target_kind }
							: {}),
						...optionalMoney('targetValue', wire.solve.target_value),
						...optionalMoney('solvedPremium', wire.solve.solved_premium),
						...optionalMoney('solvedFace', wire.solve.solved_face),
						...optionalMoney('solvedDistribution', wire.solve.solved_distribution)
					};
	}
	return result;
}

/** Spread helper: `{key: money}` when the engine sent the field, `{}` when it did not. */
function optionalMoney(key: string, wireNumber: number | undefined): Record<string, string> {
	const money = toOptionalMoneyString(wireNumber);
	return money === undefined ? {} : { [key]: money };
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
