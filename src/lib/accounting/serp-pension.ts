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
