/**
 * The § 417(e)(3) applicable mortality table — the unisex blend.
 *
 * This is the table the source report names as its accounting basis, and the one this model values
 * the pension obligation on. It is derived, not published per year in a form we can load: under
 * Rev. Rul. 2007-67 the applicable table for a calendar year is
 *
 * > a fixed blend of 50 percent of the static male combined mortality rates and 50 percent of the
 * > static female combined mortality rates used under § 1.430(h)(3)-1
 *
 * so it falls straight out of {@link irsCombinedStaticRate}, which `irs-static.ts` already builds
 * for either sex.
 *
 * ## Two details that turn out to matter
 *
 * **The blend is of the *rounded* rates, not the underlying ones.** Blending at full precision and
 * rounding once at the end reproduces only 83 of the IRS's 121 published 2024 figures; rounding
 * each sex's combined rate to five decimals first and averaging those reproduces all 121. Every
 * mismatch under the other order was in the same direction, which is what put us onto it.
 *
 * **The average has to be exact at the half.** Two five-decimal rates average to an exact half
 * whenever their last digits differ in parity, and that happens often — 8 of the 121 ages. In
 * binary floating point `0.000385 * 1e5` is `38.499999999999996`, so the obvious `Math.round`
 * silently rounds those down and quietly loses 8 rates. The arithmetic here works in integer units
 * of 1e-5 instead, where the half is exact and can be rounded up deliberately.
 *
 * ## Why unisex at all
 *
 * A SERP is an employer-sponsored retirement benefit, and *Arizona Governing Committee v. Norris*
 * (1983) held that offering sex-distinct retirement benefits under an employer's deferred
 * compensation plan violates Title VII. Valuing one on sex-distinct mortality is at least a
 * question for counsel. The IRS's own answer for minimum present value is this unisex table, and
 * the source report names it, so it is what the accounting layer reads. The sex-distinct tables
 * stay available in `irs-static.ts` for anything that genuinely needs them.
 */
import type { Gender } from '$lib/domain/insured';
import { irsCombinedStaticRate } from './irs-static';

/** Decimal places the IRS publishes mortality rates to, and therefore blends at. */
const PUBLISHED_DECIMALS = 5;
const UNITS = 10 ** PUBLISHED_DECIMALS;

/** A rate in integer units of 1e-5, which is how the published tables are actually defined. */
function toUnits(rate: number): number {
	return Math.round(rate * UNITS);
}

/**
 * The § 417(e) applicable mortality rate at `age` for `valuationYear`, or `null` where the
 * underlying static tables say nothing (an age outside 0-120, or a year before the 2012 base).
 *
 * Ages are truncated to whole years, as everywhere else in this module.
 */
export function irs417eRate(age: number, valuationYear: number): number | null {
	const male = irsCombinedStaticRate('M', age, valuationYear);
	const female = irsCombinedStaticRate('F', age, valuationYear);
	if (male === null || female === null) return null;

	// Blend the rounded rates, and round the half UP rather than to even — see the header.
	const sum = toUnits(male) + toUnits(female);
	const blended = Math.floor(sum / 2) + (sum % 2);
	return blended / UNITS;
}

/**
 * The same rate, read by a participant's gender — which is to say, not read by it at all.
 *
 * Deliberately ignores `gender`, and exists so a caller threading per-participant data does not
 * have to special-case the unisex basis or silently drop the argument. The parameter documents
 * that the choice is intentional rather than an oversight.
 */
export function irs417eRateUnisex(
	_gender: Gender,
	age: number,
	valuationYear: number
): number | null {
	return irs417eRate(age, valuationYear);
}
