import { describe, it, expect } from 'vitest';
import { Big } from '$lib/money/money';
import type { ParticipantResult, Results } from '$lib/domain';
import { coliValueForOption } from './coli-value';

const OPTION = 'cost-recovery';

function year(policyYear: number, premium: string, csv: string) {
	return {
		policyYear,
		age: 44 + policyYear,
		premium,
		accountValue: csv,
		cashSurrenderValue: csv,
		deathBenefit: '1000000.00'
	};
}

/**
 * One policy paying 100,000 a year for three years. Surrender value lags the premium at first —
 * acquisition charges — and then overtakes it.
 */
function results(
	years = [
		year(1, '100000.00', '60000.00'),
		year(2, '100000.00', '190000.00'),
		year(3, '0.00', '260000.00')
	]
): Results {
	const participant: ParticipantResult = {
		insuredId: 'a',
		finalAverageSalary: '0.00',
		annualBenefit: '0.00',
		benefitStream: [],
		totalBenefitCost: '0.00',
		netPresentValue: '0.00',
		designs: {
			[OPTION]: {
				faceAmount: '1000000.00',
				firstYearPremium: '100000.00',
				illustrationYears: years
			}
		}
	};
	return {
		perParticipant: [participant],
		aggregate: { totalBenefitCost: '0.00', netPresentValue: '0.00' }
	};
}

const noDeaths = [new Big(0), new Big(0), new Big(0)];
const value = (text: string) =>
	Number(text.replace(/[(),]/g, '')) * (text.startsWith('(') ? -1 : 1);

describe('coliValueForOption', () => {
	it('is null for an option that designed nothing', () => {
		expect(coliValueForOption(results(), 'premium-recovery', noDeaths)).toBeNull();
	});

	it('charges earnings in the years premium outruns surrender value', () => {
		const f = coliValueForOption(results(), OPTION, noDeaths)!;
		// Year 1: surrender value rises 60,000 on a 100,000 premium — a 40,000 charge.
		expect(value(f.rows[0].afterTaxEarnings)).toBe(-40000);
		// Year 2: rises 130,000 on the same premium — a 30,000 credit.
		expect(value(f.rows[1].afterTaxEarnings)).toBe(30000);
	});

	it('reports the first positive year as the accretive one', () => {
		const f = coliValueForOption(results(), OPTION, noDeaths)!;
		expect(f.accretiveFromYear).toBe(2);
	});

	it('leaves accretiveFromYear null when the programme never turns', () => {
		const f = coliValueForOption(
			results([year(1, '100000.00', '10000.00'), year(2, '100000.00', '20000.00')]),
			OPTION,
			noDeaths
		)!;
		expect(f.accretiveFromYear).toBeNull();
	});

	it('accumulates death proceeds into CSV + proceeds and into earnings', () => {
		const withDeath = [new Big(0), new Big(500000), new Big(0)];
		const f = coliValueForOption(results(), OPTION, withDeath)!;
		// Year 2 collects 500,000, so the running asset carries it from then on.
		expect(value(f.rows[1].csvPlusProceeds)).toBe(190000 + 500000);
		expect(value(f.rows[2].csvPlusProceeds)).toBe(260000 + 500000);
		expect(value(f.rows[1].afterTaxEarnings)).toBe(30000 + 500000);
	});

	it('totals the return as the closing asset and the gain as return less premiums', () => {
		const f = coliValueForOption(results(), OPTION, noDeaths)!;
		expect(value(f.totalReturn)).toBe(260000);
		expect(value(f.totalGain)).toBe(260000 - 200000);
	});

	it('makes the Ultimate row the programme gain, not one year of it', () => {
		const f = coliValueForOption(results(), OPTION, noDeaths)!;
		const ultimate = f.rows[f.rows.length - 1];
		expect(ultimate.label).toBe('Ultimate');
		expect(value(ultimate.afterTaxEarnings)).toBe(value(f.totalGain));
	});

	it('runs the cumulative series to the same place as the gain', () => {
		const f = coliValueForOption(results(), OPTION, noDeaths)!;
		expect(f.cumulativeEarnings).toHaveLength(3);
		expect(f.cumulativeEarnings[2]).toBe(value(f.totalGain));
	});

	it('takes the level premium from the first year', () => {
		const f = coliValueForOption(results(), OPTION, noDeaths)!;
		expect(value(f.levelAnnualPremium)).toBe(100000);
	});
});

describe('which years the table reports', () => {
	/** A long illustration, so the thinning-out rule actually bites. */
	const long = () =>
		results(
			Array.from({ length: 40 }, (_, i) =>
				year(i + 1, i < 10 ? '100000.00' : '0.00', String((i + 1) * 50000) + '.00')
			)
		);

	it('shows every year to 10, then each fifth to 30, then the last', () => {
		const f = coliValueForOption(long(), OPTION, [])!;
		expect(f.rows.map((r) => r.label)).toEqual([
			'1',
			'2',
			'3',
			'4',
			'5',
			'6',
			'7',
			'8',
			'9',
			'10',
			'15',
			'20',
			'25',
			'30',
			'Ultimate'
		]);
		expect(f.rows[f.rows.length - 1].policyYear).toBe(40);
	});

	it('never repeats the final year as both a milestone and Ultimate', () => {
		// A 30-year illustration would otherwise print 30 twice.
		const f = coliValueForOption(
			results(Array.from({ length: 30 }, (_, i) => year(i + 1, '0.00', '1000.00'))),
			OPTION,
			[]
		)!;
		const labels = f.rows.map((r) => r.label);
		expect(labels.filter((l) => l === '30')).toHaveLength(0);
		expect(labels[labels.length - 1]).toBe('Ultimate');
		expect(new Set(f.rows.map((r) => r.policyYear)).size).toBe(f.rows.length);
	});

	it('does not invent milestone rows a short illustration never reaches', () => {
		const f = coliValueForOption(results(), OPTION, noDeaths)!;
		expect(f.rows.map((r) => r.label)).toEqual(['1', '2', 'Ultimate']);
	});
});
