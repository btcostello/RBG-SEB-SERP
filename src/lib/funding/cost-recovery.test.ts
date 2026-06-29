import { describe, it, expect } from 'vitest';
import { Big } from '$lib/money/money';
import { costRecoveryStrategy } from './cost-recovery';
import { getFundingStrategy, listFundingStrategies, DEFAULT_FUNDING_STRATEGY_ID } from './index';

describe('costRecoveryStrategy.fund (FR17, FR18)', () => {
	it('sizes the tax-adjusted death benefit and splits it per COLI participant', () => {
		const result = costRecoveryStrategy.fund({
			totalBenefitCost: new Big('1200000'),
			corporateTaxRate: 0.21,
			coliParticipantIds: ['a', 'b']
		});
		// Total DB = 1,200,000 × 0.79 = 948,000; split 2 ways = 474,000 each
		expect(result.totalDeathBenefit.toString()).toBe('948000');
		expect(result.allocations).toHaveLength(2);
		expect(result.allocations.every((a) => a.faceAmount.eq(new Big('474000')))).toBe(true);
	});

	it('produces a death benefit but no allocations when there are no COLI participants', () => {
		const result = costRecoveryStrategy.fund({
			totalBenefitCost: new Big('1000000'),
			corporateTaxRate: 0.25,
			coliParticipantIds: []
		});
		expect(result.totalDeathBenefit.toString()).toBe('750000');
		expect(result.allocations).toEqual([]);
	});
});

describe('funding strategy registry (NFR14)', () => {
	it('registers Cost Recovery (Option 1) behind the strategy seam', () => {
		expect(DEFAULT_FUNDING_STRATEGY_ID).toBe('cost-recovery');
		expect(getFundingStrategy('cost-recovery')).toBe(costRecoveryStrategy);
		expect(listFundingStrategies().map((s) => s.id)).toContain('cost-recovery');
	});

	it('returns undefined for an unregistered strategy id', () => {
		expect(getFundingStrategy('option-2')).toBeUndefined();
	});
});
