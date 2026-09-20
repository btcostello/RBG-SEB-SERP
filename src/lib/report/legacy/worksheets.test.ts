import { describe, it, expect } from 'vitest';
import { Big } from '$lib/money/money';
import type { AccountingResult, SerpAccountingYear } from '$lib/accounting';
import { coliWorksheetAmounts, serpWorksheetAmounts, type PeriodValues } from './worksheets';

const REF = '2025-10-27'; // three stub months, as in the source report
const TAX = 0.21;

/** Read a displayed figure back, honouring the report's parentheses-for-credits convention. */
function value(values: PeriodValues, period: number): number {
	const text = values[period];
	if (text === null) return Number.NaN;
	const negative = text.startsWith('(');
	return Number(text.replace(/[(),]/g, '')) * (negative ? -1 : 1);
}

function serpYear(planYear: number, over: Partial<SerpAccountingYear> = {}): SerpAccountingYear {
	return {
		planYear,
		calendarYear: 2025 + planYear - 1,
		serviceCost: '0.00',
		interestCost: '0.00',
		priorServiceCostAmortization: '0.00',
		pensionExpense: '0.00',
		pboBoy: '0.00',
		pboEoy: '0.00',
		grossBenefitPayments: '0.00',
		annualUnfundedAccruedPensionCost: '0.00',
		unfundedAccruedPensionCostEoy: '0.00',
		unrecognizedPriorServiceCostBoy: '0.00',
		unrecognizedPriorServiceCostEoy: '0.00',
		aociEoy: '0.00',
		aociNetOfTaxEoy: '0.00',
		benefitTaxDeduction: '0.00',
		deferredTaxAssetEoy: '0.00',
		netSerpEarningsImpact: '0.00',
		...over
	};
}

/** A plan shaped like the source's: 3,806,707 of prior service cost, level amortisation. */
function accounting(): AccountingResult {
	const py1 = serpYear(1, {
		serviceCost: '447196.00',
		interestCost: '218886.00',
		priorServiceCostAmortization: '237919.00',
		unrecognizedPriorServiceCostBoy: '3806707.00'
	});
	const py2 = serpYear(2, {
		serviceCost: '472912.00',
		interestCost: '257185.00',
		priorServiceCostAmortization: '237919.00'
	});
	return {
		serp: [py1, py2],
		coliByOption: {},
		byParticipant: [],
		status: 'partial',
		referenceYear: 2025,
		horizonPlanYears: 2
	};
}

const amounts = () => serpWorksheetAmounts(accounting(), REF, TAX)!;

describe('serpWorksheetAmounts — against the source report', () => {
	it('reproduces the published service and interest columns', () => {
		const w = amounts();
		expect(value(w.serviceCost, 0)).toBeCloseTo(37266, 0);
		expect(value(w.serviceCost, 1)).toBeCloseTo(111799, 0);
		expect(value(w.serviceCost, 2)).toBeCloseTo(453625, 0);
		expect(value(w.interestCost, 0)).toBeCloseTo(18241, 0);
		expect(value(w.interestCost, 1)).toBeCloseTo(54722, 0);
	});

	it('reproduces the published accrual entry: 55,507 / 166,521 / 682,086', () => {
		const w = amounts();
		expect(value(w.accrual, 0)).toBeCloseTo(55507, 0);
		expect(value(w.accrual, 1)).toBeCloseTo(166521, 0);
		expect(value(w.accrual, 2)).toBeCloseTo(682086, 0);
	});

	it('reproduces the published deferred tax on that accrual: 11,656 / 34,969 / 143,238', () => {
		const w = amounts();
		expect(value(w.accrualTax, 0)).toBeCloseTo(11656, 0);
		expect(value(w.accrualTax, 1)).toBeCloseTo(34969, 0);
		expect(value(w.accrualTax, 2)).toBeCloseTo(143238, 0);
	});

	it('reproduces the published amortisation and its tax: 19,827 / 4,164', () => {
		const w = amounts();
		expect(value(w.amortization, 0)).toBeCloseTo(19827, 0);
		expect(value(w.amortizationTax, 0)).toBeCloseTo(4164, 0);
	});

	it('reproduces the published liability balances: 3,862,213 / 3,973,227 / 4,655,313', () => {
		const w = amounts();
		expect(value(w.liabilityEoy, 0)).toBeCloseTo(-3862213, -1);
		expect(value(w.liabilityEoy, 1)).toBeCloseTo(-3973227, -1);
		expect(value(w.liabilityEoy, 2)).toBeCloseTo(-4655313, -1);
	});

	it('reproduces the published AOCI balances: 2,991,635 / 2,960,309 / 2,772,353', () => {
		const w = amounts();
		expect(value(w.aociEoy, 0)).toBeCloseTo(2991635, -1);
		expect(value(w.aociEoy, 1)).toBeCloseTo(2960309, -1);
		expect(value(w.aociEoy, 2)).toBeCloseTo(2772353, -1);
	});

	it('records the initial entries once, then N/A', () => {
		const w = amounts();
		expect(value(w.initialPriorServiceCost, 0)).toBeCloseTo(3806707, 0);
		expect(value(w.initialPriorServiceCost, 1)).toBeCloseTo(3806707, 0);
		expect(w.initialPriorServiceCost[2]).toBeNull();
		// 3,806,707 x 21% — the source's 799,408.
		expect(value(w.initialPriorServiceCostTax, 0)).toBeCloseTo(799408, 0);
		expect(w.initialPriorServiceCostTax[2]).toBeNull();
	});
});

describe('the reconciliation has to foot', () => {
	it('liability: opening, less prior service cost, less the accrual, equals closing', () => {
		const w = amounts();
		for (const period of [0, 1, 2]) {
			const psc =
				w.recordPriorServiceCostSigned[period] === null
					? 0
					: value(w.recordPriorServiceCostSigned, period);
			const rolled = value(w.liabilityBoy, period) + psc + value(w.accrualSigned, period);
			expect(rolled).toBeCloseTo(value(w.liabilityEoy, period), -1);
		}
	});

	it('AOCI: opening, plus prior service cost net of tax, less amortisation net of tax, equals closing', () => {
		const w = amounts();
		for (const period of [0, 1, 2]) {
			const psc =
				w.initialPriorServiceCost[period] === null ? 0 : value(w.initialPriorServiceCost, period);
			const pscTax =
				w.recordPriorServiceCostTaxSigned[period] === null
					? 0
					: value(w.recordPriorServiceCostTaxSigned, period);
			const rolled =
				value(w.aociBoy, period) +
				psc +
				pscTax +
				value(w.amortizationSigned, period) +
				value(w.amortizationTaxSigned, period);
			expect(rolled).toBeCloseTo(value(w.aociEoy, period), -1);
		}
	});

	it('net periodic pension cost is service + interest + amortisation', () => {
		const w = amounts();
		for (const period of [0, 1, 2]) {
			const sum =
				value(w.serviceCost, period) +
				value(w.interestCost, period) +
				value(w.amortization, period);
			expect(sum).toBeCloseTo(value(w.netPeriodicPensionCost, period), -1);
		}
	});
});

describe('the post-158 balance sheet', () => {
	it('shows no plan assets, so funded status is the obligation', () => {
		const w = amounts();
		for (const period of [0, 1, 2]) {
			expect(value(w.planAssets, period)).toBe(0);
			expect(value(w.fundedStatus, period)).toBe(value(w.projectedBenefitObligation, period));
			expect(value(w.expectedReturnOnAssets, period)).toBe(0);
			expect(value(w.netActuarialGainLoss, period)).toBe(0);
		}
	});

	it('carries the deferred tax asset at the tax rate on the obligation', () => {
		const w = amounts();
		for (const period of [0, 1, 2]) {
			const obligation = -value(w.projectedBenefitObligation, period);
			expect(value(w.deferredTaxAsset, period)).toBeCloseTo(obligation * TAX, -1);
		}
	});

	it('splits AOCI into its pre-tax balance, the tax benefit, and the net', () => {
		const w = amounts();
		for (const period of [0, 1, 2]) {
			const pre = value(w.aociBeforeTax, period);
			expect(value(w.netPriorServiceCost, period)).toBe(pre);
			expect(value(w.aociTaxBenefit, period)).toBeCloseTo(-pre * TAX, -1);
			expect(value(w.aociNetOfTax, period)).toBeCloseTo(pre * (1 - TAX), -1);
		}
	});
});

describe('serpWorksheetAmounts — edges', () => {
	it('is null when there is no SERP projection to report', () => {
		const empty: AccountingResult = {
			serp: [],
			coliByOption: {},
			byParticipant: [],
			status: 'partial',
			referenceYear: 2025,
			horizonPlanYears: 0
		};
		expect(serpWorksheetAmounts(empty, REF, TAX)).toBeNull();
	});

	it('draws the liability down by benefits paid', () => {
		const withBenefits = accounting();
		withBenefits.serp[0].grossBenefitPayments = '120000.00';
		const paid = serpWorksheetAmounts(withBenefits, REF, TAX)!;
		const none = amounts();
		// A credit balance, so paying benefits moves it toward zero.
		expect(value(paid.liabilityEoy, 0)).toBeGreaterThan(value(none.liabilityEoy, 0));
		expect(value(paid.benefitsPaid, 0)).toBeCloseTo(10000, 0); // 120,000 / 12
		expect(value(paid.benefitsPaidTax, 0)).toBeCloseTo(2100, 0);
	});
});

describe('coliWorksheetAmounts', () => {
	const csv = [new Big(700000), new Big(1500000)];
	const premium = [new Big(790803), new Big(790803)];
	const noDeaths = [new Big(0), new Big(0)];

	it('keeps the premium whole rather than prorating it', () => {
		// It is a cash event on the policy anniversary, which is why the source shows the same
		// premium in all three columns.
		const c = coliWorksheetAmounts(csv, premium, noDeaths, REF);
		expect(value(c.premium, 0)).toBeCloseTo(790803, 0);
		expect(value(c.premium, 1)).toBeCloseTo(790803, 0);
		expect(value(c.premium, 2)).toBeCloseTo(790803, 0);
	});

	it('shows early-duration earnings as a charge', () => {
		// Surrender value rises 700,000 on an 790,803 premium, so the policy lost 90,803 in year 1.
		const c = coliWorksheetAmounts(csv, premium, noDeaths, REF);
		expect(value(c.revenue, 0)).toBeCloseTo(-90803 / 12, 0);
	});

	it('balances: the surrender value movement equals premium plus earnings', () => {
		const c = coliWorksheetAmounts(csv, premium, noDeaths, REF);
		for (const period of [0, 1, 2]) {
			expect(value(c.csvChange, period)).toBeCloseTo(
				value(c.premium, period) + value(c.revenue, period),
				-1
			);
		}
	});

	it('is nil on the death block while every insured is alive', () => {
		const c = coliWorksheetAmounts(csv, premium, noDeaths, REF);
		expect(value(c.deathProceeds, 0)).toBe(0);
		expect(value(c.gainOnDeath, 0)).toBe(0);
	});
});
