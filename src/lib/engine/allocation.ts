/**
 * Per-person face allocation (FR18).
 *
 * Splits a total death benefit equally across the COLI participants. Pure big.js; division
 * uses Big.DP, so no premature rounding (rounding to cents happens at the output boundary).
 */
import { Big } from '$lib/money/money';

export interface FaceAllocation {
	insuredId: string;
	faceAmount: Big;
}

/** Equal-split allocation of `totalDeathBenefit` across `insuredIds`. */
export function allocateEqually(totalDeathBenefit: Big, insuredIds: string[]): FaceAllocation[] {
	if (insuredIds.length === 0) return [];
	const each = totalDeathBenefit.div(insuredIds.length);
	return insuredIds.map((insuredId) => ({ insuredId, faceAmount: each }));
}
