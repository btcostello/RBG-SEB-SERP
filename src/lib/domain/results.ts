/**
 * Results — the computed liability + asset-design snapshot carried on a Quote (supports
 * NFR11, FR16). It is `null` on a quote until a run computes it, then serialized with the
 * quote so a reopened quote reproduces identical results.
 *
 * Liability fields are produced by the pure engine (Epic 2); asset-design fields are
 * populated by the run orchestrator after the COLI illustrations return (Epic 3) and are
 * therefore optional. All monetary values are decimal strings (AR2).
 */
import * as v from 'valibot';
import { IsoDateSchema, MoneyStringSchema } from './value-objects';
import { IllustrationYearSchema } from './illustration';

/** One year of a benefit or illustration stream. */
export const StreamYearSchema = v.object({
	age: v.pipe(v.number(), v.integer()),
	amount: MoneyStringSchema
});
export type StreamYear = v.InferOutput<typeof StreamYearSchema>;

/** Per-participant computed result. */
export const ParticipantResultSchema = v.object({
	insuredId: v.pipe(v.string(), v.nonEmpty()),

	// --- Liability (SERP participants), produced by the engine (Epic 2) ---
	finalAverageSalary: MoneyStringSchema,
	annualBenefit: MoneyStringSchema,
	benefitStream: v.array(StreamYearSchema),
	totalBenefitCost: MoneyStringSchema,
	netPresentValue: MoneyStringSchema,

	// --- Asset design (COLI participants), populated after illustration (Epic 3) ---
	faceAmount: v.optional(MoneyStringSchema),
	firstYearPremium: v.optional(MoneyStringSchema),
	accountValue: v.optional(MoneyStringSchema),
	cashSurrenderValue: v.optional(MoneyStringSchema),
	deathBenefit: v.optional(MoneyStringSchema),
	gptAdjusted: v.optional(v.boolean()),
	mecAdjusted: v.optional(v.boolean()),
	/**
	 * False when the engine's solve could not reach its target. An infeasible solve still
	 * returns 200 with the engine's best effort, so this is the only signal that the designed
	 * premium does not actually hit the funding target.
	 */
	solveFeasible: v.optional(v.boolean()),
	/** Policy year the illustrated contract lapses, when it does. */
	lapseYear: v.optional(v.nullable(v.pipe(v.number(), v.integer()))),
	/**
	 * Full COLI illustration stream, one entry per policy year (premium, account value, cash
	 * surrender value, death benefit). Present for COLI participants; enables life-of-plan
	 * cash-flow and accounting derivations (e.g. total premiums) that single-point values cannot.
	 * Optional so pre-existing result snapshots still validate.
	 */
	illustrationYears: v.optional(v.array(IllustrationYearSchema))
});
export type ParticipantResult = v.InferOutput<typeof ParticipantResultSchema>;

/** Aggregate result across the census. */
export const AggregateResultSchema = v.object({
	totalBenefitCost: MoneyStringSchema,
	netPresentValue: MoneyStringSchema,
	totalDeathBenefit: v.optional(MoneyStringSchema),
	totalFirstYearPremium: v.optional(MoneyStringSchema)
});
export type AggregateResult = v.InferOutput<typeof AggregateResultSchema>;

export const ResultsSchema = v.object({
	perParticipant: v.array(ParticipantResultSchema),
	aggregate: AggregateResultSchema,
	/** Valuation date the run used (ISO YYYY-MM-DD). Optional for pre-existing snapshots. */
	asOf: v.optional(IsoDateSchema)
});
export type Results = v.InferOutput<typeof ResultsSchema>;
