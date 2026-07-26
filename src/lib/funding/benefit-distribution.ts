/**
 * Option 2 — Benefit Distribution.
 *
 * Solve the premium whose policy distributions pay each year's SERP benefit, leaving $1,000 of
 * net account value at age 100. The company funds the policy instead of paying benefits from
 * operating cash; the policy pays the benefits.
 *
 * Face is not chosen here — it is the smallest compliant face for the solved premium
 * (see `design-basis.ts`).
 */
import type { DesignRequest, SolveSpec, StreamYear } from '$lib/domain';
import type { FundingStrategy, FundingResult } from './funding-strategy';
import {
	benefitStreamToDistributionPeriods,
	premiumFundedBase,
	SERP_DISTRIBUTION_TYPE,
	type PremiumFundedDesignParams
} from './design-basis';

export const BENEFIT_DISTRIBUTION_ID = 'benefit-distribution';

/** Same endpoint as Option 1: the policy is spent down to a nominal residue at age 100. */
export const BENEFIT_DISTRIBUTION_SOLVE: SolveSpec = {
	mode: 'premium',
	metric: 'net_account_value',
	target: 'specify',
	value: '1000.00',
	when: 100,
	basis: 'age'
};

export interface BenefitDistributionDesignParams extends PremiumFundedDesignParams {
	/** The participant's SERP benefit stream, keyed by attained age. */
	benefitStream: StreamYear[];
}

/** Build the Option 2 design request: benefit stream out, premium solved to fund it. */
export function buildBenefitDistributionDesignRequest(
	params: BenefitDistributionDesignParams
): DesignRequest {
	return {
		...premiumFundedBase(params),
		distributionPeriods: benefitStreamToDistributionPeriods(params.benefitStream, params.issueAge),
		distributionType: SERP_DISTRIBUTION_TYPE,
		solve: BENEFIT_DISTRIBUTION_SOLVE
	};
}

/**
 * Option 2 sizes no death benefit up front — face is an *output* of each participant's design
 * call, so there is nothing to allocate here. The orchestrator reads the resulting face back
 * off the illustration.
 */
export const benefitDistributionStrategy: FundingStrategy = {
	id: BENEFIT_DISTRIBUTION_ID,
	label: 'Benefit Distribution (Option 2)',
	facesFromPremium: true,
	fund(): FundingResult {
		return { allocations: [] };
	}
};
