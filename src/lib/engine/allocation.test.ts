import { describe, it, expect } from 'vitest';
import { Big } from '$lib/money/money';
import { allocateEqually } from './allocation';

describe('allocateEqually (FR18)', () => {
	it('splits the death benefit equally across participants', () => {
		const allocations = allocateEqually(new Big('900000'), ['a', 'b', 'c']);
		expect(allocations).toHaveLength(3);
		expect(allocations.map((a) => a.insuredId)).toEqual(['a', 'b', 'c']);
		expect(allocations.every((a) => a.faceAmount.eq(new Big('300000')))).toBe(true);
	});

	it('assigns the full amount to a single participant', () => {
		const allocations = allocateEqually(new Big('948000'), ['solo']);
		expect(allocations[0].faceAmount.toString()).toBe('948000');
	});

	it('returns no allocations for an empty participant list', () => {
		expect(allocateEqually(new Big('948000'), [])).toEqual([]);
	});

	it('keeps full precision for uneven splits', () => {
		// 1000 / 3 = 333.333... kept at Big.DP precision (rounding happens at output)
		const allocations = allocateEqually(new Big('1000'), ['a', 'b', 'c']);
		expect(allocations[0].faceAmount.toString()).toBe('333.33333333333333333333');
	});
});
