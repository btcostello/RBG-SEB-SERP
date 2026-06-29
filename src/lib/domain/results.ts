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
import { MoneyStringSchema } from './value-objects';

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
	mecAdjusted: v.optional(v.boolean())
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
	aggregate: AggregateResultSchema
});
export type Results = v.InferOutput<typeof ResultsSchema>;
