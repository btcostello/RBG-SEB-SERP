import { describe, it, expect } from 'vitest';
import { irs417eRate, irs417eRateUnisex, irsCombinedStaticRate } from './index';
import { IRS_417E_2024_PUBLISHED } from './irs-417e-2024.fixture';
import { IRS_STATIC_2024_PUBLISHED } from './irs-static-2024.fixture';

const UNITS = 1e5;
const units = (rate: number) => Math.round(rate * UNITS);
/** The blend, in exact integer units, rounding the half up. */
const blendUnits = (male: number, female: number) => {
	const sum = units(male) + units(female);
	return Math.floor(sum / 2) + (sum % 2);
};

describe('the blending rule itself', () => {
	it("reproduces every one of the IRS's published 2024 rates from its own male and female tables", () => {
		// Nothing of ours is under test here — this feeds the IRS's published male and female
		// combined rates through the Rev. Rul. 2007-67 blend and checks the published 417(e) table
		// falls out. If this ever fails, the rule is wrong, not the data.
		let exact = 0;
		for (let age = 0; age <= 120; age++) {
			const got = blendUnits(IRS_STATIC_2024_PUBLISHED.M[age], IRS_STATIC_2024_PUBLISHED.F[age]);
			if (got === units(IRS_417E_2024_PUBLISHED[age])) exact++;
		}
		expect(exact).toBe(121);
	});

	it('needs exact-half handling that naive floating point does not give', () => {
		// Two five-decimal rates average to an exact half whenever their last digits differ in
		// parity, which happens at a good fraction of ages. Averaging as floats and rounding once
		// silently loses some of those, because e.g. 0.000385 * 1e5 is 38.499999999999996 in binary.
		// Asserted across the real table rather than on a hand-picked pair.
		let naiveMisses = 0;
		let exactMisses = 0;
		for (let age = 0; age <= 120; age++) {
			const male = IRS_STATIC_2024_PUBLISHED.M[age];
			const female = IRS_STATIC_2024_PUBLISHED.F[age];
			const published = units(IRS_417E_2024_PUBLISHED[age]);
			if (Math.round(((male + female) / 2) * UNITS) !== published) naiveMisses++;
			if (blendUnits(male, female) !== published) exactMisses++;
		}
		expect(exactMisses).toBe(0);
		expect(naiveMisses).toBeGreaterThan(0);
	});
});

describe('irs417eRate against the published 2024 table', () => {
	const rebuilt = Array.from({ length: 121 }, (_, age) => ({
		age,
		got: irs417eRate(age, 2024)!,
		published: IRS_417E_2024_PUBLISHED[age]
	}));

	it('covers every age', () => {
		expect(rebuilt.every((row) => Number.isFinite(row.got))).toBe(true);
	});

	it('lands within one unit of the last published decimal at every age', () => {
		const worst = rebuilt.reduce(
			(max, row) => Math.max(max, Math.abs(units(row.got) - units(row.published))),
			0
		);
		expect(worst).toBeLessThanOrEqual(1);
	});

	it('matches exactly at all but a handful of ages', () => {
		// The residual is inherited: our static tables differ from the published ones at 13 of 242
		// rates because the IRS worked from unrounded MP-2021 rates and only the four-decimal scale
		// is published. Blending halves that to 6. If this count rises, something drifted.
		const exact = rebuilt.filter((row) => units(row.got) === units(row.published)).length;
		expect(exact).toBeGreaterThanOrEqual(115);
	});

	it('reproduces the ends of the table', () => {
		expect(irs417eRate(0, 2024)).toBeCloseTo(0.00331, 10);
		expect(irs417eRate(120, 2024)).toBe(1);
	});
});

describe('irs417eRate — behaviour', () => {
	it('sits between the male and female rates it blends', () => {
		for (const age of [45, 55, 65, 75, 85]) {
			const male = irsCombinedStaticRate('M', age, 2026)!;
			const female = irsCombinedStaticRate('F', age, 2026)!;
			const unisex = irs417eRate(age, 2026)!;
			expect(unisex).toBeLessThanOrEqual(Math.max(male, female));
			expect(unisex).toBeGreaterThanOrEqual(Math.min(male, female));
		}
	});

	it('improves as the valuation year advances, like the tables under it', () => {
		expect(irs417eRate(65, 2036)!).toBeLessThan(irs417eRate(65, 2026)!);
	});

	it('rises with age across the ages a census occupies', () => {
		for (let age = 40; age < 100; age++) {
			expect(irs417eRate(age + 1, 2026)!).toBeGreaterThan(irs417eRate(age, 2026)!);
		}
	});

	it('is null where the static tables say nothing', () => {
		expect(irs417eRate(121, 2026)).toBeNull();
		expect(irs417eRate(-1, 2026)).toBeNull();
		expect(irs417eRate(65, 2011)).toBeNull();
	});

	it('truncates fractional ages', () => {
		expect(irs417eRate(65.9, 2026)).toBe(irs417eRate(65, 2026));
	});
});

describe('irs417eRateUnisex', () => {
	it('returns the same rate whichever gender is passed, which is the point', () => {
		expect(irs417eRateUnisex('M', 60, 2026)).toBe(irs417eRateUnisex('F', 60, 2026));
		expect(irs417eRateUnisex('M', 60, 2026)).toBe(irs417eRate(60, 2026));
	});
});
