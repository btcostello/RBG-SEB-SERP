import { describe, it, expect } from 'vitest';
import { Big } from '$lib/money/money';
import { expectedBenefitStream, survivalTo, type MortalityLookup } from './expected-benefits';
import { benefitStream } from './benefit-stream';

/** A table nobody ever dies on — isolates the weighting from the mortality. */
const immortal: MortalityLookup = (age) => (age <= 120 ? 0 : null);
/** Everyone dies in the year they turn 90, and not before. */
const diesAt90: MortalityLookup = (age) => (age > 120 ? null : age === 90 ? 1 : 0);
/** A flat 10% a year — easy to reason about by hand. */
const flat10: MortalityLookup = (age) => (age <= 120 ? 0.1 : null);

const base = {
	annualBenefit: new Big(100000),
	currentAge: 60,
	retirementAge: 65,
	benefitWaitingPeriod: 0,
	mortality: immortal,
	terminalAge: 120
};

const total = (stream: { amount: Big }[]) =>
	stream.reduce((sum, y) => sum.plus(y.amount), new Big(0)).toNumber();
const at = (stream: { age: number; amount: Big }[], age: number) =>
	stream.find((y) => y.age === age)?.amount.toNumber() ?? 0;

describe('expectedBenefitStream — without mortality', () => {
	it('pays every year from commencement to the terminal age', () => {
		const stream = expectedBenefitStream(base);
		expect(stream[0].age).toBe(65);
		expect(stream[stream.length - 1].age).toBe(120);
		expect(at(stream, 65)).toBe(100000);
		expect(at(stream, 120)).toBe(100000);
	});

	it('omits the years before benefits commence', () => {
		const stream = expectedBenefitStream(base);
		expect(stream.some((y) => y.age < 65)).toBe(false);
	});

	it('honours the waiting period', () => {
		const stream = expectedBenefitStream({ ...base, benefitWaitingPeriod: 3 });
		expect(stream[0].age).toBe(68);
	});

	it('honours a cap on the number of payments', () => {
		const stream = expectedBenefitStream({ ...base, maxBenefitYears: 10 });
		expect(stream).toHaveLength(10);
		expect(stream[stream.length - 1].age).toBe(74);
	});

	it('escalates by COLA like the certain stream it is derived from', () => {
		const stream = expectedBenefitStream({ ...base, colaScale: 0.02 });
		expect(at(stream, 66)).toBeCloseTo(102000, 6);
		expect(at(stream, 67)).toBeCloseTo(104040, 6);
	});
});

describe('expectedBenefitStream — the point of it', () => {
	it('runs past the entered life expectancy, which the certain stream does not', () => {
		// The certain stream stops dead at the assumed death age. Weighting that would lose the tail
		// where a participant outlives their life expectancy and keeps drawing.
		const certain = benefitStream({
			annualBenefit: new Big(100000),
			retirementAge: 65,
			benefitWaitingPeriod: 0,
			assumedDeathBenefitAge: 84
		});
		expect(certain[certain.length - 1].age).toBe(84);

		const expected = expectedBenefitStream({ ...base, mortality: flat10 });
		expect(expected[expected.length - 1].age).toBeGreaterThan(84);
	});

	it('weights each payment by survival to that age', () => {
		const stream = expectedBenefitStream({ ...base, mortality: flat10 });
		// Alive at 65 after five years at 10% a year: 0.9^5.
		expect(at(stream, 65)).toBeCloseTo(100000 * 0.9 ** 5, 4);
		// One more year to reach 66.
		expect(at(stream, 66)).toBeCloseTo(100000 * 0.9 ** 6, 4);
	});

	it('pays nothing after a death that is certain', () => {
		const stream = expectedBenefitStream({ ...base, mortality: diesAt90 });
		expect(at(stream, 90)).toBe(100000);
		expect(at(stream, 91)).toBe(0);
	});

	it('is worth less than the same stream without mortality', () => {
		const withMortality = total(expectedBenefitStream({ ...base, mortality: flat10 }));
		const without = total(expectedBenefitStream(base));
		expect(withMortality).toBeLessThan(without);
	});
});

describe('the guaranteed period', () => {
	const guaranteed = { ...base, mortality: diesAt90, guaranteedYears: 10 };

	it('pays inside the guarantee whether or not the participant lives', () => {
		// Death is certain in the year they turn 70, but the guarantee runs 65-74.
		const stream = expectedBenefitStream({
			...guaranteed,
			mortality: (age) => (age > 120 ? null : age === 70 ? 1 : 0)
		});
		expect(at(stream, 73)).toBe(100000);
		expect(at(stream, 74)).toBe(100000);
		// Past the guarantee, the participant is gone.
		expect(at(stream, 75)).toBe(0);
	});

	it('does not start benefits for someone who never reaches commencement', () => {
		// A guarantee guarantees payments once they begin; it does not begin them.
		const stream = expectedBenefitStream({
			...guaranteed,
			mortality: (age) => (age > 120 ? null : age === 61 ? 1 : 0)
		});
		expect(total(stream)).toBe(0);
	});

	it('carries only commencement risk inside the guarantee, full survival risk after', () => {
		const stream = expectedBenefitStream({ ...base, mortality: flat10, guaranteedYears: 5 });
		const reached = 0.9 ** 5; // survival from 60 to 65
		expect(at(stream, 69)).toBeCloseTo(100000 * reached, 4); // last guaranteed year
		expect(at(stream, 70)).toBeCloseTo(100000 * 0.9 ** 10, 4); // first contingent year
	});
});

describe('the survivor branch', () => {
	const survivorStream = [
		{ age: 60, amount: new Big(500000) },
		{ age: 61, amount: new Big(510000) },
		{ age: 62, amount: new Big(520000) }
	];

	it('pays the beneficiary weighted by the chance of dying that year', () => {
		const stream = expectedBenefitStream({ ...base, mortality: flat10, survivorStream });
		// Alive at 60 with certainty, 10% chance of dying during the year.
		expect(at(stream, 60)).toBeCloseTo(500000 * 0.1, 4);
		// Alive at 61 with probability 0.9, then a 10% chance.
		expect(at(stream, 61)).toBeCloseTo(510000 * 0.9 * 0.1, 4);
	});

	it('adds to the obligation rather than replacing the retirement benefit', () => {
		const withSurvivor = total(
			expectedBenefitStream({ ...base, mortality: flat10, survivorStream })
		);
		const without = total(expectedBenefitStream({ ...base, mortality: flat10 }));
		expect(withSurvivor).toBeGreaterThan(without);
	});

	it('contributes nothing when nobody dies before retirement', () => {
		const withSurvivor = total(expectedBenefitStream({ ...base, survivorStream }));
		const without = total(expectedBenefitStream(base));
		expect(withSurvivor).toBe(without);
	});

	it('lands in the year of death, not spread across the schedule', () => {
		// The survivor amount is already the collapsed total for the durational schedule.
		const stream = expectedBenefitStream({
			...base,
			mortality: (age) => (age > 120 ? null : age === 61 ? 1 : 0),
			survivorStream
		});
		expect(at(stream, 61)).toBe(510000);
		expect(at(stream, 62)).toBe(0);
	});
});

describe('edges', () => {
	it('throws rather than assuming survival where the table stops', () => {
		expect(() =>
			expectedBenefitStream({ ...base, mortality: (age) => (age < 100 ? 0 : null) })
		).toThrow(/does not cover/);
	});

	it('is empty for a participant whose benefits never commence', () => {
		expect(expectedBenefitStream({ ...base, retirementAge: 130 })).toEqual([]);
	});

	it('handles a participant already past their retirement age', () => {
		const stream = expectedBenefitStream({ ...base, currentAge: 70, retirementAge: 65 });
		// Benefits have already commenced, so the first payment is at the valuation age.
		expect(stream[0].age).toBe(70);
	});
});

describe('survivalTo', () => {
	it('is certain for an age already reached', () => {
		expect(survivalTo(60, 60, flat10).toNumber()).toBe(1);
		expect(survivalTo(60, 55, flat10).toNumber()).toBe(1);
	});

	it('compounds one year of survival per year', () => {
		expect(survivalTo(60, 63, flat10).toNumber()).toBeCloseTo(0.9 ** 3, 12);
	});

	it('is zero once death is certain', () => {
		expect(survivalTo(60, 95, diesAt90).toNumber()).toBe(0);
	});
});
