import { describe, it, expect } from 'vitest';
import type { Gender } from '$lib/domain/insured';
import {
	MORTALITY_BASES as WHITE_COLLAR_BASES,
	PRI_2012_WHITE_COLLAR,
	type MortalityBasis as WhiteCollarBasis
} from './pri-2012-white-collar';

/**
 * Transcription guards for the Pri-2012 white collar workbook.
 *
 * These rates are **no longer the engine's basis** — that is the IRS static table, see ./table.ts
 * — but the data is retained for comparison, so the guards are retained with it. Nothing here
 * touches the lookup; it asserts the numbers only.
 */
const GENDERS: Gender[] = ['M', 'F'];
const PAIRS: Array<[Gender, WhiteCollarBasis]> = GENDERS.flatMap((g) =>
	WHITE_COLLAR_BASES.map((b) => [g, b] as [Gender, WhiteCollarBasis])
);

const rate = (gender: Gender, basis: WhiteCollarBasis, age: number): number | null => {
	const series = PRI_2012_WHITE_COLLAR[gender][basis];
	const index = age - series.startAge;
	return index < 0 || index >= series.q.length ? null : series.q[index];
};

const span = (gender: Gender, basis: WhiteCollarBasis) => {
	const series = PRI_2012_WHITE_COLLAR[gender][basis];
	return { startAge: series.startAge, endAge: series.startAge + series.q.length - 1 };
};

describe('PRI_2012_WHITE_COLLAR — table shape', () => {
	it.each(PAIRS)('%s/%s covers the documented age span', (gender, basis) => {
		const expected =
			basis === 'employee' ? { startAge: 18, endAge: 80 } : { startAge: 50, endAge: 120 };
		expect(span(gender, basis)).toEqual(expected);
	});

	it.each(PAIRS)('%s/%s holds only valid probabilities', (gender, basis) => {
		for (const q of PRI_2012_WHITE_COLLAR[gender][basis].q) {
			expect(q).toBeGreaterThan(0);
			expect(q).toBeLessThanOrEqual(1);
		}
	});

	it.each(PAIRS)('%s/%s is stated to five decimals', (gender, basis) => {
		for (const q of PRI_2012_WHITE_COLLAR[gender][basis].q) {
			expect(Number(q.toFixed(5))).toBe(q);
		}
	});

	it.each(GENDERS)('%s annuitant bases terminate at q(120) = 1', (gender) => {
		expect(rate(gender, 'retiree', 120)).toBe(1);
		expect(rate(gender, 'contingentSurvivor', 120)).toBe(1);
	});

	it.each(GENDERS)('%s employee basis stops at 80, short of certainty', (gender) => {
		// This is what constrained retirement ages to 50-81 under the old basis. The IRS tables
		// that replaced it run 0-120 on both bases, so that constraint is gone.
		expect(span(gender, 'employee').endAge).toBe(80);
		expect(PRI_2012_WHITE_COLLAR[gender].employee.q.some((q) => q >= 1)).toBe(false);
	});

	it.each(GENDERS)('%s annuitant rates rise monotonically with age', (gender) => {
		for (const basis of ['retiree', 'contingentSurvivor'] as const) {
			const { q } = PRI_2012_WHITE_COLLAR[gender][basis];
			for (let i = 1; i < q.length; i++) {
				expect(q[i]).toBeGreaterThanOrEqual(q[i - 1]);
			}
		}
	});

	it('reproduces the young-adult accident hump in male employee rates', () => {
		// Male employee mortality peaks at 21 and dips through the mid-20s before rising again.
		// This is a real feature of the table, not a transcription slip — pinned so a future
		// "fix" that smooths it has to be deliberate.
		expect(rate('M', 'employee', 21)).toBe(0.00044);
		expect(rate('M', 'employee', 25)).toBe(0.00042);
		expect(rate('M', 'employee', 21)!).toBeGreaterThan(rate('M', 'employee', 25)!);
	});
});

describe('PRI_2012_WHITE_COLLAR — spot values', () => {
	// Transcription guards against the "White Collar" sheet. Note the workbook orders the sexes
	// female-then-male (columns D-F then H-J), the reverse of the usual convention — these pin
	// that the mapping did not get flipped.
	it.each([
		['M', 'employee', 18, 0.00036],
		['F', 'employee', 18, 0.00014],
		['M', 'employee', 80, 0.02367],
		['F', 'employee', 80, 0.01812],
		['M', 'retiree', 50, 0.00366],
		['F', 'retiree', 50, 0.00224],
		['M', 'retiree', 65, 0.00812],
		['F', 'retiree', 65, 0.0074],
		['M', 'contingentSurvivor', 50, 0.01494],
		['F', 'contingentSurvivor', 50, 0.00494]
	] as Array<[Gender, WhiteCollarBasis, number, number]>)(
		'%s/%s at age %i is %f',
		(gender, basis, age, expected) => {
			expect(rate(gender, basis, age)).toBe(expected);
		}
	);

	it('keeps male rates above female rates on every shared age and basis', () => {
		for (const basis of WHITE_COLLAR_BASES) {
			const { startAge, endAge } = span('M', basis);
			for (let age = startAge; age <= endAge; age++) {
				expect(rate('M', basis, age)!).toBeGreaterThanOrEqual(rate('F', basis, age)!);
			}
		}
	});
});
