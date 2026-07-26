/**
 * Funding strategy seam (NFR14).
 *
 * Options 2–4 are additive: implement this interface in a new file and register it
 * (`funding/index.ts`) — no engine or UI changes required. MVP ships Cost Recovery (Option 1).
 */
import type { Big } from '$lib/money/money';
import type { FaceAllocation } from '$lib/engine/allocation';

export interface FundingStrategyInput {
	/** Total SERP benefit cost (the liability the funding sizes against). */
	totalBenefitCost: Big;
	/** Corporate tax rate, ratio in [0, 1]. */
	corporateTaxRate: number;
	/** Ids of the COLI participants the death benefit is split across. */
	coliParticipantIds: string[];
}

export interface FundingResult {
	/**
	 * Total COLI death benefit sized by the strategy. Absent for premium-funded strategies
	 * (`facesFromPremium`), where the death benefit is an output of the illustration rather
	 * than an input to it.
	 */
	totalDeathBenefit?: Big;
	/** Per-participant face amounts. Empty when `facesFromPremium`. */
	allocations: FaceAllocation[];
}

export interface FundingStrategy {
	/** Stable id used by the registry (e.g. 'cost-recovery'). */
	readonly id: string;
	/** Human-readable label for the UI. */
	readonly label: string;
	/**
	 * True when face is derived from the solved premium (the smallest compliant face) rather
	 * than allocated from the SERP liability. Options 2–4 invert Option 1's direction: the
	 * orchestrator must not pre-allocate face for them, and reads it back off the illustration.
	 */
	readonly facesFromPremium?: boolean;
	/** Size the death benefit and allocate per-person face. */
	fund(input: FundingStrategyInput): FundingResult;
}
