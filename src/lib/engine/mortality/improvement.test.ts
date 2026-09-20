import { describe, it, expect } from 'vitest';
import {
	IMPROVEMENT_END_AGE,
	IMPROVEMENT_END_YEAR,
	IMPROVEMENT_START_AGE,
	IMPROVEMENT_START_YEAR,
	SCALE_MP_2021_ADJUSTED_2024,
	cumulativeImprovementFactor,
	improvementRate,
	projectRate
} from './index';

const GENDERS = ['M', 'F'] as const;

describe('scale data — shape', () => {
	it('covers ages 20-120 for both genders', () => {
		const rowCount = IMPROVEMENT_END_AGE - IMPROVEMENT_START_AGE + 1;
		for (const gender of GENDERS) {
			expect(SCALE_MP_2021_ADJUSTED_2024[gender].rates).toHaveLength(rowCount);
			expect(SCALE_MP_2021_ADJUSTED_2024[gender].ultimate).toHaveLength(rowCount);
		}
	});

	it('gives every age the same run of years', () => {
		const yearCount = IMPROVEMENT_END_YEAR - IMPROVEMENT_START_YEAR + 1;
		for (const gender of GENDERS) {
			for (const row of SCALE_MP_2021_ADJUSTED_2024[gender].rates) {
				expect(row).toHaveLength(yearCount);
				expect(row.every((rate) => Number.isFinite(rate))).toBe(true);
			}
		}
	});
});

describe('improvementRate — spot values against the IRS workbooks', () => {
	it('reads the first and last columns of the "≤ 20" row', () => {
		expect(improvementRate('M', 20, 2013)).toBe(0.0071);
		expect(improvementRate('F', 20, 2013)).toBe(-0.0003);
		expect(improvementRate('M', 20, 2037)).toBe(0.0078);
	});

	it('reads a retirement-age row', () => {
		expect(improvementRate('M', 65, 2013)).toBe(0.0007);
		expect(improvementRate('M', 65, 2025)).toBe(0.0078);
	});

	it('zeroes 2024 above age 50, but not through the working ages', () => {
		// The pandemic-period adjustment zeroes the later columns at older ages only. Ages 26-50 (M)
		// and 21-46 (F) still carry deterioration into 2024, which is exactly the band a SERP census
		// sits in — so a 2024-base table must not have the 2024 column applied to it.
		for (const gender of GENDERS) {
			for (let age = 51; age <= IMPROVEMENT_END_AGE; age++) {
				expect(improvementRate(gender, age, 2024)).toBe(0);
			}
		}
		expect(improvementRate('M', 41, 2024)).toBe(-0.0136);
		expect(improvementRate('F', 39, 2024)).toBe(-0.0091);
		expect(improvementRate('M', 25, 2024)).toBe(0);
	});

	it('holds the ultimate rate flat to 86, then grades it down to zero at 120', () => {
		const at = (age: number) => improvementRate('M', age, 2040);
		expect(at(25)).toBe(0.0078);
		expect(at(70)).toBe(0.0078);
		expect(at(86)).toBe(0.0078);
		expect(at(90)).toBe(0.0063);
		expect(at(100)).toBe(0.003);
		expect(at(120)).toBe(0);
		expect(at(87)).toBeLessThan(0.0078);
	});
});

describe('improvementRate — edges', () => {
	it('covers every age at or below 20 with the "≤ 20" row', () => {
		const row = improvementRate('M', 20, 2030);
		expect(improvementRate('M', 19, 2030)).toBe(row);
		expect(improvementRate('M', 0, 2030)).toBe(row);
	});

	it('takes the ultimate rate for every year past the last column', () => {
		const ultimate = SCALE_MP_2021_ADJUSTED_2024.F.ultimate[45];
		expect(improvementRate('F', 65, IMPROVEMENT_END_YEAR + 1)).toBe(ultimate);
		expect(improvementRate('F', 65, 2200)).toBe(ultimate);
	});

	it('truncates fractional ages and years to whole numbers', () => {
		expect(improvementRate('M', 65.9, 2030.9)).toBe(improvementRate('M', 65, 2030));
	});

	it('returns null where the scale says nothing', () => {
		expect(improvementRate('M', 121, 2030)).toBeNull();
		expect(improvementRate('M', 65, IMPROVEMENT_START_YEAR - 1)).toBeNull();
		expect(improvementRate('M', Number.NaN, 2030)).toBeNull();
	});
});

describe('cumulativeImprovementFactor', () => {
	it('projects nothing across a zero-year span', () => {
		expect(cumulativeImprovementFactor('M', 65, { baseYear: 2024, targetYear: 2024 })).toBe(1);
	});

	it('multiplies (1 - rate) over the years after the base year, inclusive of the target', () => {
		const expected =
			(1 - (improvementRate('M', 55, 2025) ?? 0)) * (1 - (improvementRate('M', 55, 2026) ?? 0));
		const factor = cumulativeImprovementFactor('M', 55, { baseYear: 2024, targetYear: 2026 });
		expect(factor).toBeCloseTo(expected, 12);
	});

	it('is unchanged by including 2024 at an age where that column is zero', () => {
		const fromAnchor = cumulativeImprovementFactor('F', 60, { baseYear: 2024, targetYear: 2030 });
		const fromYearBefore = cumulativeImprovementFactor('F', 60, {
			baseYear: 2023,
			targetYear: 2030
		});
		expect(fromYearBefore).toBeCloseTo(fromAnchor ?? 0, 12);
	});

	it('is NOT anchor-free at a working age, where 2024 still carries deterioration', () => {
		const fromAnchor =
			cumulativeImprovementFactor('M', 41, { baseYear: 2024, targetYear: 2030 }) ?? 0;
		const fromYearBefore =
			cumulativeImprovementFactor('M', 41, { baseYear: 2023, targetYear: 2030 }) ?? 0;
		expect(fromYearBefore).toBeGreaterThan(fromAnchor);
		expect(fromYearBefore / fromAnchor).toBeCloseTo(1.0136, 6);
	});

	it('inverts when projecting backwards', () => {
		const forward = cumulativeImprovementFactor('M', 60, { baseYear: 2024, targetYear: 2032 }) ?? 0;
		const back = cumulativeImprovementFactor('M', 60, { baseYear: 2032, targetYear: 2024 }) ?? 0;
		expect(forward * back).toBeCloseTo(1, 12);
	});

	it('returns null when any year in the span is off the scale', () => {
		expect(cumulativeImprovementFactor('M', 65, { baseYear: 2010, targetYear: 2026 })).toBeNull();
		expect(cumulativeImprovementFactor('M', 130, { baseYear: 2024, targetYear: 2026 })).toBeNull();
	});
});

describe('projectRate', () => {
	it('leaves the base rate alone across a zero-year span', () => {
		expect(projectRate(0.0123, 'M', 65, { baseYear: 2024, targetYear: 2024 })).toBe(0.0123);
	});

	it('lowers a rate carried through improving years', () => {
		const projected = projectRate(0.01, 'M', 65, { baseYear: 2024, targetYear: 2034 }) ?? 0;
		expect(projected).toBeLessThan(0.01);
		expect(projected).toBeGreaterThan(0.008);
	});

	it('raises a rate carried through the deteriorating young-age years', () => {
		const projected = projectRate(0.001, 'F', 25, { baseYear: 2013, targetYear: 2020 }) ?? 0;
		expect(projected).toBeGreaterThan(0.001);
	});

	it('holds q = 1 at the terminal age, where the scale carries no improvement', () => {
		expect(projectRate(1, 'M', 120, { baseYear: 2024, targetYear: 2060 })).toBe(1);
	});

	it('clamps to a probability', () => {
		expect(projectRate(0, 'M', 65, { baseYear: 2024, targetYear: 2030 })).toBe(0);
		expect(projectRate(1.5, 'M', 65, { baseYear: 2024, targetYear: 2024 })).toBe(1);
	});

	it('propagates a gap in the scale rather than returning the unprojected rate', () => {
		expect(projectRate(0.01, 'M', 65, { baseYear: 2005, targetYear: 2026 })).toBeNull();
	});
});
