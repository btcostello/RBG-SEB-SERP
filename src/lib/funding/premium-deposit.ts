/**
 * Option 3 — Premium Deposit.
 *
 * No solve. Pay Option 2's premium but take no distributions, so the policy accumulates and the
 * company keeps paying SERP benefits from operating cash. It is the "what if we just funded it
 * and left it alone" comparison against Option 2, which is why it deliberately reuses Option 2's
 * premium rather than solving its own — the two differ *only* in whether money comes back out.
 *
 * Because the premium is specified rather than solved, this is the one option that can already
 * use a `min_non_mec` face today (the engine's 400 only applies to a face computed from a
 * *solved* premium).
 */
import type { DesignRequest } from '$lib/domain';
import type { FundingStrategy, FundingStrategyInput, FundingResult } from './funding-strategy';
import { premiumFundedBase, type PremiumFundedDesignParams } from './design-basis';

export const PREMIUM_DEPOSIT_ID = 'premium-deposit';

export interface PremiumDepositDesignParams extends PremiumFundedDesignParams {
	/** The premium Option 2 solved for this participant — carried over verbatim. */
	annualPremium: string;
}

/** Build the Option 3 design request: Option 2's premium, no distributions, no solve. */
export function buildPremiumDepositDesignRequest(
	params: PremiumDepositDesignParams
): DesignRequest {
	const base = premiumFundedBase(params);
	const payYears = base.premiumPeriods?.[0].endYear ?? 0;
	return {
		...base,
		// Specified, not solved — so no `solve` block, and the face may be min_non_mec today.
		premiumPeriods: [
			{ startYear: 1, endYear: payYears, kind: 'specify', amount: params.annualPremium }
		]
	};
}

export const premiumDepositStrategy: FundingStrategy = {
	id: PREMIUM_DEPOSIT_ID,
	label: 'Premium Deposit (Option 3)',
	facesFromPremium: true,
	fund(_input: FundingStrategyInput): FundingResult {
		return { allocations: [] };
	}
};
