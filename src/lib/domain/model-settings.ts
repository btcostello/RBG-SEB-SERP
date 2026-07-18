/**
 * Model settings — the remaining plan-level parameters that drive the calculation (FR2, FR3).
 *
 * Most calculation assumptions are now per-participant (retirement age, waiting period, life
 * expectancy, salary growth, FAS averaging period — see {@link Insured}). What stays plan-level
 * are rates and tables that apply uniformly across the census: the NPV discount rate, the policy
 * crediting rate, and the mortality table. These are data changes, never code (NFR15).
 */
import * as v from 'valibot';
import { IsoDateSchema, RateSchema, YearCountSchema } from './value-objects';

/** Mortality tables the engine accepts. Seeded with the single supported table for now. */
export const MORTALITY_TABLES = ['RP-2012U'] as const;
export const MortalityTableSchema = v.picklist(MORTALITY_TABLES, 'Select a mortality table');
export type MortalityTable = v.InferOutput<typeof MortalityTableSchema>;

export const ModelSettingsSchema = v.object({
	/** NPV discount rate (default 0 = 0%, spec-documented). A data change, never code (NFR15). */
	npvDiscountRate: RateSchema,
	/** Assumed policy crediting rate (default 0.0575 = 5.75%). */
	creditingRate: RateSchema,
	/** Mortality table used for the projection. */
	mortalityTable: MortalityTableSchema,
	/** Plan effective date, ISO YYYY-MM-DD. Optional so pre-existing quotes still validate. */
	effectiveDate: v.optional(IsoDateSchema),
	/**
	 * Number of years out-of-pocket COLI premiums are paid (the premium-payment period). Used to
	 * bound life-of-plan premium totals. NOTE: the illustration API has no field for this yet, so
	 * it is applied in our derivations only; send it to the engine once the API supports it, so
	 * the returned stream itself stops premiums after this many years. Optional (defaults to 10).
	 */
	premiumYears: v.optional(YearCountSchema)
});

export type ModelSettings = v.InferOutput<typeof ModelSettingsSchema>;

/** Documented default model settings (FR3): npvDiscountRate 0%, creditingRate 5.75%, RP-2012U. */
export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
	npvDiscountRate: 0,
	creditingRate: 0.0575,
	mortalityTable: 'RP-2012U',
	premiumYears: 10
};
