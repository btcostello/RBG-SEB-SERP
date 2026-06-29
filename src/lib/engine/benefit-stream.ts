/**
 * Annual benefit and benefit stream (FR13, FR14).
 *
 * Pure, deterministic, side-effect-free. `Big` comes from the money module so the rounding
 * policy is loaded; arithmetic keeps full precision (no rounding until an output boundary).
 */
import { Big } from '$lib/money/money';

/**
 * Annual retirement benefit = Factor × Final Average Salary (FR13).
 *
 * @param finalAverageSalary the insured's FAS as a `Big`
 * @param benefitPercentage  the plan factor as a fraction (e.g. 0.6 for 60% of FAS)
 */
export function annualBenefit(finalAverageSalary: Big, benefitPercentage: number): Big {
	return finalAverageSalary.times(benefitPercentage);
}

/** One year of the benefit payment stream. `amount` is a full-precision `Big`. */
export interface BenefitYear {
	age: number;
	amount: Big;
}

export interface BenefitStreamParams {
	/** The level annual benefit paid each year (from {@link annualBenefit}). */
	annualBenefit: Big;
	/** Age at which retirement begins. */
	retirementAge: number;
	/** Years after retirement before the first payment (0 = pay immediately at retirement). */
	benefitWaitingPeriod: number;
	/** Assumed age at death — the final payment year (default 84). */
	assumedDeathBenefitAge: number;
}

/**
 * Generate the year-by-year benefit stream (FR14).
 *
 * Payments run from the first payment age (retirementAge + benefitWaitingPeriod) through the
 * assumed death age, inclusive, one level payment of `annualBenefit` per year. If the first
 * payment age is beyond the assumed death age, the stream is empty.
 */
export function benefitStream(params: BenefitStreamParams): BenefitYear[] {
	const {
		annualBenefit: benefit,
		retirementAge,
		benefitWaitingPeriod,
		assumedDeathBenefitAge
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
	const stream: BenefitYear[] = [];
	for (let age = firstPaymentAge; age <= assumedDeathBenefitAge; age++) {
		stream.push({ age, amount: benefit });
	}
	return stream;
}
