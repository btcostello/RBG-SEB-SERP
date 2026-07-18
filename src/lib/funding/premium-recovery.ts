/**
 * Option 4 — Premium Recovery.
 *
 * Option 2's design (distributions pay each year's SERP benefit) with a different endpoint: the
 * death benefit at life expectancy must return the premiums the company paid in. The engine's
 * `premium_recovery` target is derived and recomputed each trial, so it tracks the premium being
 * solved rather than being fixed up front.
 *
 * Over-recovery is acceptable — the operator's rule is "at least premiums back," not equality.
 *
 * ⚠ **Read the result before trusting it.** Live probing (2026-07-18) showed this target can go
 * slack: when the face is generous the death benefit clears cumulative premium easily, and the
 * solve degenerates into "the minimum premium that keeps the policy in force to LE" (because
 * `net_death_benefit` is 0 for a policy that lapsed earlier), landing the lapse *on* life
 * expectancy. Under the smallest-compliant-face basis that is much less likely, but
 * `solveFeasible` and `lapseYear` still need checking against LE before a design is presented.
 */
import type { DesignRequest, SolveSpec, StreamYear } from '$lib/domain';
import type { FundingStrategy, FundingStrategyInput, FundingResult } from './funding-strategy';
import {
	benefitStreamToDistributionPeriods,
	premiumFundedBase,
	SERP_DISTRIBUTION_TYPE,
	type PremiumFundedDesignParams
} from './design-basis';

export const PREMIUM_RECOVERY_ID = 'premium-recovery';

/** The target is derived from cumulative premium, so it carries no `value`. */
export function premiumRecoverySolve(lifeExpectancy: number): SolveSpec {
	return {
		mode: 'premium',
		metric: 'net_death_benefit',
		target: 'premium_recovery',
		when: lifeExpectancy,
		basis: 'age'
	};
}

export interface PremiumRecoveryDesignParams extends PremiumFundedDesignParams {
	/** The participant's SERP benefit stream, keyed by attained age. */
	benefitStream: StreamYear[];
	/** Attained age the death benefit must have returned premiums by. */
	lifeExpectancy: number;
}

/** Build the Option 4 design request: Option 2's distributions, premium-recovery endpoint. */
export function buildPremiumRecoveryDesignRequest(
	params: PremiumRecoveryDesignParams
): DesignRequest {
	return {
		...premiumFundedBase(params),
		distributionPeriods: benefitStreamToDistributionPeriods(params.benefitStream, params.issueAge),
		distributionType: SERP_DISTRIBUTION_TYPE,
		solve: premiumRecoverySolve(params.lifeExpectancy)
	};
}

export const premiumRecoveryStrategy: FundingStrategy = {
	id: PREMIUM_RECOVERY_ID,
	label: 'Premium Recovery (Option 4)',
	facesFromPremium: true,
	fund(_input: FundingStrategyInput): FundingResult {
		return { allocations: [] };
	}
};
