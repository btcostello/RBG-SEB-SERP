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
 * so each policy's net account value reaches $1,000 at age 100 (AR17/I-2).
 *
 * `net_account_value` is the engine's account value less any loan balance — deliberately NOT
 * `cash_surrender_value`, which is further net of the surrender charge.
 */
export const COST_RECOVERY_SOLVE: SolveSpec = {
	mode: 'premium',
	metric: 'net_account_value',
	target: 'specify',
	value: '1000.00',
	when: 100,
	basis: 'age'
};

/** Premium-payment period used when the operator has not set `ModelSettings.premiumYears`. */
export const DEFAULT_PREMIUM_YEARS = 10;

export interface CostRecoveryDesignParams {
	/** Issue age (computed from DOB at the valuation date by the caller). */
	issueAge: number;
	gender: Gender;
	riskClass: RiskClass;
	/** Per-person face amount from the equal-split allocation (decimal-string money). */
	faceAmount: string;
	/** Optional product type; the engine defaults the rest of the design. */
	productType?: DesignRequest['productType'];
	/** Plan-level assumed crediting rate (fraction); omitted lets the engine use its default. */
	creditedRate?: number;
	/** Premium-payment period in policy years (default 10). Bounds the solved premium window. */
	premiumYears?: number;
}

/**
 * Build the design request that solves each insured's Cost-Recovery premium (FR19).
 *
 * No fixed premium is sent. A value solve needs BOTH halves: the `solve` block AND a premium
 * window with `kind: 'solve'`. Sending the block alone makes the engine report
 * `no_solve_period` / `feasible: false` and contribute zero premium, so the window is not
 * optional garnish — it is what makes the solve run. Years past the window pay nothing, which
 * is how the premium-payment period reaches the engine.
 */
export function buildCostRecoveryDesignRequest(params: CostRecoveryDesignParams): DesignRequest {
	const premiumYears = params.premiumYears ?? DEFAULT_PREMIUM_YEARS;
	return {
		issueAge: params.issueAge,
		gender: params.gender,
		riskClass: params.riskClass,
		faceAmount: params.faceAmount,
		...(params.productType !== undefined ? { productType: params.productType } : {}),
		...(params.creditedRate !== undefined ? { creditedRate: params.creditedRate } : {}),
		premiumPeriods: [{ startYear: 1, endYear: premiumYears, kind: 'solve' }],
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
