/**
 * Shared design basis for the premium-funded options (2, 3, 4).
 *
 * Option 1 sizes face from the SERP liability and solves the premium that fills it. Options 2–4
 * invert that: the premium is what the design needs, and the face is the **smallest face that
 * keeps the contract compliant** with 7702 / 7702A. Operator direction (2026-07-18): never buy
 * more death benefit than compliance requires, so face falls out of the premium rather than
 * being chosen.
 *
 * Two settled choices follow from that, shared by all three options:
 *
 * - **DBO B while funding, switching to A the year after the final premium** (operator, 2026-07-18).
 *   Option B is increasing, so it buys the most guideline room exactly when premium is going in
 *   — live, ~17% more than option A on a 10-pay (neutral on a 5-pay, where GSP binds and is
 *   option-independent). But B's death benefit rides the account value, so it also buys more
 *   cost of insurance, and holding it for life is what made a live $1M-face Option 2 *feasible
 *   under A and infeasible under B*. Dropping to A once premiums stop takes the room without
 *   paying for it across the whole distribution phase.
 *
 *   The switch is not free and is worth watching in results: B→A raises the face to the benefit
 *   in force so the death benefit does not jump, and any death-benefit change is a 7702
 *   adjustment event that recomputes the guideline premiums at the attained age.
 * - **`qualification_test: 'GPT'`.** CVAT looks more permissive but the engine reports its
 *   columns without enforcing them, so that headroom is an artifact. Revisit if that changes.
 *
 * ⚠ **`min_non_mec` does not prevent a GPT cap.** It sizes face against the 7-pay/MEC limit
 * only. Live, Option 3 at a min-non-MEC face came back `gpt_adjusted: true` with $143,765 of an
 * intended $336,980 admitted. If the intent is "never fail 7702 *or* 7702A", the face rule needs
 * to bind on the guideline limit too — see HANDOFF.md §5.
 */
import type { DboPeriod, DesignRequest, DistributionPeriod, Gender, RiskClass } from '$lib/domain';
import type { StreamYear } from '$lib/domain';

/** Face windows run to the last policy year the engine models. */
const LAST_POLICY_YEAR = 121;

/** Premium-payment period in policy years when the operator has not set one. Designs run 5–10. */
export const DEFAULT_PAY_YEARS = 10;

export interface PremiumFundedDesignParams {
	/** Issue age (computed from DOB at the valuation date by the caller). */
	issueAge: number;
	gender: Gender;
	riskClass: RiskClass;
	/**
	 * Seed face. `face_amount` is a required engine field and remains the compliance anchor, so
	 * a value is always sent even though `min_non_mec` supersedes it as the schedule.
	 */
	seedFaceAmount: string;
	productType?: DesignRequest['productType'];
	creditedRate?: number;
	/** Premium-payment period in policy years (default 10). */
	payYears?: number;
}

/**
 * Death benefit option windows: B while premiums are going in, A from the year after the final
 * premium. A pay period covering every modelled year leaves no room to switch, so B simply runs
 * on.
 */
export function dboSwitchAfterFunding(payYears: number): DboPeriod[] {
	const windows: DboPeriod[] = [{ startYear: 1, endYear: payYears, option: 'B' }];
	if (payYears < LAST_POLICY_YEAR) {
		windows.push({ startYear: payYears + 1, endYear: LAST_POLICY_YEAR, option: 'A' });
	}
	return windows;
}

/**
 * The request fields every premium-funded option shares. Callers add the distribution windows
 * and the solve that distinguishes their option.
 */
export function premiumFundedBase(params: PremiumFundedDesignParams): DesignRequest {
	const payYears = params.payYears ?? DEFAULT_PAY_YEARS;
	return {
		issueAge: params.issueAge,
		gender: params.gender,
		riskClass: params.riskClass,
		faceAmount: params.seedFaceAmount,
		...(params.productType !== undefined ? { productType: params.productType } : {}),
		...(params.creditedRate !== undefined ? { creditedRate: params.creditedRate } : {}),
		// Smallest compliant face; option B buys guideline room while funding, then drops to A.
		facePeriods: [{ startYear: 1, endYear: LAST_POLICY_YEAR, kind: 'min_non_mec' }],
		dbOption: 'B',
		dboPeriods: dboSwitchAfterFunding(payYears),
		qualificationTest: 'GPT',
		premiumPeriods: [{ startYear: 1, endYear: payYears, kind: 'solve' }]
	};
}

/**
 * Convert a participant's SERP benefit stream into distribution windows.
 *
 * The stream is keyed by attained age; the engine wants policy years. Year 1 ends at
 * `issueAge + 1`, so a benefit at attained age A falls in policy year `A - issueAge`.
 * Consecutive years carrying the same amount collapse into one window, which keeps a level
 * 20-year payout to a single period instead of twenty.
 */
export function benefitStreamToDistributionPeriods(
	stream: StreamYear[],
	issueAge: number
): DistributionPeriod[] {
	const periods: DistributionPeriod[] = [];
	for (const year of stream) {
		const policyYear = year.age - issueAge;
		// A benefit at or before the issue age cannot be drawn from a policy that does not exist.
		if (policyYear < 1 || policyYear > LAST_POLICY_YEAR) continue;

		const open = periods[periods.length - 1];
		if (open && open.amount === year.amount && open.endYear === policyYear - 1) {
			open.endYear = policyYear;
		} else {
			periods.push({
				startYear: policyYear,
				endYear: policyYear,
				kind: 'specify',
				amount: year.amount
			});
		}
	}
	return periods;
}

/**
 * Distributions are taken as withdrawals while cost basis remains and as loans after that —
 * the standard way to draw a policy without creating taxable income. Nothing in the engine
 * computes taxable income, so this choice carries the tax intent on its own.
 */
export const SERP_DISTRIBUTION_TYPE = 'withdraw_to_basis_then_loan' as const;
