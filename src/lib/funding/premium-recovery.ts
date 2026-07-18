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
 * **Floored at Option 2's premium** (operator, 2026-07-18): Option 4 is meant to be at least as
 * well funded as Option 2, so where the recovery solve asks for less, Option 2's premium wins.
 *
 * The floor exists because the recovery target alone does not pin the design. `net_death_benefit`
 * is 0 for a policy that lapsed before the target year, so the feasible region has a hard edge at
 * "survives to LE" — and with the recovery floor itself non-binding (the death benefit clears
 * cumulative premium comfortably at a compliant face), the solve converges onto that edge and
 * lapses the contract *exactly* at life expectancy. Live, every unfloored variant did this. An
 * insured who outlives LE would leave nothing behind, which is the outcome the floor prevents.
 */
import { Big } from '$lib/money/money';
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

/**
 * Build the Option 4 design request: Option 2's distributions, premium-recovery endpoint.
 *
 * This is step one of two. Run it, then compare the solved premium against Option 2's with
 * {@link premiumRecoveryIsUnderfunded}; if it comes in lower, rebuild with
 * {@link buildFlooredPremiumRecoveryDesignRequest} to apply the floor.
 */
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

/** True when the recovery solve funds less than Option 2, so Option 2's premium should win. */
export function premiumRecoveryIsUnderfunded(
	solvedPremium: string,
	benefitDistributionPremium: string
): boolean {
	return new Big(solvedPremium).lt(new Big(benefitDistributionPremium));
}

export interface FlooredPremiumRecoveryDesignParams extends PremiumRecoveryDesignParams {
	/** Option 2's solved premium — the floor Option 4 may not fund below. */
	annualPremium: string;
}

/**
 * Build the floored Option 4 request: the same distributions, but Option 2's premium specified
 * rather than solved. Premium recovery becomes a *reported outcome* here rather than the target
 * — funding at or above Option 2 clears it by a wide margin anyway.
 */
export function buildFlooredPremiumRecoveryDesignRequest(
	params: FlooredPremiumRecoveryDesignParams
): DesignRequest {
	const base = premiumFundedBase(params);
	const payYears = base.premiumPeriods?.[0].endYear ?? 0;
	return {
		...base,
		premiumPeriods: [
			{ startYear: 1, endYear: payYears, kind: 'specify', amount: params.annualPremium }
		],
		distributionPeriods: benefitStreamToDistributionPeriods(params.benefitStream, params.issueAge),
		distributionType: SERP_DISTRIBUTION_TYPE
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
