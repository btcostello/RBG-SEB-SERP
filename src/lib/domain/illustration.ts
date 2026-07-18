/**
 * Illustration domain types (FR19, FR20, NFR12).
 *
 * `DesignRequest` is the camelCase, actuarial-only request the app builds for a COLI
 * illustration. By construction it carries NO name, date of birth, or identifier — only
 * underwriting/actuarial fields — so PII cannot structurally leak across the adapter boundary
 * (NFR12). The `snake_case` wire shape lives only in `src/lib/server/lifeproj/`.
 *
 * `IllustrationResult` is the camelCase result the adapter returns; money is decimal strings.
 */
import * as v from 'valibot';
import { AgeSchema, MoneyStringSchema, NonNegativeRateSchema } from './value-objects';
import { GenderSchema } from './insured';
import { RiskClassSchema } from './risk-class';

const PolicyYearSchema = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(121));

/**
 * A window of policy years carrying one behaviour. Premium and distribution windows zero out
 * any year they do not cover; face and DBO windows carry forward instead.
 *
 * `amount` applies to `kind: 'specify'` only and is ignored otherwise. A `0` amount is
 * meaningful — it is a premium holiday, not an absent window.
 */
function periodSchema<const K extends readonly [string, ...string[]]>(kinds: K) {
	return v.object({
		startYear: PolicyYearSchema,
		endYear: PolicyYearSchema,
		kind: v.picklist(kinds),
		amount: v.optional(MoneyStringSchema)
	});
}

/** `seven_pay` / `glp` / `gsp` are computed from the issue-age limit on the initial face. */
export const PremiumPeriodSchema = periodSchema(['specify', 'seven_pay', 'glp', 'gsp', 'solve']);
export type PremiumPeriod = v.InferOutput<typeof PremiumPeriodSchema>;

export const DistributionPeriodSchema = periodSchema(['specify', 'solve']);
export type DistributionPeriod = v.InferOutput<typeof DistributionPeriodSchema>;

/**
 * Face windows. `min_non_mec` is the smallest face at which the entered premium is never cut
 * by the 7-pay limit; `solve` returns the LARGEST face still meeting the solve target. Unlike
 * premium/distribution windows, face carries forward through a gap rather than dropping to 0.
 */
export const FacePeriodSchema = periodSchema(['specify', 'solve', 'min_non_mec']);
export type FacePeriod = v.InferOutput<typeof FacePeriodSchema>;

/**
 * Death benefit option by year. Unlike the other periods this carries an `option`, not a
 * `kind`/`amount`, and it carries forward through a gap.
 *
 * A switch is not free: B→A raises the face to the benefit in force so the death benefit does
 * not jump, and any death-benefit change is a 7702 adjustment event that recomputes the
 * guideline premiums at the attained age.
 */
export const DboPeriodSchema = v.object({
	startYear: PolicyYearSchema,
	endYear: PolicyYearSchema,
	option: v.picklist(['A', 'B'])
});
export type DboPeriod = v.InferOutput<typeof DboPeriodSchema>;

/**
 * Solve specification: ask the engine to solve one input against one measured target.
 *
 * A value solve needs BOTH this block AND at least one matching period with `kind: 'solve'`.
 * A solve block with no matching window comes back `feasible: false` / `no_solve_period`;
 * a solve window with no block simply contributes zero premium. Only one solve may be active.
 */
export const SolveSpecSchema = v.object({
	/** What is solved (default `premium`). */
	mode: v.optional(v.picklist(['premium', 'face', 'distribution', 'rollout'])),
	/** What is measured (default `net_account_value` — account value less loan balance). */
	metric: v.optional(v.picklist(['net_account_value', 'net_death_benefit'])),
	/**
	 * How the goal is derived (default `specify`). `endow` and `premium_recovery` are derived
	 * targets, recomputed each trial, so they move with the thing being solved.
	 */
	target: v.optional(v.picklist(['specify', 'endow', 'premium_recovery'])),
	/** The goal — required for `target: 'specify'`, ignored for the derived targets. */
	value: v.optional(MoneyStringSchema),
	/** Policy year or attained age at which the target applies. */
	when: v.pipe(v.number(), v.integer()),
	/** Whether `when` is a policy year or an attained age (default year). */
	basis: v.optional(v.picklist(['year', 'age']))
});
export type SolveSpec = v.InferOutput<typeof SolveSpecSchema>;

export const DesignRequestSchema = v.object({
	issueAge: AgeSchema,
	gender: GenderSchema,
	riskClass: RiskClassSchema,
	/** Initial face. Also the compliance basis and the anchor a face solve searches out from. */
	faceAmount: MoneyStringSchema,
	// --- optional design params (all default on the engine side) ---
	productType: v.optional(v.picklist(['VUL', 'IUL'])),
	/** Face by window. Replaces `faceAmount` as the schedule when set. */
	facePeriods: v.optional(v.array(FacePeriodSchema)),
	/** Starting death benefit option. Superseded by `dboPeriods` as the schedule when set. */
	dbOption: v.optional(v.picklist(['A', 'B'])),
	/** Death benefit option by window — e.g. B while funding, A once premiums stop. */
	dboPeriods: v.optional(v.array(DboPeriodSchema)),
	annualPremium: v.optional(MoneyStringSchema),
	/** Premium by window. Preferred over `annualPremium`, which the engine ignores when set. */
	premiumPeriods: v.optional(v.array(PremiumPeriodSchema)),
	premiumMode: v.optional(v.picklist(['annual', 'semiannual', 'quarterly', 'monthly'])),
	/** Policy distributions by window — how Options 2 and 4 pay each year's SERP benefit. */
	distributionPeriods: v.optional(v.array(DistributionPeriodSchema)),
	distributionType: v.optional(
		v.picklist([
			'withdrawal',
			'loan',
			'indexed_loan',
			'withdraw_to_basis_then_loan',
			'withdraw_to_basis_then_indexed_loan'
		])
	),
	creditedRate: v.optional(NonNegativeRateSchema),
	qualificationTest: v.optional(v.picklist(['GPT', 'CVAT'])),
	/**
	 * `avoid` (engine default) caps premium at the 7-pay limit so the contract never MECs;
	 * `allow` lets the premium in and reports the resulting MEC. 7702 is enforced either way.
	 */
	mecHandling: v.optional(v.picklist(['avoid', 'allow'])),
	maturityAge: v.optional(v.pipe(v.number(), v.integer())),
	solve: v.optional(SolveSpecSchema)
});
export type DesignRequest = v.InferOutput<typeof DesignRequestSchema>;

/**
 * One policy year of the illustration. Money is decimal strings (AR2).
 *
 * Fields added after the first persisted snapshots are optional on purpose, so quotes saved
 * against the earlier wire contract still validate when reopened.
 */
export const IllustrationYearSchema = v.object({
	policyYear: v.pipe(v.number(), v.integer()),
	age: v.pipe(v.number(), v.integer()),
	premium: MoneyStringSchema,
	accountValue: MoneyStringSchema,
	cashSurrenderValue: MoneyStringSchema,
	deathBenefit: MoneyStringSchema,
	/** Account value less any loan balance — what a `net_account_value` solve targets. */
	netAccountValue: v.optional(MoneyStringSchema),
	/** Withdrawal taken this year. Both this and `loan` can be non-zero under the hybrid types. */
	withdrawal: v.optional(MoneyStringSchema),
	loan: v.optional(MoneyStringSchema),
	loanBalance: v.optional(MoneyStringSchema),
	/** Engine-reported policy status for the year (e.g. in force / lapsed). */
	status: v.optional(v.string())
});
export type IllustrationYear = v.InferOutput<typeof IllustrationYearSchema>;

/** 7702 guideline premiums echoed by the engine. */
export const GuidelinePremiumsSchema = v.object({
	singlePremium: MoneyStringSchema,
	levelPremiumA: MoneyStringSchema,
	levelPremiumB: MoneyStringSchema
});
export type GuidelinePremiums = v.InferOutput<typeof GuidelinePremiumsSchema>;

/**
 * Outcome of the engine's solve. A solve that could not reach its target is NOT an error — it
 * returns its best effort with `feasible: false`, so this must be checked before a design is
 * presented as valid.
 */
export const SolveOutcomeSchema = v.object({
	feasible: v.boolean(),
	/** Why the solve failed, when the engine supplies one (e.g. `no_solve_period`). */
	reason: v.optional(v.string()),
	/** The resolved goal — the interesting field when the target was derived, not specified. */
	targetValue: v.optional(MoneyStringSchema),
	metric: v.optional(v.string()),
	targetKind: v.optional(v.string()),
	solvedPremium: v.optional(MoneyStringSchema),
	solvedFace: v.optional(MoneyStringSchema),
	solvedDistribution: v.optional(MoneyStringSchema)
});
export type SolveOutcome = v.InferOutput<typeof SolveOutcomeSchema>;

export const IllustrationResultSchema = v.object({
	years: v.array(IllustrationYearSchema),
	/** True if premiums were capped by the Guideline Premium Test (FR21). */
	gptAdjusted: v.boolean(),
	/** True if premiums were reduced by the 7702A 7-pay (MEC) limit (FR21). */
	mecAdjusted: v.boolean(),
	/** The resolved year-1 annual premium (reflects a solve, if one ran). */
	solvedAnnualPremium: MoneyStringSchema,
	guideline: GuidelinePremiumsSchema,
	/** Policy year the contract lapsed, or null/absent while it stays in force. */
	lapseYear: v.optional(v.nullable(v.pipe(v.number(), v.integer()))),
	/** Policy year the contract became a MEC, or null/absent when it never does. */
	mecYear: v.optional(v.nullable(v.pipe(v.number(), v.integer()))),
	/** Present only when a solve ran. */
	solve: v.optional(v.nullable(SolveOutcomeSchema))
});
export type IllustrationResult = v.InferOutput<typeof IllustrationResultSchema>;
