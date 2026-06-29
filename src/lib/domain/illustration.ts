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

/** Solve specification: find the level premium that hits a target net surrender value. */
export const SolveSpecSchema = v.object({
	/** Target net surrender value (money). */
	value: MoneyStringSchema,
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
	faceAmount: MoneyStringSchema,
	// --- optional design params (all default on the engine side) ---
	productType: v.optional(v.picklist(['VUL', 'IUL'])),
	dbOption: v.optional(v.picklist(['A', 'B'])),
	annualPremium: v.optional(MoneyStringSchema),
	premiumMode: v.optional(v.picklist(['annual', 'semiannual', 'quarterly', 'monthly'])),
	creditedRate: v.optional(NonNegativeRateSchema),
	qualificationTest: v.optional(v.picklist(['GPT', 'CVAT'])),
	maturityAge: v.optional(v.pipe(v.number(), v.integer())),
	solve: v.optional(SolveSpecSchema)
});
export type DesignRequest = v.InferOutput<typeof DesignRequestSchema>;

/** One policy year of the illustration. Money is decimal strings (AR2). */
export const IllustrationYearSchema = v.object({
	policyYear: v.pipe(v.number(), v.integer()),
	age: v.pipe(v.number(), v.integer()),
	premium: MoneyStringSchema,
	accountValue: MoneyStringSchema,
	cashSurrenderValue: MoneyStringSchema,
	deathBenefit: MoneyStringSchema
});
export type IllustrationYear = v.InferOutput<typeof IllustrationYearSchema>;

/** 7702 guideline premiums echoed by the engine. */
export const GuidelinePremiumsSchema = v.object({
	singlePremium: MoneyStringSchema,
	levelPremiumA: MoneyStringSchema,
	levelPremiumB: MoneyStringSchema
});
export type GuidelinePremiums = v.InferOutput<typeof GuidelinePremiumsSchema>;

export const IllustrationResultSchema = v.object({
	years: v.array(IllustrationYearSchema),
	/** True if premiums were capped by the Guideline Premium Test (FR21). */
	gptAdjusted: v.boolean(),
	/** True if premiums were reduced by the 7702A 7-pay (MEC) limit (FR21). */
	mecAdjusted: v.boolean(),
	/** The resolved year-1 annual premium (reflects a solve, if one ran). */
	solvedAnnualPremium: MoneyStringSchema,
	guideline: GuidelinePremiumsSchema
});
export type IllustrationResult = v.InferOutput<typeof IllustrationResultSchema>;
