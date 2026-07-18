import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import { DesignRequestSchema, type StreamYear } from '$lib/domain';
import {
	benefitStreamToDistributionPeriods,
	dboSwitchAfterFunding,
	premiumFundedBase
} from './design-basis';
import { buildBenefitDistributionDesignRequest } from './benefit-distribution';
import { buildPremiumDepositDesignRequest } from './premium-deposit';
import {
	buildFlooredPremiumRecoveryDesignRequest,
	buildPremiumRecoveryDesignRequest,
	premiumRecoveryIsUnderfunded
} from './premium-recovery';

const insured = {
	issueAge: 45,
	gender: 'M',
	riskClass: 'Standard Non Tobacco',
	seedFaceAmount: '1000000.00',
	productType: 'IUL',
	creditedRate: 0.0575
} as const;

/** Level $30k benefit, attained ages 66-85 → policy years 21-40 for a 45-year-old. */
const levelStream: StreamYear[] = Array.from({ length: 20 }, (_, i) => ({
	age: 66 + i,
	amount: '30000.00'
}));

describe('premiumFundedBase — shared Option 2/3/4 basis', () => {
	it('uses the smallest compliant face', () => {
		const base = premiumFundedBase(insured);
		expect(base.facePeriods).toEqual([{ startYear: 1, endYear: 121, kind: 'min_non_mec' }]);
		// CVAT's headroom is unenforced by the engine, so it is not a real alternative yet.
		expect(base.qualificationTest).toBe('GPT');
	});

	it('runs DBO B while funding, then switches to A the year after the final premium', () => {
		// B buys guideline room while premium goes in; A avoids paying its extra COI for the
		// whole distribution phase.
		expect(premiumFundedBase(insured).dboPeriods).toEqual([
			{ startYear: 1, endYear: 10, option: 'B' },
			{ startYear: 11, endYear: 121, option: 'A' }
		]);
		expect(premiumFundedBase({ ...insured, payYears: 5 }).dboPeriods).toEqual([
			{ startYear: 1, endYear: 5, option: 'B' },
			{ startYear: 6, endYear: 121, option: 'A' }
		]);
	});

	it('leaves DBO B running when the pay period covers every modelled year', () => {
		expect(dboSwitchAfterFunding(121)).toEqual([{ startYear: 1, endYear: 121, option: 'B' }]);
	});

	it('defaults the pay period to ten years and honours 5-10 year designs', () => {
		expect(premiumFundedBase(insured).premiumPeriods).toEqual([
			{ startYear: 1, endYear: 10, kind: 'solve' }
		]);
		expect(premiumFundedBase({ ...insured, payYears: 5 }).premiumPeriods?.[0].endYear).toBe(5);
	});
});

describe('benefitStreamToDistributionPeriods', () => {
	it('collapses a level payout into one window on the right policy years', () => {
		// Year 1 ends at issueAge + 1, so attained age 66 is policy year 21 for a 45-year-old.
		expect(benefitStreamToDistributionPeriods(levelStream, 45)).toEqual([
			{ startYear: 21, endYear: 40, kind: 'specify', amount: '30000.00' }
		]);
	});

	it('splits a stepped payout into one window per distinct amount', () => {
		const stepped: StreamYear[] = [
			{ age: 66, amount: '30000.00' },
			{ age: 67, amount: '30000.00' },
			{ age: 68, amount: '15000.00' }
		];
		expect(benefitStreamToDistributionPeriods(stepped, 45)).toEqual([
			{ startYear: 21, endYear: 22, kind: 'specify', amount: '30000.00' },
			{ startYear: 23, endYear: 23, kind: 'specify', amount: '15000.00' }
		]);
	});

	it('drops benefits at or before the issue age — no policy exists to draw from', () => {
		expect(benefitStreamToDistributionPeriods([{ age: 45, amount: '1000.00' }], 45)).toEqual([]);
	});

	it('does not merge non-adjacent windows carrying the same amount', () => {
		const gapped: StreamYear[] = [
			{ age: 66, amount: '30000.00' },
			{ age: 70, amount: '30000.00' }
		];
		expect(benefitStreamToDistributionPeriods(gapped, 45)).toHaveLength(2);
	});
});

describe('Options 2-4 design requests', () => {
	it('Option 2 draws the benefit stream and solves premium to $1k net AV at 100', () => {
		const request = buildBenefitDistributionDesignRequest({ ...insured, benefitStream: levelStream });
		expect(request.distributionPeriods).toEqual([
			{ startYear: 21, endYear: 40, kind: 'specify', amount: '30000.00' }
		]);
		expect(request.distributionType).toBe('withdraw_to_basis_then_loan');
		expect(request.solve).toMatchObject({ target: 'specify', value: '1000.00', when: 100 });
		expect(v.safeParse(DesignRequestSchema, request).success).toBe(true);
	});

	it('Option 3 reuses Option 2 premium as specified, with no distributions and no solve', () => {
		const request = buildPremiumDepositDesignRequest({ ...insured, annualPremium: '33698.00' });
		expect(request.premiumPeriods).toEqual([
			{ startYear: 1, endYear: 10, kind: 'specify', amount: '33698.00' }
		]);
		expect(request.solve).toBeUndefined();
		expect(request.distributionPeriods).toBeUndefined();
		expect(v.safeParse(DesignRequestSchema, request).success).toBe(true);
	});

	it('Option 4 keeps Option 2 distributions but targets premium recovery at LE', () => {
		const request = buildPremiumRecoveryDesignRequest({
			...insured,
			benefitStream: levelStream,
			lifeExpectancy: 85
		});
		expect(request.distributionPeriods).toEqual(
			buildBenefitDistributionDesignRequest({ ...insured, benefitStream: levelStream })
				.distributionPeriods
		);
		// A derived target carries no `value` — it is recomputed against premium each trial.
		expect(request.solve).toEqual({
			mode: 'premium',
			metric: 'net_death_benefit',
			target: 'premium_recovery',
			when: 85,
			basis: 'age'
		});
		expect(request.solve?.value).toBeUndefined();
		expect(v.safeParse(DesignRequestSchema, request).success).toBe(true);
	});

	it('Option 4 floors at Option 2 premium — it must be at least as well funded', () => {
		expect(premiumRecoveryIsUnderfunded('25657.00', '32129.00')).toBe(true);
		expect(premiumRecoveryIsUnderfunded('32129.00', '32129.00')).toBe(false);
		expect(premiumRecoveryIsUnderfunded('40000.00', '32129.00')).toBe(false);
	});

	it('the floored Option 4 keeps the distributions but specifies Option 2 premium', () => {
		const floored = buildFlooredPremiumRecoveryDesignRequest({
			...insured,
			benefitStream: levelStream,
			lifeExpectancy: 85,
			annualPremium: '32129.00'
		});
		expect(floored.premiumPeriods).toEqual([
			{ startYear: 1, endYear: 10, kind: 'specify', amount: '32129.00' }
		]);
		// Premium recovery becomes a reported outcome, not the target.
		expect(floored.solve).toBeUndefined();
		expect(floored.distributionPeriods).toEqual([
			{ startYear: 21, endYear: 40, kind: 'specify', amount: '30000.00' }
		]);
		expect(v.safeParse(DesignRequestSchema, floored).success).toBe(true);
	});
});
