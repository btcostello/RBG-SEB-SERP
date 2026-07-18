/**
 * Client-side run orchestrator (FR23, AR9, AR12).
 *
 * One action runs the whole model:
 *   1. computing — the pure engine computes liability and the funding (tax-adjusted total DB +
 *      per-person face) entirely in-browser.
 *   2. designing — the client issues N SEQUENTIAL illustration calls, one per COLI participant,
 *      reporting completed/total progress as it goes.
 *
 * The illustration call is injected (`illustrate`) so this orchestrator is unit-testable
 * against a mocked client and never imports the API client or any store directly. It does not
 * mutate inputs — the caller assembles results and updates state (run-state store). `done` is
 * emitted by the caller after results are assembled.
 */
import { Big, formatMoney } from '$lib/money/money';
import { ageNearestBirthday } from '$lib/dates/age';
import {
	isColiParticipant,
	toWireGender,
	type DesignRequest,
	type IllustrationResult,
	type Quote
} from '$lib/domain';
import { computeLiability, type LiabilityResult } from '$lib/engine/compute-liability';
import { buildCostRecoveryDesignRequest, costRecoveryStrategy } from '$lib/funding';

export type RunStatus = 'idle' | 'computing' | 'designing' | 'done' | 'failed';

/** Default per-call timeout — a slow/unreachable engine fails the call (no silent hang, NFR10). */
export const DEFAULT_RUN_CALL_TIMEOUT_MS = 30_000;

/** A designed COLI policy: the face in force and the retrieved illustration. */
export interface DesignedPolicy {
	insuredId: string;
	/** Funding strategy this design belongs to — one participant carries one per option. */
	strategyId: string;
	/**
	 * For Option 1 this is the face allocated from the SERP liability. For the premium-funded
	 * options face is an output of the solve, so it is read back off the illustration.
	 */
	faceAmount: Big;
	illustration: IllustrationResult;
}

export interface RunOutput {
	liability: LiabilityResult;
	totalDeathBenefit: Big;
	designed: DesignedPolicy[];
}

export interface RunModelParams {
	quote: Quote;
	/** Valuation date, ISO YYYY-MM-DD. */
	asOf: string;
	/** Injected illustration call (browser → BFF). */
	illustrate: (request: DesignRequest, signal?: AbortSignal) => Promise<IllustrationResult>;
	onStatus?: (status: RunStatus) => void;
	onProgress?: (completed: number, total: number) => void;
	/** Run-level abort signal (fail-fast cancels in-flight + remaining calls). */
	signal?: AbortSignal;
	/** Per-call timeout in ms (default 30s). */
	timeoutMs?: number;
}

export async function runModel(params: RunModelParams): Promise<RunOutput> {
	const { quote, asOf, illustrate, onStatus, onProgress, signal } = params;
	const timeoutMs = params.timeoutMs ?? DEFAULT_RUN_CALL_TIMEOUT_MS;

	/**
	 * Run one illustration with a per-call timeout, combined with the run-level signal. A timeout
	 * (or a run-level abort) aborts the call, which surfaces as a connectivity failure and — since
	 * a thrown error stops the loop — aborts the remaining calls too (whole-run fail-fast).
	 */
	async function illustrateWithTimeout(request: DesignRequest): Promise<IllustrationResult> {
		const callController = new AbortController();
		const callSignal = signal
			? AbortSignal.any([signal, callController.signal])
			: callController.signal;
		const timer = setTimeout(() => callController.abort(), timeoutMs);
		try {
			return await illustrate(request, callSignal);
		} finally {
			clearTimeout(timer);
		}
	}

	// --- computing: pure engine liability + funding, in-browser ---
	onStatus?.('computing');
	const liability = computeLiability({
		census: quote.census,
		settings: quote.modelSettings,
		asOf
	});
	const coliParticipants = quote.census.filter(isColiParticipant);
	const funding = costRecoveryStrategy.fund({
		totalBenefitCost: liability.aggregate.totalBenefitCost,
		corporateTaxRate: quote.company.corporateTaxRate,
		coliParticipantIds: coliParticipants.map((insured) => insured.id)
	});
	const faceById = new Map(funding.allocations.map((a) => [a.insuredId, a.faceAmount]));

	// --- designing: N sequential illustration calls, one per COLI participant ---
	onStatus?.('designing');
	const total = coliParticipants.length;
	onProgress?.(0, total);

	const designed: DesignedPolicy[] = [];
	for (let index = 0; index < coliParticipants.length; index++) {
		const insured = coliParticipants[index];
		const faceAmount = faceById.get(insured.id) ?? new Big(0);
		const request = buildCostRecoveryDesignRequest({
			issueAge: ageNearestBirthday(insured.dateOfBirth, asOf),
			gender: toWireGender(insured.gender),
			riskClass: insured.riskClass,
			faceAmount: formatMoney(faceAmount),
			creditedRate: quote.modelSettings.creditingRate,
			// The engine now bounds the premium window itself, so the returned stream stops
			// charging premium after this many years (was previously summed on our side only).
			...(quote.modelSettings.premiumYears !== undefined
				? { premiumYears: quote.modelSettings.premiumYears }
				: {})
		});
		const illustration = await illustrateWithTimeout(request);
		designed.push({
			insuredId: insured.id,
			strategyId: costRecoveryStrategy.id,
			faceAmount,
			illustration
		});
		onProgress?.(index + 1, total);
	}

	// Option 1 always sizes a death benefit up front. The fallback only satisfies the widened
	// FundingResult type, which allows none for the premium-funded strategies (Options 2–4) —
	// those derive face from the solved premium and this orchestrator does not run them yet.
	return {
		liability,
		totalDeathBenefit: funding.totalDeathBenefit ?? new Big(0),
		designed
	};
}
