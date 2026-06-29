import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import { Big } from '$lib/money/money';
import { DesignRequestSchema } from '$lib/domain';
import {
	costRecoveryStrategy,
	COST_RECOVERY_SOLVE,
	buildCostRecoveryDesignRequest
} from './cost-recovery';
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

describe('buildCostRecoveryDesignRequest (FR19, AR17/I-2)', () => {
	it('targets a $1,000 net surrender value at age 100', () => {
		expect(COST_RECOVERY_SOLVE).toEqual({ value: '1000.00', when: 100, basis: 'age' });
	});

	it('builds a solve design request from the per-person face and actuarial inputs', () => {
		const request = buildCostRecoveryDesignRequest({
			issueAge: 45,
			gender: 'M',
			riskClass: 'Standard Non Tobacco',
			faceAmount: '474000.00',
			productType: 'IUL'
		});
		expect(request.faceAmount).toBe('474000.00');
		expect(request.issueAge).toBe(45);
		expect(request.solve).toEqual({ value: '1000.00', when: 100, basis: 'age' });
		// No fixed premium is sent — the engine solves it.
		expect(request.annualPremium).toBeUndefined();
		// Valid against the domain schema, so the BFF will accept it.
		expect(v.safeParse(DesignRequestSchema, request).success).toBe(true);
	});
});
