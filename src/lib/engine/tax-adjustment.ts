/**
 * Tax-adjusted total death benefit (FR17, risk-mitigation).
 *
 * The single named function for the Cost-Recovery sizing rule:
 *   Total DB = Total Benefit Cost × (1 − corporate tax rate)
 *
 * Pure big.js; no rounding (NFR5). `corporateTaxRate` is a ratio in [0, 1].
 */
import { Big } from '$lib/money/money';

export function taxAdjustedDeathBenefit(totalBenefitCost: Big, corporateTaxRate: number): Big {
	if (!(corporateTaxRate >= 0 && corporateTaxRate <= 1)) {
		throw new Error(
			`taxAdjustedDeathBenefit: corporateTaxRate must be in [0, 1], got ${corporateTaxRate}`
		);
	}
	return totalBenefitCost.times(new Big(1).minus(corporateTaxRate));
}
