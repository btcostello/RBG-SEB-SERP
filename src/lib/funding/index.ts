/**
 * Funding strategy registry (NFR14, seam: strategy).
 *
 * Option 1 (Cost Recovery) is registered. Adding Options 2–4 is a one-line `register(...)`
 * here plus a new strategy file — nothing else changes.
 */
import type { FundingStrategy } from './funding-strategy';
import {
	costRecoveryStrategy,
	COST_RECOVERY_ID,
	COST_RECOVERY_SOLVE,
	buildCostRecoveryDesignRequest
} from './cost-recovery';
import { benefitDistributionStrategy } from './benefit-distribution';
import { premiumDepositStrategy } from './premium-deposit';
import { premiumRecoveryStrategy } from './premium-recovery';

const registry = new Map<string, FundingStrategy>();

function register(strategy: FundingStrategy): void {
	registry.set(strategy.id, strategy);
}

register(costRecoveryStrategy);
register(benefitDistributionStrategy);
register(premiumDepositStrategy);
register(premiumRecoveryStrategy);

/** The default funding strategy for the MVP. */
export const DEFAULT_FUNDING_STRATEGY_ID = COST_RECOVERY_ID;

/** Look up a registered strategy by id. */
export function getFundingStrategy(id: string): FundingStrategy | undefined {
	return registry.get(id);
}

/** All registered strategies (e.g. for a UI selector once Options 2–4 land). */
export function listFundingStrategies(): FundingStrategy[] {
	return [...registry.values()];
}

export {
	costRecoveryStrategy,
	COST_RECOVERY_ID,
	COST_RECOVERY_SOLVE,
	buildCostRecoveryDesignRequest
};
export type { CostRecoveryDesignParams } from './cost-recovery';
export {
	benefitDistributionStrategy,
	BENEFIT_DISTRIBUTION_ID,
	BENEFIT_DISTRIBUTION_SOLVE,
	buildBenefitDistributionDesignRequest
} from './benefit-distribution';
export type { BenefitDistributionDesignParams } from './benefit-distribution';
export {
	premiumDepositStrategy,
	PREMIUM_DEPOSIT_ID,
	buildPremiumDepositDesignRequest
} from './premium-deposit';
export type { PremiumDepositDesignParams } from './premium-deposit';
export {
	premiumRecoveryStrategy,
	PREMIUM_RECOVERY_ID,
	premiumRecoverySolve,
	buildPremiumRecoveryDesignRequest
} from './premium-recovery';
export type { PremiumRecoveryDesignParams } from './premium-recovery';
export {
	premiumFundedBase,
	dboSwitchAfterFunding,
	benefitStreamToDistributionPeriods,
	SERP_DISTRIBUTION_TYPE,
	DEFAULT_PAY_YEARS
} from './design-basis';
export type { PremiumFundedDesignParams } from './design-basis';
export * from './funding-strategy';
