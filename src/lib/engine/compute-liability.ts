/**
 * compute-liability — the pure liability orchestrator (NFR5, FR16).
 *
 * Composes the engine pipeline for each SERP participant:
 *   salary projection → final average salary → annual benefit → benefit stream → total / NPV
 * then aggregates total cost and NPV across all SERP participants.
 *
 * Pure and deterministic: imports only other pure engine functions, the money module, the
 * date utility, and domain types — no Svelte, no I/O. There are no hardcoded actuarial
 * constants here; every figure traces to a model setting, a census input, or a named engine
 * formula (e.g. the assumed death age comes from `settings.assumedDeathBenefitAge`).
 */
import { Big } from '$lib/money/money';
import { ageNearestBirthday } from '$lib/dates/age';
import { isSerpParticipant, type Insured, type ModelSettings } from '$lib/domain';
import { projectSalary } from './salary-projection';
import { finalAverageSalary } from './final-average-salary';
import { annualBenefit, benefitStream, type BenefitYear } from './benefit-stream';
import { netPresentValue, totalBenefitCost } from './liability';

/** Per-participant liability figures (Big, full precision). */
export interface ParticipantLiability {
	insuredId: string;
	currentAge: number;
	finalAverageSalary: Big;
	annualBenefit: Big;
	benefitStream: BenefitYear[];
	totalBenefitCost: Big;
	netPresentValue: Big;
}

export interface LiabilityResult {
	/** One entry per SERP participant (COLI-only members have no SERP liability). */
	perParticipant: ParticipantLiability[];
	aggregate: {
		totalBenefitCost: Big;
		netPresentValue: Big;
	};
}

export interface ComputeLiabilityParams {
	census: Insured[];
	settings: ModelSettings;
	/** Valuation date, ISO YYYY-MM-DD — drives age-nearest-birthday timing and NPV discounting. */
	asOf: string;
}

/** Compute per-participant and aggregate SERP liability for a census. */
export function computeLiability(params: ComputeLiabilityParams): LiabilityResult {
	const { census, settings, asOf } = params;

	const perParticipant = census.filter(isSerpParticipant).map((insured): ParticipantLiability => {
		const currentAge = ageNearestBirthday(insured.dateOfBirth, asOf);

		// Timing and salary assumptions are per-participant now (the plan-level NPV discount rate
		// is the only remaining plan setting). The MVP calc still applies the Factor × FAS
		// component (`benefitPercentage`); the other component bases (fixed benefit, unit credit),
		// COLA, min/max clamping, and survivor tiers are captured on Insured but not yet applied.
		const salaryPath = projectSalary({
			currentSalary: new Big(insured.currentSalary),
			dateOfBirth: insured.dateOfBirth,
			asOf,
			retirementAge: insured.retirementAge,
			salaryGrowthRate: insured.salaryGrowthRate
		});

		const fas = finalAverageSalary(salaryPath, insured.fasAveragingPeriod);
		const benefit = annualBenefit(fas, insured.benefitPercentage);
		const stream = benefitStream({
			annualBenefit: benefit,
			retirementAge: insured.retirementAge,
			benefitWaitingPeriod: insured.benefitWaitingPeriod,
			assumedDeathBenefitAge: insured.lifeExpectancy
		});

		return {
			insuredId: insured.id,
			currentAge,
			finalAverageSalary: fas,
			annualBenefit: benefit,
			benefitStream: stream,
			totalBenefitCost: totalBenefitCost(stream),
			netPresentValue: netPresentValue(stream, settings.npvDiscountRate, currentAge)
		};
	});

	const aggregate = {
		totalBenefitCost: perParticipant.reduce((acc, p) => acc.plus(p.totalBenefitCost), new Big(0)),
		netPresentValue: perParticipant.reduce((acc, p) => acc.plus(p.netPresentValue), new Big(0))
	};

	return { perParticipant, aggregate };
}
