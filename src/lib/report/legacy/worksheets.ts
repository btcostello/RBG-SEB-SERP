/**
 * Amounts for the four accounting entry worksheets — report pages 6.1, 6.2, 6.3-1 and 6.4.
 *
 * Those sheets share a three-column period axis (the plan's first month, its first partial calendar
 * year, and its first full calendar year) that no other page uses. `accounting/periods.ts` does the
 * allocation; this module decides *which* quantity belongs in each entry and hands the pages
 * formatted strings.
 *
 * Kept out of `report-data.ts` because it is a self-contained chunk of GAAP presentation rather
 * than part of the general report model, and because every value here is checkable against the
 * source report's own worksheet.
 *
 * ## Signs
 *
 * Two conventions are in play, matching the source:
 *
 * - **6.1 and 6.4** print Debit and Credit in separate columns, so amounts are **magnitudes** and
 *   the page decides which column they land in.
 * - **6.2 and 6.3-1** print a single "Debit / (Credit)" column, so amounts are **signed**, with
 *   credits negative and rendered in parentheses.
 *
 * A `null` means the entry does not apply in that period — the source prints "N/A" — as distinct
 * from zero, which means it applies and is nil.
 */
import { Big, formatMoneyDisplay } from '$lib/money/money';
import {
	allocateToPeriods,
	balanceAtPeriodEnd,
	onceAtInception,
	type PeriodTriple
} from '$lib/accounting/periods';
import type { AccountingResult, SerpAccountingYear } from '$lib/accounting';

/** One quantity across the three periods, formatted for display. `null` renders as "N/A". */
export type PeriodValues = [string | null, string | null, string | null];

/** Every amount the four worksheets need. */
export interface WorksheetAmounts {
	// --- 6.1 journal entries (magnitudes) ---
	/** Prior service cost recognised at inception, before tax. */
	initialPriorServiceCost: PeriodValues;
	/** Its deferred tax benefit. */
	initialPriorServiceCostTax: PeriodValues;
	/** Service cost + interest cost for the period. */
	accrual: PeriodValues;
	/** Deferred tax benefit on that accrual. */
	accrualTax: PeriodValues;
	/** Amortisation of prior service cost out of AOCI. */
	amortization: PeriodValues;
	/** Tax benefit on that amortisation. */
	amortizationTax: PeriodValues;
	/** Benefits actually paid to participants. */
	benefitsPaid: PeriodValues;
	/** Deferred tax asset released as those benefits become deductible. */
	benefitsPaidTax: PeriodValues;

	// --- 6.2 reconciliation (signed) ---
	liabilityBoy: PeriodValues;
	liabilityEoy: PeriodValues;
	aociBoy: PeriodValues;
	aociEoy: PeriodValues;
	/** The movement rows, signed for the reconciliation's single column. */
	recordPriorServiceCostSigned: PeriodValues;
	recordPriorServiceCostTaxSigned: PeriodValues;
	accrualSigned: PeriodValues;
	amortizationSigned: PeriodValues;
	amortizationTaxSigned: PeriodValues;

	// --- 6.3-1 notes (signed) ---
	projectedBenefitObligation: PeriodValues;
	planAssets: PeriodValues;
	fundedStatus: PeriodValues;
	netPriorServiceCost: PeriodValues;
	netActuarialGainLoss: PeriodValues;
	aociBeforeTax: PeriodValues;
	aociTaxBenefit: PeriodValues;
	aociNetOfTax: PeriodValues;
	deferredTaxAsset: PeriodValues;
	serviceCost: PeriodValues;
	interestCost: PeriodValues;
	expectedReturnOnAssets: PeriodValues;
	netPeriodicPensionCost: PeriodValues;
}

/** The COLI entry amounts for one funding option (6.4), as magnitudes. */
export interface ColiWorksheetAmounts {
	/** Change in cash surrender value — the balancing debit. */
	csvChange: PeriodValues;
	/** Policy earnings credited to income. Negative in early durations, where charges exceed growth. */
	revenue: PeriodValues;
	/** Premium paid. Recorded in full when paid rather than spread — it is a cash event. */
	premium: PeriodValues;
	/** Death proceeds received. */
	deathProceeds: PeriodValues;
	/** Cash surrender value released on death. */
	csvReleasedOnDeath: PeriodValues;
	/** Gain on receipt of death benefit — proceeds less the released surrender value. */
	gainOnDeath: PeriodValues;
}

const ZERO = new Big(0);
const num = (value: string | null | undefined): Big => new Big(value ?? '0');

/** Whole dollars, with credits in parentheses — the report's convention throughout. */
function display(value: Big): string {
	return value.lt(0) ? `(${formatMoneyDisplay(value.abs(), 0)})` : formatMoneyDisplay(value, 0);
}

function format(triple: readonly (Big | null)[]): PeriodValues {
	return triple.map((v) => (v === null ? null : display(v))) as PeriodValues;
}

function negate(triple: readonly (Big | null)[]): (Big | null)[] {
	return triple.map((v) => (v === null ? null : v.times(-1)));
}

/** Pull one column out of the per-plan-year SERP projection. */
function series(
	serp: readonly SerpAccountingYear[],
	pick: (y: SerpAccountingYear) => string | null
) {
	return serp.map((year) => num(pick(year)));
}

/**
 * Build every amount the SERP worksheets need.
 *
 * `taxRate` is the company's corporate rate; the source applies a single effective rate to all of
 * the deferred tax entries and notes that a company should substitute its own.
 */
export function serpWorksheetAmounts(
	accounting: AccountingResult,
	refDate: string,
	taxRate: number
): WorksheetAmounts | null {
	const serp = accounting.serp;
	if (serp.length === 0) return null;

	const serviceByYear = series(serp, (y) => y.serviceCost);
	const interestByYear = series(serp, (y) => y.interestCost);
	const amortByYear = series(serp, (y) => y.priorServiceCostAmortization);
	const benefitsByYear = series(serp, (y) => y.grossBenefitPayments);
	const accrualByYear = serviceByYear.map((s, i) => s.plus(interestByYear[i] ?? ZERO));

	// The obligation opens at the prior service cost — the past-service share recognised at
	// inception — and that same amount is the initial charge to AOCI.
	const initialPsc = num(serp[0].unrecognizedPriorServiceCostBoy);

	const service = allocateToPeriods(serviceByYear, refDate);
	const interest = allocateToPeriods(interestByYear, refDate);
	const amortization = allocateToPeriods(amortByYear, refDate);
	const benefits = allocateToPeriods(benefitsByYear, refDate);
	const accrual = allocateToPeriods(accrualByYear, refDate);

	const scaled = (triple: PeriodTriple, factor: number): PeriodTriple =>
		triple.map((v) => v.times(factor)) as PeriodTriple;

	// Balances. The liability accrues and is drawn down by benefits paid; AOCI is the prior service
	// cost less what has been amortised out of it.
	const liabilityFlow = accrualByYear.map((a, i) => a.minus(benefitsByYear[i] ?? ZERO));
	const liabilityEoy = balanceAtPeriodEnd(initialPsc, liabilityFlow, refDate);
	const aociPreTaxEoy = balanceAtPeriodEnd(
		initialPsc,
		amortByYear.map((a) => a.times(-1)),
		refDate
	);
	// AOCI carries its deferred tax benefit against it, so the balance shown is net of tax.
	const aociNetEoy = aociPreTaxEoy.map((v) => v.times(1 - taxRate)) as PeriodTriple;

	// Opening balances: the first month and the first calendar year both start at plan inception,
	// so both open at zero. Only the second calendar year opens on a real balance.
	const liabilityBoy: (Big | null)[] = [ZERO, ZERO, liabilityEoy[1]];
	const aociBoy: (Big | null)[] = [ZERO, ZERO, aociNetEoy[1]];

	const initialPscTriple = onceAtInception(initialPsc);
	const initialPscTaxTriple = onceAtInception(initialPsc.times(taxRate));

	return {
		initialPriorServiceCost: format(initialPscTriple),
		initialPriorServiceCostTax: format(initialPscTaxTriple),
		accrual: format(accrual),
		accrualTax: format(scaled(accrual, taxRate)),
		amortization: format(amortization),
		amortizationTax: format(scaled(amortization, taxRate)),
		benefitsPaid: format(benefits),
		benefitsPaidTax: format(scaled(benefits, taxRate)),

		liabilityBoy: format(negate(liabilityBoy)),
		liabilityEoy: format(negate(liabilityEoy)),
		aociBoy: format(aociBoy),
		aociEoy: format(aociNetEoy),
		recordPriorServiceCostSigned: format(negate(initialPscTriple)),
		recordPriorServiceCostTaxSigned: format(negate(initialPscTaxTriple)),
		accrualSigned: format(negate(accrual)),
		amortizationSigned: format(negate(amortization)),
		amortizationTaxSigned: format(scaled(amortization, taxRate)),

		// A nonqualified plan is unfunded, so the obligation IS the recognised liability and the
		// funded status is simply its negative. Plan assets and expected return are structurally nil.
		projectedBenefitObligation: format(negate(liabilityEoy)),
		planAssets: format([ZERO, ZERO, ZERO]),
		fundedStatus: format(negate(liabilityEoy)),
		netPriorServiceCost: format(aociPreTaxEoy),
		netActuarialGainLoss: format([ZERO, ZERO, ZERO]),
		aociBeforeTax: format(aociPreTaxEoy),
		aociTaxBenefit: format(negate(scaled(aociPreTaxEoy, taxRate))),
		aociNetOfTax: format(aociNetEoy),
		deferredTaxAsset: format(scaled(liabilityEoy, taxRate)),
		serviceCost: format(service),
		interestCost: format(interest),
		expectedReturnOnAssets: format([ZERO, ZERO, ZERO]),
		netPeriodicPensionCost: format(accrual.map((a, i) => a.plus(amortization[i])) as PeriodTriple)
	};
}

/**
 * COLI entry amounts for one funding option (6.4), under the ASC 325-30 cash surrender value
 * method.
 *
 * Two things differ from the SERP side. **Premium is not prorated** — it is paid in full on the
 * policy anniversary, so it lands whole in whichever period contains that anniversary, and the
 * source shows the same premium in all three columns for exactly that reason. **Earnings are**
 * prorated, and the change in cash surrender value is then the balancing figure, which is what
 * keeps the entry equal in every period.
 *
 * `csvByPlanYear` is the surrender value at the end of each plan year, summed across the option's
 * policies; `premiumByPlanYear` likewise. Both come from the persisted illustration streams.
 */
export function coliWorksheetAmounts(
	csvByPlanYear: readonly Big[],
	premiumByPlanYear: readonly Big[],
	deathProceedsByPlanYear: readonly Big[],
	refDate: string
): ColiWorksheetAmounts {
	// Earnings are the part of the surrender-value movement the premium did not put there. Negative
	// in early durations, where charges outrun credited growth.
	const revenueByYear = csvByPlanYear.map((csv, i) => {
		const opening = i === 0 ? ZERO : csvByPlanYear[i - 1];
		return csv.minus(opening).minus(premiumByPlanYear[i] ?? ZERO);
	});
	const revenue = allocateToPeriods(revenueByYear, refDate);

	// Premium is a cash event, recorded whole in the plan year it is paid. The first two periods sit
	// inside plan year 1; the second calendar year contains plan year 2's anniversary.
	const py1Premium = premiumByPlanYear[0] ?? ZERO;
	const py2Premium = premiumByPlanYear[1] ?? ZERO;
	const premium: PeriodTriple = [py1Premium, py1Premium, py2Premium];

	// The entry balances: what went in as premium, less what the policy lost or gained, is the
	// movement in surrender value.
	const csvChange = premium.map((p, i) => p.plus(revenue[i])) as PeriodTriple;

	const deathProceeds = allocateToPeriods(deathProceedsByPlanYear, refDate);

	return {
		csvChange: format(csvChange),
		revenue: format(revenue),
		premium: format(premium),
		deathProceeds: format(deathProceeds),
		// Death proceeds release the surrender value carried for that policy. Deaths are assumed at
		// life expectancy, decades out, so these are nil in the opening periods a proposal shows.
		csvReleasedOnDeath: format([ZERO, ZERO, ZERO]),
		gainOnDeath: format(deathProceeds)
	};
}
