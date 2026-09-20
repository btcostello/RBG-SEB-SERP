import { describe, it, expect } from 'vitest';
import type { ParticipantDesign, ParticipantResult, Results } from '$lib/domain';
import {
	COMPOSITE_ID,
	compositeLedger,
	designFor,
	hasDesigns,
	ledgerFor,
	ledgerTotals,
	participantLedger,
	subjectsFor
} from './ledger';

/** One illustration year, with only the columns a ledger reads. */
function year(
	policyYear: number,
	age: number,
	premium: string,
	accountValue: string,
	cashSurrenderValue: string,
	deathBenefit: string
) {
	return { policyYear, age, premium, accountValue, cashSurrenderValue, deathBenefit };
}

function design(years: ReturnType<typeof year>[]): ParticipantDesign {
	return {
		faceAmount: '500000.00',
		firstYearPremium: years[0]?.premium ?? '0.00',
		illustrationYears: years
	};
}

/** Two lives: one running three years, one lapsing after two. */
function buildResults(): Results {
	const alice: ParticipantResult = {
		insuredId: 'a',
		finalAverageSalary: '0.00',
		annualBenefit: '0.00',
		benefitStream: [],
		totalBenefitCost: '0.00',
		netPresentValue: '0.00',
		designs: {
			'cost-recovery': design([
				year(1, 45, '10000.00', '6000.00', '0.00', '500000.00'),
				year(2, 46, '10000.00', '13000.00', '8000.00', '500000.00'),
				year(3, 47, '10000.00', '21000.00', '17000.00', '500000.00')
			])
		}
	};

	const bob: ParticipantResult = {
		insuredId: 'b',
		finalAverageSalary: '0.00',
		annualBenefit: '0.00',
		benefitStream: [],
		totalBenefitCost: '0.00',
		netPresentValue: '0.00',
		designs: {
			'cost-recovery': design([
				year(1, 60, '25000.00', '15000.00', '0.00', '300000.00'),
				year(2, 61, '25000.00', '32000.00', '20000.00', '300000.00')
			])
		}
	};

	return {
		perParticipant: [alice, bob],
		aggregate: { totalBenefitCost: '0.00', netPresentValue: '0.00' }
	};
}

const NAMES: Record<string, string> = { a: 'Alice Anders', b: 'Bob Baker' };
const nameFor = (id: string) => NAMES[id] ?? id;

describe('participantLedger', () => {
	it('carries one row per illustrated policy year', () => {
		const rows = participantLedger(designFor(buildResults().perParticipant[0], 'cost-recovery'));
		expect(rows).toHaveLength(3);
		expect(rows[0]).toMatchObject({
			policyYear: 1,
			age: 45,
			premium: '10000.00',
			accountValue: '6000.00',
			cashSurrenderValue: '0.00',
			deathBenefit: '500000.00',
			policyCount: 1
		});
	});

	it('keeps the attained age, which a single life has and a composite does not', () => {
		const rows = participantLedger(designFor(buildResults().perParticipant[0], 'cost-recovery'));
		expect(rows.map((r) => r.age)).toEqual([45, 46, 47]);
	});

	it('is empty for a design with no stream, and for no design at all', () => {
		expect(participantLedger(undefined)).toEqual([]);
		expect(participantLedger({ faceAmount: '1.00', firstYearPremium: '1.00' })).toEqual([]);
	});
});

describe('compositeLedger', () => {
	const rows = compositeLedger(
		buildResults().perParticipant.map((p) => designFor(p, 'cost-recovery'))
	);

	it('runs to the longest stream', () => {
		expect(rows.map((r) => r.policyYear)).toEqual([1, 2, 3]);
	});

	it('sums every money column by policy year', () => {
		expect(rows[0]).toMatchObject({
			premium: '35000.00',
			accountValue: '21000.00',
			cashSurrenderValue: '0.00',
			deathBenefit: '800000.00'
		});
		expect(rows[1]).toMatchObject({ premium: '35000.00', accountValue: '45000.00' });
	});

	it('drops a lapsed policy out rather than carrying it forward', () => {
		// Bob's stream stops after year 2, so year 3 is Alice alone — the composite death benefit
		// falls, and that fall is the data rather than a hole in it.
		expect(rows[2]).toMatchObject({ deathBenefit: '500000.00', premium: '10000.00' });
		expect(rows.map((r) => r.policyCount)).toEqual([2, 2, 1]);
	});

	it('has no attained age, because the lives are different ages in the same year', () => {
		expect(rows.every((r) => r.age === null)).toBe(true);
	});

	it('ignores participants with no design for the option', () => {
		const some = buildResults().perParticipant.map((p) => designFor(p, 'premium-deposit'));
		expect(compositeLedger(some)).toEqual([]);
	});

	it('orders rows by policy year regardless of input order', () => {
		const reversed = compositeLedger(
			buildResults()
				.perParticipant.map((p) => designFor(p, 'cost-recovery'))
				.reverse()
		);
		expect(reversed.map((r) => r.policyYear)).toEqual([1, 2, 3]);
	});
});

describe('ledgerTotals', () => {
	it('totals premium across the whole illustrated life', () => {
		const rows = participantLedger(designFor(buildResults().perParticipant[0], 'cost-recovery'));
		expect(ledgerTotals(rows)).toEqual({ totalPremium: '30000.00', years: 3, policyCount: 1 });
	});

	it('reports the widest policy count a composite reached', () => {
		const rows = compositeLedger(
			buildResults().perParticipant.map((p) => designFor(p, 'cost-recovery'))
		);
		// Alice's 3 × 10,000 plus Bob's 2 × 25,000.
		expect(ledgerTotals(rows)).toEqual({ totalPremium: '80000.00', years: 3, policyCount: 2 });
	});

	it('is zero over no rows', () => {
		expect(ledgerTotals([])).toEqual({ totalPremium: '0.00', years: 0, policyCount: 0 });
	});
});

describe('subjectsFor', () => {
	it('offers the composite first, then each designed participant in census order', () => {
		const subjects = subjectsFor(buildResults(), 'cost-recovery', nameFor);
		expect(subjects.map((s) => s.label)).toEqual([
			'Composite — all policies',
			'Alice Anders',
			'Bob Baker'
		]);
		expect(subjects[0]).toMatchObject({ id: COMPOSITE_ID, isComposite: true });
	});

	it('skips the composite when only one policy is designed', () => {
		// One policy is its own composite; offering both would be two names for one ledger.
		const results = buildResults();
		results.perParticipant[1].designs = {};
		const subjects = subjectsFor(results, 'cost-recovery', nameFor);
		expect(subjects).toHaveLength(1);
		expect(subjects[0]).toMatchObject({ id: 'a', isComposite: false });
	});

	it('is empty for an option nothing is designed under', () => {
		expect(subjectsFor(buildResults(), 'premium-recovery', nameFor)).toEqual([]);
	});
});

describe('ledgerFor', () => {
	it('resolves the composite id to the summed ledger', () => {
		const rows = ledgerFor(buildResults(), 'cost-recovery', COMPOSITE_ID);
		expect(rows[0].premium).toBe('35000.00');
	});

	it('resolves a participant id to that policy alone', () => {
		const rows = ledgerFor(buildResults(), 'cost-recovery', 'b');
		expect(rows).toHaveLength(2);
		expect(rows[0].premium).toBe('25000.00');
	});

	it('is empty for an unknown participant or an undesigned option', () => {
		expect(ledgerFor(buildResults(), 'cost-recovery', 'nobody')).toEqual([]);
		expect(ledgerFor(buildResults(), 'premium-deposit', COMPOSITE_ID)).toEqual([]);
	});
});

describe('hasDesigns', () => {
	it('is true only for an option with an illustrated policy', () => {
		expect(hasDesigns(buildResults(), 'cost-recovery')).toBe(true);
		expect(hasDesigns(buildResults(), 'benefit-distribution')).toBe(false);
	});
});
