import { describe, it, expect } from 'vitest';
import type { Gender } from '$lib/domain/insured';
import {
	MORTALITY_BASES,
	PRI_2012_WHITE_COLLAR,
	ageRange,
	mortalityRate,
	terminalAge,
	type MortalityBasis
} from './index';

const GENDERS: Gender[] = ['M', 'F'];
/** Every (gender, basis) pair, for the invariant sweeps. */
const PAIRS: Array<[Gender, MortalityBasis]> = GENDERS.flatMap((g) =>
	MORTALITY_BASES.map((b) => [g, b] as [Gender, MortalityBasis])
);

describe('PRI_2012_WHITE_COLLAR — table shape', () => {
	it.each(PAIRS)('%s/%s covers the documented age span', (gender, basis) => {
		const expected =
			basis === 'employee' ? { startAge: 18, endAge: 80 } : { startAge: 50, endAge: 120 };
		expect(ageRange(gender, basis)).toEqual(expected);
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
		expect(mortalityRate(gender, 'retiree', 120)).toBe(1);
		expect(mortalityRate(gender, 'contingentSurvivor', 120)).toBe(1);
		expect(terminalAge(gender, 'retiree')).toBe(120);
		expect(terminalAge(gender, 'contingentSurvivor')).toBe(120);
	});

	it.each(GENDERS)('%s employee basis never reaches certainty', (gender) => {
		// It stops at 80, well short of the terminal age — callers must switch bases, not read on.
		expect(terminalAge(gender, 'employee')).toBeNull();
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
		expect(mortalityRate('M', 'employee', 21)).toBe(0.00044);
		expect(mortalityRate('M', 'employee', 25)).toBe(0.00042);
		expect(mortalityRate('M', 'employee', 21)).toBeGreaterThan(mortalityRate('M', 'employee', 25)!);
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
	] as Array<[Gender, MortalityBasis, number, number]>)(
		'%s/%s at age %i is %f',
		(gender, basis, age, expected) => {
			expect(mortalityRate(gender, basis, age)).toBe(expected);
		}
	);

	it('keeps male rates above female rates on every shared age and basis', () => {
		for (const basis of MORTALITY_BASES) {
			const { startAge, endAge } = ageRange('M', basis);
			for (let age = startAge; age <= endAge; age++) {
				expect(mortalityRate('M', basis, age)!).toBeGreaterThanOrEqual(
					mortalityRate('F', basis, age)!
				);
			}
		}
	});
});

describe('mortalityRate', () => {
	it('returns null outside the series rather than zero', () => {
		// Zero would read as "cannot die" and silently overstate survival.
		expect(mortalityRate('M', 'employee', 17)).toBeNull();
		expect(mortalityRate('M', 'employee', 81)).toBeNull();
		expect(mortalityRate('M', 'retiree', 49)).toBeNull();
		expect(mortalityRate('M', 'retiree', 121)).toBeNull();
	});

	it('truncates fractional ages to whole years', () => {
		expect(mortalityRate('M', 'retiree', 65.9)).toBe(mortalityRate('M', 'retiree', 65));
	});

	it('returns null for non-finite ages', () => {
		expect(mortalityRate('M', 'retiree', Number.NaN)).toBeNull();
		expect(mortalityRate('M', 'retiree', Number.POSITIVE_INFINITY)).toBeNull();
	});

	it('reads the boundary ages inclusively', () => {
		expect(mortalityRate('M', 'employee', 18)).not.toBeNull();
		expect(mortalityRate('M', 'employee', 80)).not.toBeNull();
		expect(mortalityRate('M', 'retiree', 50)).not.toBeNull();
		expect(mortalityRate('M', 'retiree', 120)).not.toBeNull();
	});
});
