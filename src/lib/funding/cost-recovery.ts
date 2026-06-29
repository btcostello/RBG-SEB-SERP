/**
 * Cost Recovery (Option 1) funding strategy (FR17, FR18).
 *
 * Sizes the total COLI death benefit as the tax-adjusted total cost and splits it equally
 * across the COLI participants. Composes the named engine functions — no hardcoded formulas.
 */
import { taxAdjustedDeathBenefit } from '$lib/engine/tax-adjustment';
import { allocateEqually } from '$lib/engine/allocation';
import type { FundingResult, FundingStrategy, FundingStrategyInput } from './funding-strategy';

export const COST_RECOVERY_ID = 'cost-recovery';

export const costRecoveryStrategy: FundingStrategy = {
	id: COST_RECOVERY_ID,
	label: 'Cost Recovery (Option 1)',
	fund(input: FundingStrategyInput): FundingResult {
		const totalDeathBenefit = taxAdjustedDeathBenefit(
			input.totalBenefitCost,
			input.corporateTaxRate
		);
		const allocations = allocateEqually(totalDeathBenefit, input.coliParticipantIds);
		return { totalDeathBenefit, allocations };
	}
};
