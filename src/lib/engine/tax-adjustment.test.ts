import { describe, it, expect } from 'vitest';
import { Big } from '$lib/money/money';
import { taxAdjustedDeathBenefit } from './tax-adjustment';

describe('taxAdjustedDeathBenefit (FR17)', () => {
	it('computes Total DB = total cost × (1 − tax rate)', () => {
		// 1,200,000 × (1 − 0.21) = 948,000
		expect(taxAdjustedDeathBenefit(new Big('1200000'), 0.21).toString()).toBe('948000');
	});

	it('equals the total cost at a 0% tax rate', () => {
		expect(taxAdjustedDeathBenefit(new Big('1200000'), 0).toString()).toBe('1200000');
	});

	it('keeps full precision (no rounding)', () => {
		// 1000 × (1 − 0.335) = 665
		expect(taxAdjustedDeathBenefit(new Big('1000'), 0.335).toString()).toBe('665');
	});

	it('throws on a tax rate outside [0, 1]', () => {
		expect(() => taxAdjustedDeathBenefit(new Big('1000'), 1.5)).toThrow();
		expect(() => taxAdjustedDeathBenefit(new Big('1000'), -0.1)).toThrow();
	});
});
