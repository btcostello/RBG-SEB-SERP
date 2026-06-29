/**
 * Total benefit cost and net present value (FR15, NFR15).
 *
 * Pure and deterministic. `Big` from the money module; full precision, no rounding until an
 * output boundary. The discount rate is a parameter — changing it is a data change, never a
 * code change (NFR15).
 */
import { Big } from '$lib/money/money';
import type { BenefitYear } from './benefit-stream';

/** Undiscounted total of a single benefit stream (FR15). */
export function totalBenefitCost(stream: BenefitYear[]): Big {
	return stream.reduce((acc, year) => acc.plus(year.amount), new Big(0));
}

/**
 * Net present value of a benefit stream discounted to the valuation age (FR15).
 *
 * Each payment at `age` is discounted by `(1 + discountRate) ^ (age − fromAge)`, where
 * `fromAge` is the insured's current (valuation) age. At a 0% rate the NPV equals the
 * undiscounted total. The discount rate is a parameter (NFR15).
 *
 * @param stream       the benefit payment stream
 * @param discountRate the NPV discount rate (e.g. 0 for 0%, 0.05 for 5%)
 * @param fromAge      the valuation age payments are discounted back to (the current age)
 */
export function netPresentValue(stream: BenefitYear[], discountRate: number, fromAge: number): Big {
	const onePlusRate = new Big(1).plus(discountRate);
	return stream.reduce((acc, year) => {
		const yearsFromValuation = year.age - fromAge;
		// pow accepts negative/zero integer exponents; div uses Big.DP (no premature rounding).
		const presentValue = year.amount.div(onePlusRate.pow(yearsFromValuation));
		return acc.plus(presentValue);
	}, new Big(0));
}
