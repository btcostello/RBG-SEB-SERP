/**
 * Client-side run orchestrator (FR23, AR9, AR12).
 *
 * One action runs the whole model:
 *   1. computing — the pure engine computes liability and the funding (tax-adjusted total DB +
 *      per-person face) entirely in-browser.
 *   2. designing — the client designs all four funding options for each COLI participant,
 *      reporting completed/total progress per option as it goes.
 *
 * Concurrency is deliberately asymmetric. A participant's four options run **sequentially**
 * because they are a dependency chain (Option 3 reuses Option 2's solved premium; Option 4 is
 * floored at it). Different **participants** are independent, so they run in a bounded pool —
 * a 20-person census is ~80 calls, which is unpleasant strictly serially.
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
import {
	BENEFIT_DISTRIBUTION_ID,
	COST_RECOVERY_ID,
	PREMIUM_DEPOSIT_ID,
	PREMIUM_RECOVERY_ID,
	buildBenefitDistributionDesignRequest,
	buildCostRecoveryDesignRequest,
	buildFlooredPremiumRecoveryDesignRequest,
	buildPremiumDepositDesignRequest,
	buildPremiumRecoveryDesignRequest,
	costRecoveryStrategy,
	premiumRecoveryIsUnderfunded
} from '$lib/funding';

export type RunStatus = 'idle' | 'computing' | 'designing' | 'done' | 'failed';

/** Default per-call timeout — a slow/unreachable engine fails the call (no silent hang, NFR10). */
export const DEFAULT_RUN_CALL_TIMEOUT_MS = 30_000;

/**
 * How many participants design concurrently. Each runs its four options sequentially, so this
 * bounds in-flight calls at roughly this number. Kept modest so a large census does not open a
 * burst of connections against the illustration engine.
 */
export const DEFAULT_RUN_CONCURRENCY = 4;

/**
 * Build a DesignedPolicy for an option whose face is an OUTPUT of the solve. Falls back to the
 * year-1 death benefit only if the engine omits the resolved face, which it should not.
 */
function designedFromSolve(
	insuredId: string,
	strategyId: string,
	illustration: IllustrationResult
): DesignedPolicy {
	const resolvedFace =
		illustration.initialFaceAmount ?? illustration.years[0]?.deathBenefit ?? '0.00';
	return { insuredId, strategyId, faceAmount: new Big(resolvedFace), illustration };
}

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
	/** Participants designed concurrently (default 4). Their options always run sequentially. */
	concurrency?: number;
}

export async function runModel(params: RunModelParams): Promise<RunOutput> {
	const { quote, asOf, illustrate, onStatus, onProgress, signal } = params;
	const timeoutMs = params.timeoutMs ?? DEFAULT_RUN_CALL_TIMEOUT_MS;

	/**
	 * Run one illustration with a per-call timeout, combined with the run-level signal. A timeout
	 * (or a run-level abort) aborts the call, which surfaces as a connectivity failure and — since
	 * a thrown error stops the loop — aborts the remaining calls too (whole-run fail-fast).
	 */
	async function illustrateWithTimeout(
		request: DesignRequest,
		outerSignal?: AbortSignal
	): Promise<IllustrationResult> {
		const callController = new AbortController();
		const callSignal = outerSignal
			? AbortSignal.any([outerSignal, callController.signal])
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

	const benefitStreamById = new Map(
		liability.perParticipant.map((p) => [
			p.insuredId,
			p.benefitStream.map((year) => ({ age: year.age, amount: formatMoney(year.amount) }))
		])
	);

	// --- designing: the four options per participant, participants in parallel ---
	onStatus?.('designing');

	// Options 2–4 draw the SERP benefit out of the policy, so a participant with no benefit
	// stream (COLI-only) has nothing to fund and only gets Option 1.
	const plans = coliParticipants.map((insured) => {
		const benefitStream = benefitStreamById.get(insured.id) ?? [];
		return {
			insured,
			benefitStream,
			optionCount: benefitStream.length > 0 ? 4 : 1
		};
	});
	const total = plans.reduce((sum, plan) => sum + plan.optionCount, 0);

	let completed = 0;
	onProgress?.(0, total);
	function tick(): void {
		completed += 1;
		onProgress?.(completed, total);
	}

	/**
	 * Design one participant. The four options run STRICTLY SEQUENTIALLY because they depend on
	 * each other: Option 3 reuses Option 2's solved premium (it has no anchor of its own), and
	 * Option 4 is floored at that same premium.
	 */
	async function designParticipant(
		plan: (typeof plans)[number],
		callSignal: AbortSignal | undefined
	): Promise<DesignedPolicy[]> {
		const { insured, benefitStream } = plan;
		const issueAge = ageNearestBirthday(insured.dateOfBirth, asOf);
		const shared = {
			issueAge,
			gender: toWireGender(insured.gender),
			riskClass: insured.riskClass,
			creditedRate: quote.modelSettings.creditingRate,
			...(quote.modelSettings.premiumYears !== undefined
				? { payYears: quote.modelSettings.premiumYears }
				: {})
		};
		const allocatedFace = faceById.get(insured.id) ?? new Big(0);
		const out: DesignedPolicy[] = [];

		// Option 1 — face allocated from the SERP liability, premium solved to fill it.
		const costRecovery = await illustrateWithTimeout(
			buildCostRecoveryDesignRequest({
				issueAge,
				gender: shared.gender,
				riskClass: shared.riskClass,
				faceAmount: formatMoney(allocatedFace),
				creditedRate: shared.creditedRate,
				...(quote.modelSettings.premiumYears !== undefined
					? { premiumYears: quote.modelSettings.premiumYears }
					: {})
			}),
			callSignal
		);
		out.push({
			insuredId: insured.id,
			strategyId: COST_RECOVERY_ID,
			faceAmount: allocatedFace,
			illustration: costRecovery
		});
		tick();
		if (benefitStream.length === 0) return out;

		// Options 2–4 size face from the solved premium, so the seed is only an anchor.
		const seedFaceAmount = formatMoney(allocatedFace);

		// Option 2 — distributions pay each year's SERP benefit.
		const benefitDistribution = await illustrateWithTimeout(
			buildBenefitDistributionDesignRequest({ ...shared, seedFaceAmount, benefitStream }),
			callSignal
		);
		out.push(designedFromSolve(insured.id, BENEFIT_DISTRIBUTION_ID, benefitDistribution));
		tick();
		const option2Premium = benefitDistribution.solvedAnnualPremium;

		// Option 3 — Option 2's premium, no distributions.
		const premiumDeposit = await illustrateWithTimeout(
			buildPremiumDepositDesignRequest({
				...shared,
				seedFaceAmount,
				annualPremium: option2Premium
			}),
			callSignal
		);
		out.push(designedFromSolve(insured.id, PREMIUM_DEPOSIT_ID, premiumDeposit));
		tick();

		// Option 4 — recovery at LE, floored at Option 2 so it is never less well funded. The
		// floor usually binds; it stands alone mainly for young insureds, whose premium is small
		// against a fixed benefit stream.
		let premiumRecovery = await illustrateWithTimeout(
			buildPremiumRecoveryDesignRequest({
				...shared,
				seedFaceAmount,
				benefitStream,
				lifeExpectancy: insured.lifeExpectancy
			}),
			callSignal
		);
		if (premiumRecoveryIsUnderfunded(premiumRecovery.solvedAnnualPremium, option2Premium)) {
			premiumRecovery = await illustrateWithTimeout(
				buildFlooredPremiumRecoveryDesignRequest({
					...shared,
					seedFaceAmount,
					benefitStream,
					lifeExpectancy: insured.lifeExpectancy,
					annualPremium: option2Premium
				}),
				callSignal
			);
		}
		out.push(designedFromSolve(insured.id, PREMIUM_RECOVERY_ID, premiumRecovery));
		tick();

		return out;
	}

	// Participants are independent, so they run concurrently up to a bounded pool. Results are
	// collected per participant and flattened in census order, so the output does not depend on
	// scheduling — a re-run reproduces an identical snapshot (NFR11).
	const perParticipant: DesignedPolicy[][] = plans.map(() => []);
	const failFast = new AbortController();
	const workerSignal = signal
		? AbortSignal.any([signal, failFast.signal])
		: failFast.signal;
	let firstError: unknown;
	let nextIndex = 0;

	async function worker(): Promise<void> {
		while (!failFast.signal.aborted) {
			const index = nextIndex++;
			if (index >= plans.length) return;
			try {
				perParticipant[index] = await designParticipant(plans[index], workerSignal);
			} catch (error) {
				// Whole-run fail-fast: record the first failure and abort in-flight calls so the
				// remaining workers wind down instead of running work that will be discarded.
				firstError ??= error;
				failFast.abort();
				return;
			}
		}
	}

	const poolSize = Math.max(1, Math.min(params.concurrency ?? DEFAULT_RUN_CONCURRENCY, plans.length));
	// Workers never reject, so this settles once every one has wound down.
	await Promise.all(Array.from({ length: poolSize }, () => worker()));
	if (firstError !== undefined) throw firstError;

	// Option 1 always sizes a death benefit up front. The fallback only satisfies the widened
	// FundingResult type, which allows none for the premium-funded strategies (Options 2–4) —
	// those derive face from the solved premium.
	return {
		liability,
		totalDeathBenefit: funding.totalDeathBenefit ?? new Big(0),
		designed: perParticipant.flat()
	};
}
