import { describe, it, expect } from 'vitest';
import { ageNearestBirthday, completedYearsBetween, isValidIsoDate } from './age';

describe('ageNearestBirthday — boundary birthday cases (AR19)', () => {
	const dob = '1967-06-15';

	it('returns completed age on the exact birthday', () => {
		expect(ageNearestBirthday(dob, '2027-06-15')).toBe(60);
	});

	it('rounds down just after a birthday (closer to last birthday)', () => {
		// ~1 month past the 60th birthday -> nearest birthday is the 60th
		expect(ageNearestBirthday(dob, '2027-07-15')).toBe(60);
	});

	it('rounds up just before the next birthday (closer to next birthday)', () => {
		// ~1 month before the 61st birthday -> nearest birthday is the 61st
		expect(ageNearestBirthday(dob, '2028-05-15')).toBe(61);
	});

	it('rounds up at roughly the half-year boundary', () => {
		// Six months after the 60th birthday -> halfway, ties round up to 61
		expect(ageNearestBirthday(dob, '2027-12-15')).toBe(61);
	});

	it('rounds down just under half a year after a birthday', () => {
		// ~5 months after the 60th birthday -> still nearest the 60th
		expect(ageNearestBirthday(dob, '2027-11-15')).toBe(60);
	});

	it('handles an as-of date before the birthday within the same year', () => {
		// May 2027, birthday in June -> last birthday was the 59th (June 2026), next is 60th
		// ~11 months since 59th, ~1 month to 60th -> nearest is the 60th
		expect(ageNearestBirthday(dob, '2027-05-15')).toBe(60);
	});

	it('handles a Feb-29 birthday in a non-leap as-of year', () => {
		// Born 2000-02-29; as of 2023-02-28 (non-leap). Birthday falls back to Feb 28.
		expect(ageNearestBirthday('2000-02-29', '2023-02-28')).toBe(23);
	});
});

describe('completedYearsBetween', () => {
	it('counts full years to an exact anniversary', () => {
		expect(completedYearsBetween('2000-01-01', '2025-01-01')).toBe(25);
	});

	it('does not count the final year before the anniversary', () => {
		expect(completedYearsBetween('2000-06-15', '2025-06-14')).toBe(24);
	});
});

describe('isValidIsoDate', () => {
	it('accepts real calendar dates', () => {
		expect(isValidIsoDate('1967-06-15')).toBe(true);
		expect(isValidIsoDate('2000-02-29')).toBe(true); // leap year
	});

	it('rejects malformed or impossible dates', () => {
		expect(isValidIsoDate('2021-02-29')).toBe(false); // not a leap year
		expect(isValidIsoDate('1967-13-01')).toBe(false);
		expect(isValidIsoDate('1967-6-15')).toBe(false); // not zero-padded
		expect(isValidIsoDate('06/15/1967')).toBe(false);
		expect(isValidIsoDate('')).toBe(false);
	});
});
