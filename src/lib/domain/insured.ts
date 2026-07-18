/**
 * Insured — one executive in the census (FR5–FR9), with the full post-MVP per-participant
 * input set (additional benefit formulas, COLA, min/max, survivor tiers).
 *
 * Per-individual data is modeled from day one: each insured carries their own benefit terms,
 * timing (retirement age, waiting period, life expectancy), salary assumptions, and the
 * component benefit bases. The MVP engine currently computes only the Factor × Final Average
 * Salary component (`benefitPercentage` × FAS); the remaining bases (fixed benefit, unit credit),
 * COLA, min/max clamping, and survivor tiers are captured here and calculated in a later phase.
 */
import * as v from 'valibot';
import {
	IsoDateSchema,
	MoneyStringSchema,
	NonNegativeRateSchema,
	AgeSchema,
	YearCountSchema
} from './value-objects';
import { RiskClassSchema } from './risk-class';

/**
 * Wire gender as the COLI illustration engine expects it: "M" or "F". This is the actuarial
 * boundary shape — the census-facing gender (below) maps to it via {@link toWireGender}.
 */
export const GENDERS = ['M', 'F'] as const;
export const GenderSchema = v.picklist(GENDERS, 'Select a gender');
export type Gender = v.InferOutput<typeof GenderSchema>;

/** Census-facing gender, including a unisex basis (FR5). Maps to the wire M/F at the adapter. */
export const CENSUS_GENDERS = ['Male', 'Female', 'Unisex'] as const;
export const CensusGenderSchema = v.picklist(CENSUS_GENDERS, 'Select a gender');
export type CensusGender = v.InferOutput<typeof CensusGenderSchema>;

/** Smoker status — the operator-facing underwriting input that derives the engine risk class. */
export const SMOKERS = ['Nonsmoker', 'Smoker'] as const;
export const SmokerSchema = v.picklist(SMOKERS, 'Select smoker status');
export type Smoker = v.InferOutput<typeof SmokerSchema>;

/** Basis for a unit-credit accrual: only future service, or all years of service. */
export const SERVICE_BASES = ['Future Service', 'All Years'] as const;
export const ServiceBasisSchema = v.picklist(SERVICE_BASES, 'Select a service basis');
export type ServiceBasis = v.InferOutput<typeof ServiceBasisSchema>;

/** Plan membership: an insured may be in COLI, SERP, or both (FR9). */
export const PLAN_MEMBERSHIPS = ['COLI', 'SERP', 'BOTH'] as const;
export const PlanMembershipSchema = v.picklist(PLAN_MEMBERSHIPS, 'Select plan membership');
export type PlanMembership = v.InferOutput<typeof PlanMembershipSchema>;

export const InsuredSchema = v.object({
	/** Stable identifier for census edit/remove operations (immutable-style updates, AR12). */
	id: v.pipe(v.string(), v.nonEmpty()),

	// --- Identity ---
	firstName: v.pipe(v.string(), v.nonEmpty('First name is required')),
	lastName: v.pipe(v.string(), v.nonEmpty('Last name is required')),
	gender: CensusGenderSchema,
	/** Smoker status; derives the engine risk class unless a risk-class override is set. */
	smoker: SmokerSchema,
	planMembership: PlanMembershipSchema,

	// --- Dates ---
	/** Date of birth, ISO YYYY-MM-DD. Drives age-nearest-birthday timing (AR3). */
	dateOfBirth: IsoDateSchema,
	/** Date of hire, ISO YYYY-MM-DD. */
	dateOfHire: IsoDateSchema,

	// --- Benefit terms (timing) ---
	/** Age at which benefits begin. */
	retirementAge: AgeSchema,
	/** Minimum years after retirement before the first benefit payment. */
	benefitWaitingPeriod: YearCountSchema,
	/** Minimum number of annual benefit payments. */
	minBenefitYears: YearCountSchema,
	/** Maximum number of annual benefit payments. */
	maxBenefitYears: YearCountSchema,
	/** Assumed age at death for the benefit stream (life expectancy, spec default 84). */
	lifeExpectancy: AgeSchema,
	/** Annual cost-of-living escalation applied to the benefit (fraction, e.g. 0.02 = 2%). */
	colaScale: NonNegativeRateSchema,

	// --- Fixed benefit ---
	/** Flat dollar benefit component, independent of salary (money). */
	benefitAmount: MoneyStringSchema,

	// --- Salary-based inputs (feed final average salary) ---
	/** Recognized annual salary as decimal-string money (AR2). */
	currentSalary: MoneyStringSchema,
	/** Annual salary growth rate (fraction, e.g. 0.03 = 3%). */
	salaryGrowthRate: NonNegativeRateSchema,
	/** Number of trailing years averaged into final average salary (FAS). */
	fasAveragingPeriod: v.pipe(YearCountSchema, v.minValue(1, 'Must average at least 1 year')),

	// --- Fixed-percentage benefit ---
	/** Retirement benefit as a fraction of final average salary (e.g. 0.6 = 60% of FAS) (FR7). */
	benefitPercentage: NonNegativeRateSchema,

	// --- Unit-credit benefit ---
	/** Per-year-of-service accrual as a fraction of FAS (e.g. 0.015 = 1.5% per year). */
	unitCredit: NonNegativeRateSchema,
	/** Whether the unit credit accrues on future service only or all years of service. */
	serviceBasis: ServiceBasisSchema,

	// --- Survivor benefit (two tiers) ---
	/** Survivor benefit as a fraction of the participant benefit during tier 1. */
	survivorTier1Pct: NonNegativeRateSchema,
	/** Number of years tier 1 applies. */
	survivorTier1Years: YearCountSchema,
	/** Survivor benefit as a fraction of the participant benefit during tier 2. */
	survivorTier2Pct: NonNegativeRateSchema,
	/** Number of years tier 2 applies. */
	survivorTier2Years: YearCountSchema,

	// --- Underwriting ---
	/**
	 * Engine risk class (a.k.a. `health`), constrained to the engine's accepted set (FR8, AR10).
	 * Normally derived from {@link Smoker}; an operator may override it directly (advanced).
	 */
	riskClass: RiskClassSchema
});

export type Insured = v.InferOutput<typeof InsuredSchema>;

/**
 * Draft insured — every field of Insured except the store-assigned `id`. Used by the census
 * editor so the operator never supplies an id; the store assigns it on add.
 */
export const InsuredDraftSchema = v.omit(InsuredSchema, ['id']);
export type InsuredDraft = v.InferOutput<typeof InsuredDraftSchema>;

/** Map a census gender to the engine wire gender. Unisex is illustrated on a male basis. */
export function toWireGender(gender: CensusGender): Gender {
	return gender === 'Female' ? 'F' : 'M';
}

/** The engine risk class a smoker status implies, absent an explicit override. */
export function riskClassForSmoker(smoker: Smoker): v.InferOutput<typeof RiskClassSchema> {
	return smoker === 'Smoker' ? 'Standard Tobacco' : 'Standard Non Tobacco';
}

/** Helper predicates for plan membership (a COLI participant gets an illustration). */
export function isColiParticipant(insured: Insured): boolean {
	return insured.planMembership === 'COLI' || insured.planMembership === 'BOTH';
}

export function isSerpParticipant(insured: Insured): boolean {
	return insured.planMembership === 'SERP' || insured.planMembership === 'BOTH';
}
