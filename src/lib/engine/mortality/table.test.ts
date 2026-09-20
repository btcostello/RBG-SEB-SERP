import { describe, it, expect } from 'vitest';
import type { Gender } from '$lib/domain/insured';
import {
	MORTALITY_BASES,
	SUPPORTED_RETIREMENT_AGES,
	ageRange,
	assertSupportedRetirementAge,
	basisForAge,
	irsStaticRate,
	mortalityRate,
	rateForAge,
	staticSeries,
	terminalAge,
	type MortalityBasis
} from './index';

const GENDERS: Gender[] = ['M', 'F'];
const PAIRS: Array<[Gender, MortalityBasis]> = GENDERS.flatMap((g) =>
	MORTALITY_BASES.map((b) => [g, b] as [Gender, MortalityBasis])
);
/** The year the rest of the suite values on unless it is testing the year itself. */
const YEAR = 2026;

describe('table coverage', () => {
	it('covers ages 0 to 120 on every basis and gender', () => {
		expect(ageRange()).toEqual({ startAge: 0, endAge: 120 });
		for (const [gender, basis] of PAIRS) {
			expect(mortalityRate(gender, basis, 0, YEAR)).not.toBeNull();
			expect(mortalityRate(gender, basis, 120, YEAR)).not.toBeNull();
		}
	});

	it.each(PAIRS)('%s/%s holds only valid probabilities across the whole span', (gender, basis) => {
		for (const q of staticSeries(gender, basis, YEAR)) {
			expect(q).not.toBeNull();
			expect(q!).toBeGreaterThan(0);
			expect(q!).toBeLessThanOrEqual(1);
		}
	});

	it.each(PAIRS)('%s/%s terminates at q(120) = 1', (gender, basis) => {
		// Improvement is zero at 120, so the base table's certainty survives projection.
		expect(mortalityRate(gender, basis, 120, YEAR)).toBe(1);
		expect(terminalAge(gender, basis, YEAR)).toBe(120);
	});

	it('keeps male rates at or above female rates across every age a census occupies', () => {
		for (const basis of MORTALITY_BASES) {
			for (let age = 18; age <= 112; age++) {
				expect(mortalityRate('M', basis, age, YEAR)!).toBeGreaterThanOrEqual(
					mortalityRate('F', basis, age, YEAR)!
				);
			}
		}
	});

	it('lets female rates exceed male at ages 9-11 and above 112, as the source data does', () => {
		// Not a transcription slip: the IRS's own published 2024 static table has age 10 at
		// 0.00005 male against 0.00006 female. Pinned so the sweep above is understood to be
		// bounded by the data rather than by convenience.
		for (const basis of MORTALITY_BASES) {
			expect(mortalityRate('M', basis, 10, YEAR)!).toBeLessThan(
				mortalityRate('F', basis, 10, YEAR)!
			);
			expect(mortalityRate('M', basis, 115, YEAR)!).toBeLessThan(
				mortalityRate('F', basis, 115, YEAR)!
			);
		}
	});

	it('rates an annuitant above a non-annuitant at working ages', () => {
		// Annuitant tables carry no active-employee selection, so commencing benefits is a step up
		// in rate rather than down.
		expect(mortalityRate('M', 'annuitant', 60, YEAR)!).toBeGreaterThan(
			mortalityRate('M', 'nonAnnuitant', 60, YEAR)!
		);
	});
});

describe('mortalityRate', () => {
	it('returns the IRS static rate for the valuation year', () => {
		expect(mortalityRate('M', 'annuitant', 68, YEAR)).toBe(
			irsStaticRate('M', 'annuitant', 68, YEAR)
		);
	});

	it('returns a different rate for a different valuation year', () => {
		// A static table is rebuilt annually; later years carry more improvement.
		const earlier = mortalityRate('F', 'annuitant', 70, 2026)!;
		const later = mortalityRate('F', 'annuitant', 70, 2036)!;
		expect(later).toBeLessThan(earlier);
	});

	it('returns null outside the age span rather than zero', () => {
		// Zero would read as "cannot die" and silently overstate survival.
		expect(mortalityRate('M', 'annuitant', -1, YEAR)).toBeNull();
		expect(mortalityRate('M', 'annuitant', 121, YEAR)).toBeNull();
	});

	it('returns null before the base year of the tables', () => {
		expect(mortalityRate('M', 'annuitant', 65, 2011)).toBeNull();
	});

	it('truncates fractional ages to whole years', () => {
		expect(mortalityRate('M', 'annuitant', 65.9, YEAR)).toBe(
			mortalityRate('M', 'annuitant', 65, YEAR)
		);
	});

	it('returns null for non-finite ages', () => {
		expect(mortalityRate('M', 'annuitant', Number.NaN, YEAR)).toBeNull();
		expect(mortalityRate('M', 'annuitant', Number.POSITIVE_INFINITY, YEAR)).toBeNull();
	});
});

describe('staticSeries', () => {
	it('returns one rate per age from 0 to 120', () => {
		expect(staticSeries('M', 'annuitant', YEAR)).toHaveLength(121);
	});

	it('hands back the same cached series for repeated calls', () => {
		// Building a series walks a century of improvement factors per age, and a projection reads
		// it once per age per life — the cache is what keeps that cheap.
		expect(staticSeries('M', 'annuitant', YEAR)).toBe(staticSeries('M', 'annuitant', YEAR));
	});

	it('caches per gender, basis and year rather than globally', () => {
		const base = staticSeries('M', 'annuitant', YEAR);
		expect(staticSeries('F', 'annuitant', YEAR)).not.toBe(base);
		expect(staticSeries('M', 'nonAnnuitant', YEAR)).not.toBe(base);
		expect(staticSeries('M', 'annuitant', YEAR + 1)).not.toBe(base);
	});
});

describe('basisForAge and rateForAge', () => {
	it('switches basis at the retirement age', () => {
		expect(basisForAge(64, 65)).toBe('nonAnnuitant');
		expect(basisForAge(65, 65)).toBe('annuitant');
		expect(basisForAge(66, 65)).toBe('annuitant');
	});

	it('defaults the retirement age to 65', () => {
		expect(basisForAge(64)).toBe('nonAnnuitant');
		expect(basisForAge(65)).toBe('annuitant');
	});

	it('reads the basis its own switch selects', () => {
		expect(rateForAge('M', 64, YEAR, 65)).toBe(mortalityRate('M', 'nonAnnuitant', 64, YEAR));
		expect(rateForAge('M', 65, YEAR, 65)).toBe(mortalityRate('M', 'annuitant', 65, YEAR));
	});

	it('steps up at retirement, which is the tables talking, not a bug', () => {
		const lastWorking = rateForAge('M', 64, YEAR, 65)!;
		const firstRetired = rateForAge('M', 65, YEAR, 65)!;
		expect(firstRetired).toBeGreaterThan(lastWorking);
	});
});

describe('assertSupportedRetirementAge', () => {
	it('accepts any age the tables cover', () => {
		expect(SUPPORTED_RETIREMENT_AGES).toEqual({ startAge: 0, endAge: 120 });
		// The old white collar basis rejected these — its employee series stopped at 80, leaving a
		// gap outside 50-81. The IRS tables tile at every age, so they are valid now.
		expect(() => assertSupportedRetirementAge(45)).not.toThrow();
		expect(() => assertSupportedRetirementAge(85)).not.toThrow();
	});

	it('rejects an age off the tables', () => {
		expect(() => assertSupportedRetirementAge(121)).toThrow(/outside the ages/);
		expect(() => assertSupportedRetirementAge(-1)).toThrow(/outside the ages/);
	});

	it('rejects a fractional age', () => {
		expect(() => assertSupportedRetirementAge(65.5)).toThrow(/whole number/);
	});
});
