import { describe, it, expect } from 'vitest';
import { Big } from '$lib/money/money';
import { totalBenefitCost, netPresentValue } from './liability';
import type { BenefitYear } from './benefit-stream';

function stream(fromAge: number, ...amounts: string[]): BenefitYear[] {
	return amounts.map((a, i) => ({ age: fromAge + i, amount: new Big(a) }));
}

describe('totalBenefitCost (FR15)', () => {
	it('sums the undiscounted stream', () => {
		expect(totalBenefitCost(stream(65, '60000', '60000', '60000')).toString()).toBe('180000');
	});

	it('is zero for an empty stream', () => {
		expect(totalBenefitCost([]).toString()).toBe('0');
	});
});

describe('netPresentValue (FR15, NFR15)', () => {
	it('equals the undiscounted total at a 0% rate', () => {
		const s = stream(65, '60000', '60000', '60000');
		expect(netPresentValue(s, 0, 65).toString()).toBe('180000');
	});

	it('discounts a future payment back to the valuation age', () => {
		// single payment of 110 one year out at 10% -> PV 100
		const s: BenefitYear[] = [{ age: 65, amount: new Big('110') }];
		expect(netPresentValue(s, 0.1, 64).toString()).toBe('100');
	});

	it('discounts multiple years correctly', () => {
		// 121 two years out at 10% -> 121 / 1.21 = 100
		const s: BenefitYear[] = [{ age: 66, amount: new Big('121') }];
		expect(netPresentValue(s, 0.1, 64).toString()).toBe('100');
	});

	it('yields a lower NPV than the undiscounted total when the rate is positive', () => {
		const s = stream(65, '60000', '60000', '60000');
		const npv = netPresentValue(s, 0.05, 60);
		expect(npv.lt(totalBenefitCost(s))).toBe(true);
	});
});
