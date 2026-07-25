/**
 * SERP pension accounting — the obligation and service-cost calc (ASC 715-30, simplified).
 *
 * Operator spec (2026-07-25), the "service cost approach by current calculations", per participant:
 *   1. PV of SERP benefits **at NRA** — discount the liability module's benefit stream back to the
 *      normal retirement age at the plan discount rate.
 *   2. Discount that to **today** — the projected benefit obligation (PBO) in today's dollars.
 *   3. Allocate the PBO to **past vs future service** by years:
 *        past  fraction = past service years  / total service years to NRA
 *        future fraction = future service years / total service years to NRA
 *
 * From that: **service cost** is the straight-line accrual of the PBO over total service
 * (`PBO ÷ total service years`); the **prior service cost** is the past-service share of the PBO,
 * recognised at inception and amortised straight-line over the *average* future service across
 * SERP participants (see {@link serpPensionForCensus}).
 *
 * Pure and deterministic — money is big.js, full precision, no rounding until an output boundary.
 * Mortality is death-at-life-expectancy today (the benefit stream already ends at LE); a mortality
 * table for survival-weighting is a later addition and is deliberately not required here.
 */
import { Big } from '$lib/money/money';

/** One payment of the benefit stream — attained age and amount (decimal-string money). */
export interface BenefitStreamYear {
	age: number;
	amount: string;
}

/**
 * Present value of a benefit stream discounted to the **normal retirement age** (step 1).
 * Each payment at attained `age` is discounted by `(1 + rate)^(age − nra)`. A payment at NRA is
 * undiscounted; the waiting period (payments after NRA) discounts them back accordingly.
 */
export function pvBenefitsAtNRA(
	stream: BenefitStreamYear[],
	discountRate: number,
	nra: number
): Big {
	const onePlusRate = new Big(1).plus(discountRate);
	return stream.reduce(
		(acc, year) => acc.plus(new Big(year.amount).div(onePlusRate.pow(year.age - nra))),
		new Big(0)
	);
}

/** Discount a value at NRA back to the valuation date (step 2): `value / (1 + rate)^(nra − age)`. */
export function discountToToday(
	valueAtNra: Big,
	discountRate: number,
	nra: number,
	currentAge: number
): Big {
	return valueAtNra.div(new Big(1).plus(discountRate).pow(nra - currentAge));
}

export interface ParticipantPensionParams {
	/** Benefit stream from the liability module (attained ages → amounts). */
	stream: BenefitStreamYear[];
	/** Plan accounting discount rate (the same NPV discount rate the liability uses). */
	discountRate: number;
	/** Normal retirement age. */
	nra: number;
	/** Current (valuation) age, nearest birthday. */
	currentAge: number;
	/** Completed years of service to the valuation date. */
	pastServiceYears: number;
}

/** Per-participant pension obligation and its past/future split (steps 1–3 + the accruals). */
export interface ParticipantPension {
	/** PV of the benefit stream at NRA (step 1). */
	pvAtNRA: Big;
	/** Projected benefit obligation in today's dollars (step 2). */
	pboToday: Big;
	pastServiceYears: number;
	/** Years of service remaining to NRA (never negative). */
	futureServiceYears: number;
	/** Past + future — total service to NRA. */
	totalServiceYears: number;
	/** PBO × past/total — the accrued obligation, recognised at inception as prior service cost. */
	priorServiceCost: Big;
	/** PBO × future/total — the obligation still to be earned. */
	futureServiceObligation: Big;
	/** Straight-line annual accrual of the PBO over total service (`PBO ÷ total service years`). */
	annualServiceCost: Big;
}

/**
 * Per-participant pension obligation and accruals. Future service is `nra − currentAge` floored at
 * zero (a participant already at/past NRA earns no further service, so their PBO is entirely prior
 * service cost). If total service is zero the accruals are zero rather than a division by zero.
 */
export function serpPensionForParticipant(params: ParticipantPensionParams): ParticipantPension {
	const { stream, discountRate, nra, currentAge, pastServiceYears } = params;
	const futureServiceYears = Math.max(0, nra - currentAge);
	const totalServiceYears = pastServiceYears + futureServiceYears;

	const pvAtNRA = pvBenefitsAtNRA(stream, discountRate, nra);
	const pboToday = discountToToday(pvAtNRA, discountRate, nra, currentAge);

	if (totalServiceYears <= 0) {
		return {
			pvAtNRA,
			pboToday,
			pastServiceYears,
			futureServiceYears,
			totalServiceYears,
			priorServiceCost: new Big(0),
			futureServiceObligation: new Big(0),
			annualServiceCost: new Big(0)
		};
	}

	const pastFraction = new Big(pastServiceYears).div(totalServiceYears);
	const futureFraction = new Big(futureServiceYears).div(totalServiceYears);
	return {
		pvAtNRA,
		pboToday,
		pastServiceYears,
		futureServiceYears,
		totalServiceYears,
		priorServiceCost: pboToday.times(pastFraction),
		futureServiceObligation: pboToday.times(futureFraction),
		annualServiceCost: pboToday.div(totalServiceYears)
	};
}

/**
 * The straight-line prior-service-cost amortisation period: the **average** future service years
 * across the SERP participants (operator spec). Zero when there are no participants with future
 * service (all at/past NRA), which callers treat as "no amortisation period".
 */
export function averageFutureServiceYears(pensions: ParticipantPension[]): number {
	if (pensions.length === 0) return 0;
	const total = pensions.reduce((sum, p) => sum + p.futureServiceYears, 0);
	return total / pensions.length;
}

/** One SERP participant's inputs to the year-by-year roll-forward. */
export interface SerpParticipantInput {
	pension: ParticipantPension;
	/** Current (valuation) age — maps benefit ages to plan years (`age − currentAge`). */
	currentAge: number;
	/** The benefit stream (attained ages → amounts) — the benefits-paid term of the roll-forward. */
	benefitStream: BenefitStreamYear[];
}

/** One plan year of the consolidated SERP pension accounting (full precision `Big`). */
export interface SerpAccountingYearRaw {
	planYear: number;
	serviceCost: Big;
	interestCost: Big;
	priorServiceCostAmortization: Big;
	/** Service cost + interest cost + prior-service amortisation. */
	pensionExpense: Big;
	pboBoy: Big;
	pboEoy: Big;
	/** Prior service cost not yet amortised, end of year. */
	unrecognizedPriorServiceCostEoy: Big;
	/** Pension expense × tax rate — the tax benefit (report column [2]). */
	benefitTaxDeduction: Big;
	/** After-tax earnings impact = −pension expense + tax deduction, signed (report column [3]). */
	netSerpEarningsImpact: Big;
}

export interface SerpEarningsParams {
	participants: SerpParticipantInput[];
	/** Straight-line prior-service amortisation period (see {@link averageFutureServiceYears}). */
	avgFutureServiceYears: number;
	/** Accounting discount rate — drives interest cost on the PBO. */
	discountRate: number;
	/** Corporate tax rate — the tax deduction on pension expense. */
	taxRate: number;
	/** Number of plan years to project (life-of-program horizon). */
	horizonPlanYears: number;
}

/**
 * Year-by-year consolidated SERP pension accounting (operator spec, 2026-07-25).
 *
 * Each participant's PBO rolls forward from plan start:
 *   PBO(EOY) = PBO(BOY) + service cost + interest cost − benefits paid
 * opening PBO(BOY) = the accrued **prior service cost** (past-service share of the PBO); interest
 * cost = discount rate × PBO(BOY); benefits paid come from the benefit stream. **Service cost** is
 * the straight-line accrual recognised each year until the participant's NRA; **prior-service
 * amortisation** is the level `priorServiceCost / avgFutureServiceYears`, capped at the remaining
 * unamortised balance so a fractional period ends cleanly. Pension expense = service cost +
 * interest cost + amortisation. Values are summed across SERP participants per plan year.
 *
 * Mortality is death-at-LE: the benefit stream already ends at each participant's life expectancy,
 * so no survival weighting is applied (a mortality table is a later refinement).
 */
export function serpEarningsByYear(params: SerpEarningsParams): SerpAccountingYearRaw[] {
	const { participants, avgFutureServiceYears, discountRate, taxRate, horizonPlanYears } = params;
	const zero = new Big(0);

	// Consolidated per-year accumulators.
	const rows: SerpAccountingYearRaw[] = Array.from({ length: horizonPlanYears }, (_, i) => ({
		planYear: i + 1,
		serviceCost: zero,
		interestCost: zero,
		priorServiceCostAmortization: zero,
		pensionExpense: zero,
		pboBoy: zero,
		pboEoy: zero,
		unrecognizedPriorServiceCostEoy: zero,
		benefitTaxDeduction: zero,
		netSerpEarningsImpact: zero
	}));

	for (const { pension, currentAge, benefitStream } of participants) {
		const benefitByPlanYear = new Map<number, Big>();
		for (const year of benefitStream) {
			benefitByPlanYear.set(year.age - currentAge, new Big(year.amount));
		}
		const levelAmort =
			avgFutureServiceYears > 0 ? pension.priorServiceCost.div(avgFutureServiceYears) : zero;

		let pboBoy = pension.priorServiceCost;
		let amortRemaining = pension.priorServiceCost;
		for (let planYear = 1; planYear <= horizonPlanYears; planYear++) {
			const serviceCost = planYear <= pension.futureServiceYears ? pension.annualServiceCost : zero;
			const interestCost = pboBoy.times(discountRate);
			const benefitsPaid = benefitByPlanYear.get(planYear) ?? zero;
			// Level amortisation, capped at the remaining unamortised balance (handles fractional periods).
			const amort = amortRemaining.gt(0)
				? levelAmort.gt(amortRemaining)
					? amortRemaining
					: levelAmort
				: zero;
			amortRemaining = amortRemaining.minus(amort);
			const pboEoy = pboBoy.plus(serviceCost).plus(interestCost).minus(benefitsPaid);
			const pensionExpense = serviceCost.plus(interestCost).plus(amort);
			const taxDeduction = pensionExpense.times(taxRate);

			const row = rows[planYear - 1];
			row.serviceCost = row.serviceCost.plus(serviceCost);
			row.interestCost = row.interestCost.plus(interestCost);
			row.priorServiceCostAmortization = row.priorServiceCostAmortization.plus(amort);
			row.pensionExpense = row.pensionExpense.plus(pensionExpense);
			row.pboBoy = row.pboBoy.plus(pboBoy);
			row.pboEoy = row.pboEoy.plus(pboEoy);
			row.unrecognizedPriorServiceCostEoy = row.unrecognizedPriorServiceCostEoy.plus(amortRemaining);
			row.benefitTaxDeduction = row.benefitTaxDeduction.plus(taxDeduction);
			// After-tax earnings impact: −pension expense + tax deduction (signed, an earnings charge).
			row.netSerpEarningsImpact = row.netSerpEarningsImpact
				.minus(pensionExpense)
				.plus(taxDeduction);

			pboBoy = pboEoy;
		}
	}
	return rows;
}
