/**
 * Model settings — the plan-level parameters that drive the calculation (FR2, FR3).
 *
 * Documented defaults are pre-populated when a quote is created and may be overridden per
 * quote without affecting other quotes. Only three defaults are mandated by the spec
 * (salary growth 3%, NPV discount 0%, assumed death age 84); the remaining defaults are
 * sensible MVP starting points and are clearly labeled below.
 */
import * as v from 'valibot';
import { AgeSchema, NonNegativeRateSchema, RateSchema, YearCountSchema } from './value-objects';

export const ModelSettingsSchema = v.object({
	/** Age at which benefits begin. */
	retirementAge: AgeSchema,
	/** Assumed age at death for the benefit stream (default 84, spec-documented). */
	assumedDeathBenefitAge: AgeSchema,
	/** Years after retirement before the first benefit payment. */
	benefitWaitingPeriod: YearCountSchema,
	/** Annual salary growth rate (default 0.03 = 3%, spec-documented). */
	salaryGrowthRate: NonNegativeRateSchema,
	/** NPV discount rate (default 0 = 0%, spec-documented). A data change, never code (NFR15). */
	npvDiscountRate: RateSchema,
	/** Number of trailing years averaged into final average salary (FAS). */
	fasAveragingPeriod: v.pipe(YearCountSchema, v.minValue(1, 'Must average at least 1 year'))
});

export type ModelSettings = v.InferOutput<typeof ModelSettingsSchema>;

/**
 * Documented default model settings (FR3). Spec-mandated: salaryGrowthRate 3%,
 * npvDiscountRate 0%, assumedDeathBenefitAge 84. Others are reasonable MVP defaults.
 */
export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
	retirementAge: 65,
	assumedDeathBenefitAge: 84,
	benefitWaitingPeriod: 0,
	salaryGrowthRate: 0.03,
	npvDiscountRate: 0,
	fasAveragingPeriod: 3
};
