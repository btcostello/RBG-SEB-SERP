/**
 * Insured — one executive in the census (FR5–FR9).
 *
 * Per-individual data is modeled from day one: each insured carries their own benefit
 * percentage, risk class, and plan membership even though the MVP UI may default much of it.
 */
import * as v from 'valibot';
import { IsoDateSchema, MoneyStringSchema, NonNegativeRateSchema } from './value-objects';
import { RiskClassSchema } from './risk-class';

/** Gender as the engine expects it on the wire: "M" or "F". */
export const GENDERS = ['M', 'F'] as const;
export const GenderSchema = v.picklist(GENDERS, 'Select a gender');
export type Gender = v.InferOutput<typeof GenderSchema>;

/** Plan membership: an insured may be in COLI, SERP, or both (FR9). */
export const PLAN_MEMBERSHIPS = ['COLI', 'SERP', 'BOTH'] as const;
export const PlanMembershipSchema = v.picklist(PLAN_MEMBERSHIPS, 'Select plan membership');
export type PlanMembership = v.InferOutput<typeof PlanMembershipSchema>;

export const InsuredSchema = v.object({
	/** Stable identifier for census edit/remove operations (immutable-style updates, AR12). */
	id: v.pipe(v.string(), v.nonEmpty()),
	firstName: v.pipe(v.string(), v.nonEmpty('First name is required')),
	lastName: v.pipe(v.string(), v.nonEmpty('Last name is required')),
	gender: GenderSchema,
	/** Date of birth, ISO YYYY-MM-DD. Drives age-nearest-birthday timing (AR3). */
	dateOfBirth: IsoDateSchema,
	/** Date of hire, ISO YYYY-MM-DD. */
	dateOfHire: IsoDateSchema,
	/** Current annual salary as decimal-string money (AR2). */
	currentSalary: MoneyStringSchema,
	/** Retirement benefit as a fraction of final average salary (e.g. 0.6 = 60% of FAS) (FR7). */
	benefitPercentage: NonNegativeRateSchema,
	/** Underwriting risk class, constrained to the engine's accepted set (FR8, AR10). */
	riskClass: RiskClassSchema,
	planMembership: PlanMembershipSchema
});

export type Insured = v.InferOutput<typeof InsuredSchema>;

/**
 * Draft insured — every field of Insured except the store-assigned `id`. Used by the census
 * editor form so the operator never supplies an id; the store assigns it on add.
 */
export const InsuredDraftSchema = v.omit(InsuredSchema, ['id']);
export type InsuredDraft = v.InferOutput<typeof InsuredDraftSchema>;

/** Helper predicates for plan membership (a COLI participant gets an illustration). */
export function isColiParticipant(insured: Insured): boolean {
	return insured.planMembership === 'COLI' || insured.planMembership === 'BOTH';
}

export function isSerpParticipant(insured: Insured): boolean {
	return insured.planMembership === 'SERP' || insured.planMembership === 'BOTH';
}
