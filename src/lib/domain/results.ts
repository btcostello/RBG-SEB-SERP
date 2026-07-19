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

/**
 * One funding option's designed policy for one participant.
 *
 * Options 1–4 each produce a full design, so a participant carries several. For Option 1 the
 * face is an input (allocated from the SERP liability); for Options 2–4 it is an output of the
 * solve, read back off the illustration.
 */
export const ParticipantDesignSchema = v.object({
	faceAmount: MoneyStringSchema,
	firstYearPremium: MoneyStringSchema,
	accountValue: v.optional(MoneyStringSchema),
	cashSurrenderValue: v.optional(MoneyStringSchema),
	deathBenefit: v.optional(MoneyStringSchema),
	/** Premium was capped by the Guideline Premium Test — the design is not what was asked for. */
	gptAdjusted: v.optional(v.boolean()),
	/** Premium was cut by the 7-pay limit under `mec_handling: "avoid"`. */
	mecAdjusted: v.optional(v.boolean()),
	/** False when the solve could not reach its target. A 200 does not mean a usable design. */
	solveFeasible: v.optional(v.boolean()),
	/** Policy year the contract lapses. Expected for options solved to a nominal residue. */
	lapseYear: v.optional(v.nullable(v.pipe(v.number(), v.integer()))),
	/** Full per-policy-year stream; enables life-of-plan cash-flow derivations. */
	illustrationYears: v.optional(v.array(IllustrationYearSchema))
});
export type ParticipantDesign = v.InferOutput<typeof ParticipantDesignSchema>;

/** Per-participant computed result. */
export const ParticipantResultSchema = v.object({
	insuredId: v.pipe(v.string(), v.nonEmpty()),

	// --- Liability (SERP participants), produced by the engine (Epic 2) ---
	finalAverageSalary: MoneyStringSchema,
	annualBenefit: MoneyStringSchema,
	benefitStream: v.array(StreamYearSchema),
	totalBenefitCost: MoneyStringSchema,
	netPresentValue: MoneyStringSchema,

	/**
	 * Designed policy per funding option, keyed by strategy id (`cost-recovery`,
	 * `benefit-distribution`, `premium-deposit`, `premium-recovery`). This is the source of truth
	 * once a run designs more than one option; the flat fields below mirror the primary strategy.
	 */
	designs: v.optional(v.record(v.string(), ParticipantDesignSchema)),

	// --- Asset design (COLI participants), populated after illustration (Epic 3) ---
	// Mirror of the PRIMARY funding option, kept so existing report/UI bindings and previously
	// persisted quotes keep working. Prefer `designs` for anything option-aware.
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

/**
 * Census-wide totals for one funding option — what report page 4.3 compares across Options 1–4.
 * `policyCount` is carried so average face can be shown without recounting COLI participants.
 */
export const AggregateDesignSchema = v.object({
	totalFaceAmount: MoneyStringSchema,
	totalFirstYearPremium: MoneyStringSchema,
	policyCount: v.pipe(v.number(), v.integer()),
	/**
	 * Policies whose solve did not reach its target. An infeasible solve still returns 200 with a
	 * best-effort number, so the totals above include it — they are only meaningful at zero.
	 */
	infeasibleCount: v.optional(v.pipe(v.number(), v.integer())),
	/** Present for benefit-sized options (Option 1); absent when face falls out of the premium. */
	totalDeathBenefit: v.optional(MoneyStringSchema)
});
export type AggregateDesign = v.InferOutput<typeof AggregateDesignSchema>;

/** Aggregate result across the census. */
export const AggregateResultSchema = v.object({
	totalBenefitCost: MoneyStringSchema,
	netPresentValue: MoneyStringSchema,
	/** Per-funding-option totals, keyed by strategy id. */
	byOption: v.optional(v.record(v.string(), AggregateDesignSchema)),
	// Mirror of the primary funding option — see the note on ParticipantResult.
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
