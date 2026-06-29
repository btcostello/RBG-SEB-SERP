/**
 * Cost Recovery (Option 1) funding strategy (FR17, FR18, FR19).
 *
 * Sizes the total COLI death benefit as the tax-adjusted total cost and splits it equally
 * across the COLI participants, and builds the per-policy solve request that designs each
 * Cost-Recovery premium against the illustration engine. Composes named engine functions —
 * no hardcoded formulas.
 */
import { taxAdjustedDeathBenefit } from '$lib/engine/tax-adjustment';
import { allocateEqually } from '$lib/engine/allocation';
import type { DesignRequest, Gender, RiskClass, SolveSpec } from '$lib/domain';
import type { FundingResult, FundingStrategy, FundingStrategyInput } from './funding-strategy';

export const COST_RECOVERY_ID = 'cost-recovery';

/**
 * Operator-confirmed Cost-Recovery solve target (2026-06-28): solve the level annual premium
 * so each policy's net surrender value reaches $1,000 at age 100 (AR17/I-2).
 */
export const COST_RECOVERY_SOLVE: SolveSpec = { value: '1000.00', when: 100, basis: 'age' };

export interface CostRecoveryDesignParams {
	/** Issue age (computed from DOB at the valuation date by the caller). */
	issueAge: number;
	gender: Gender;
	riskClass: RiskClass;
	/** Per-person face amount from the equal-split allocation (decimal-string money). */
	faceAmount: string;
	/** Optional product type; the engine defaults the rest of the design. */
	productType?: DesignRequest['productType'];
}

/**
 * Build the design request that solves each insured's Cost-Recovery premium (FR19).
 * No fixed premium is sent — the `solve` block asks the engine to derive the level premium that
 * hits the $1,000-at-age-100 net surrender value target.
 */
export function buildCostRecoveryDesignRequest(params: CostRecoveryDesignParams): DesignRequest {
	return {
		issueAge: params.issueAge,
		gender: params.gender,
		riskClass: params.riskClass,
		faceAmount: params.faceAmount,
		...(params.productType !== undefined ? { productType: params.productType } : {}),
		solve: COST_RECOVERY_SOLVE
	};
}

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
