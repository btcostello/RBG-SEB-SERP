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
import { ageNearestBirthday, completedYearsBetween } from '$lib/dates/age';
import { isSerpParticipant, type Insured, type ModelSettings } from '$lib/domain';
import { projectSalary } from './salary-projection';
import { finalAverageSalary } from './final-average-salary';
import { composeAnnualBenefit, benefitStream, type BenefitYear } from './benefit-stream';
import { netPresentValue, totalBenefitCost } from './liability';

/**
 * Credited years of service the unit-credit benefit term accrues over, per the participant's
 * `serviceBasis`:
 *   - **All Years** — total service projected to retirement: service accrued to the valuation
 *     date plus the years remaining until retirement.
 *   - **Future Service** — only the service remaining from the valuation date to retirement.
 *
 * Mirrors the report's own `serviceYearsAtRetirement` derivation (service now + years to
 * retirement). Never negative — a participant already at/past retirement has no future service.
 */
export function creditedServiceYears(insured: Insured, asOf: string): number {
	const currentAge = ageNearestBirthday(insured.dateOfBirth, asOf);
	const yearsToRetirement = Math.max(0, insured.retirementAge - currentAge);
	if (insured.serviceBasis === 'Future Service') return yearsToRetirement;
	const serviceToDate = Math.max(0, completedYearsBetween(insured.dateOfHire, asOf));
	return serviceToDate + yearsToRetirement;
}

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
		// is the only remaining plan setting). The annual benefit is the ADDITIVE sum of its bases
		// — fixed $ + %FAS + unit-credit × service (operator rule, HANDOFF §7) — and the stream
		// applies COLA escalation and the min/max payout clamp. The survivor tiers are computed
		// separately as a pre-retirement stream (survivor-benefit.ts), not part of this retirement
		// liability.
		const salaryPath = projectSalary({
			currentSalary: new Big(insured.currentSalary),
			dateOfBirth: insured.dateOfBirth,
			asOf,
			retirementAge: insured.retirementAge,
			salaryGrowthRate: insured.salaryGrowthRate
		});

		const fas = finalAverageSalary(salaryPath, insured.fasAveragingPeriod);
		const benefit = composeAnnualBenefit({
			finalAverageSalary: fas,
			fixedBenefit: new Big(insured.benefitAmount),
			benefitPercentage: insured.benefitPercentage,
			unitCredit: insured.unitCredit,
			creditedServiceYears: creditedServiceYears(insured, asOf)
		});
		const stream = benefitStream({
			annualBenefit: benefit,
			retirementAge: insured.retirementAge,
			benefitWaitingPeriod: insured.benefitWaitingPeriod,
			assumedDeathBenefitAge: insured.lifeExpectancy,
			colaScale: insured.colaScale,
			minBenefitYears: insured.minBenefitYears,
			maxBenefitYears: insured.maxBenefitYears
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
