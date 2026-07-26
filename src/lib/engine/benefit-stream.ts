/**
 * Annual benefit and benefit stream (FR13, FR14).
 *
 * Pure, deterministic, side-effect-free. `Big` comes from the money module so the rounding
 * policy is loaded; arithmetic keeps full precision (no rounding until an output boundary).
 */
import { Big } from '$lib/money/money';

/**
 * The component bases of a participant's level annual retirement benefit (FR13).
 *
 * The plan benefit is the **additive** sum of up to three bases (operator rule, HANDOFF §7):
 *   Fixed $ + (%FAS × FAS) + (UnitCredit × credited service × FAS)
 *
 * A plan typically uses one basis, so the others are zero — but they compose, and a participant
 * may carry more than one. This is the pre-COLA, pre-clamp level benefit; COLA escalation and the
 * min/max payout clamp are applied when the stream is generated, not here.
 */
export interface AnnualBenefitTerms {
	/** Final average salary, the base for the salary-linked terms. */
	finalAverageSalary: Big;
	/** Flat dollar benefit, independent of salary (`Insured.benefitAmount`). */
	fixedBenefit: Big;
	/** Fraction of FAS (`Insured.benefitPercentage`, e.g. 0.6 for 60% of FAS). */
	benefitPercentage: number;
	/** Per-year-of-service accrual as a fraction of FAS (`Insured.unitCredit`, e.g. 0.015). */
	unitCredit: number;
	/** Credited years of service the unit-credit term accrues over (basis per `Insured.serviceBasis`). */
	creditedServiceYears: number;
}

/**
 * Level annual retirement benefit as the additive sum of its component bases (FR13).
 *
 * `Fixed $ + benefitPercentage × FAS + unitCredit × creditedServiceYears × FAS`. Full precision;
 * no rounding until an output boundary (NFR5).
 */
export function composeAnnualBenefit(terms: AnnualBenefitTerms): Big {
	const percentComponent = terms.finalAverageSalary.times(terms.benefitPercentage);
	const unitCreditComponent = terms.finalAverageSalary
		.times(terms.unitCredit)
		.times(terms.creditedServiceYears);
	return terms.fixedBenefit.plus(percentComponent).plus(unitCreditComponent);
}

/** One year of the benefit payment stream. `amount` is a full-precision `Big`. */
export interface BenefitYear {
	age: number;
	amount: Big;
}

export interface BenefitStreamParams {
	/** The level annual benefit paid in the first payment year (from {@link composeAnnualBenefit}). */
	annualBenefit: Big;
	/** Age at which retirement begins. */
	retirementAge: number;
	/** Years after retirement before the first payment (0 = pay immediately at retirement). */
	benefitWaitingPeriod: number;
	/** Assumed age at death — sets the life-expectancy-based payout length (default 84). */
	assumedDeathBenefitAge: number;
	/**
	 * Annual cost-of-living escalation as a fraction (e.g. 0.02 = 2%). The first payment is the
	 * level benefit; each subsequent year compounds by `(1 + colaScale)`. Default 0 (level).
	 */
	colaScale?: number;
	/**
	 * Guaranteed minimum number of payments (a period-certain). Extends the stream past the assumed
	 * death age when the life-expectancy count is shorter. Default 0 (no floor). Only applies once
	 * benefits commence — it never manufactures a stream for a participant who never reaches
	 * retirement alive (first payment age already past the assumed death age).
	 */
	minBenefitYears?: number;
	/** Maximum number of payments — caps the stream. Default: no cap. */
	maxBenefitYears?: number;
}

/**
 * Generate the year-by-year benefit stream (FR14).
 *
 * The stream length is the life-expectancy-based count (first payment age through the assumed
 * death age, inclusive), **clamped to `[minBenefitYears, maxBenefitYears]`**: min is a
 * period-certain floor that pays past the assumed death age, max caps the payout. Each payment is
 * the level benefit escalated by COLA — level in year 1, compounding thereafter.
 *
 * If the first payment age is beyond the assumed death age, benefits never commence and the stream
 * is empty regardless of the minimum (a period-certain guarantees payments once they start, it
 * does not start them for someone assumed to die before retirement).
 */
export function benefitStream(params: BenefitStreamParams): BenefitYear[] {
	const {
		annualBenefit: benefit,
		retirementAge,
		benefitWaitingPeriod,
		assumedDeathBenefitAge,
		colaScale = 0,
		minBenefitYears,
		maxBenefitYears
	} = params;

	if (!Number.isInteger(benefitWaitingPeriod) || benefitWaitingPeriod < 0) {
		throw new Error(
			`benefitStream: benefitWaitingPeriod must be a non-negative integer, got ${benefitWaitingPeriod}`
		);
	}
	if (!Number.isInteger(retirementAge) || !Number.isInteger(assumedDeathBenefitAge)) {
		throw new Error('benefitStream: retirementAge and assumedDeathBenefitAge must be integers');
	}

	const firstPaymentAge = retirementAge + benefitWaitingPeriod;
	// Life-expectancy-based payout length. Zero means benefits never commence — no floor applies.
	const lifeExpectancyCount = Math.max(0, assumedDeathBenefitAge - firstPaymentAge + 1);
	if (lifeExpectancyCount === 0) return [];

	// Clamp to [min, max]: the min floor pays a period-certain past the assumed death age; the max
	// caps it. Applied only when benefits commence (guarded above).
	let count = lifeExpectancyCount;
	if (minBenefitYears !== undefined) count = Math.max(count, minBenefitYears);
	if (maxBenefitYears !== undefined) count = Math.min(count, maxBenefitYears);

	const onePlusCola = new Big(1).plus(colaScale);
	const stream: BenefitYear[] = [];
	for (let i = 0; i < count; i++) {
		// Level in year 1 (i = 0), compounding by COLA each subsequent year. pow(i) is exact.
		stream.push({ age: firstPaymentAge + i, amount: benefit.times(onePlusCola.pow(i)) });
	}
	return stream;
}
