/**
 * Funding strategy registry (NFR14, seam: strategy).
 *
 * Option 1 (Cost Recovery) is registered. Adding Options 2–4 is a one-line `register(...)`
 * here plus a new strategy file — nothing else changes.
 */
import type { FundingStrategy } from './funding-strategy';
import { costRecoveryStrategy, COST_RECOVERY_ID } from './cost-recovery';

const registry = new Map<string, FundingStrategy>();

function register(strategy: FundingStrategy): void {
	registry.set(strategy.id, strategy);
}

register(costRecoveryStrategy);

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

export { costRecoveryStrategy, COST_RECOVERY_ID };
export * from './funding-strategy';
