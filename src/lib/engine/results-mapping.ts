/**
 * Map the engine's Big-based LiabilityResult to the domain `Results` snapshot (decimal
 * strings). This is an output boundary, so money is rounded to cents here via the centralized
 * half-up policy (NFR5) — the engine itself never rounds.
 *
 * Asset-design fields (faceAmount, premium, …) are populated later by the run orchestrator
 * (Epic 3); they are optional on the schema and omitted here.
 */
import { Big, formatMoney } from '$lib/money/money';
import type { AggregateDesign, ParticipantDesign, ParticipantResult, Results } from '$lib/domain';
import { DEFAULT_FUNDING_STRATEGY_ID } from '$lib/funding';
import type { LiabilityResult } from './compute-liability';
import type { DesignedPolicy } from '$lib/orchestrator/run';

export function toResults(liability: LiabilityResult): Results {
	return {
		perParticipant: liability.perParticipant.map(participantLiabilityToResult),
		aggregate: {
			totalBenefitCost: formatMoney(liability.aggregate.totalBenefitCost),
			netPresentValue: formatMoney(liability.aggregate.netPresentValue)
		}
	};
}

function participantLiabilityToResult(
	p: LiabilityResult['perParticipant'][number]
): ParticipantResult {
	return {
		insuredId: p.insuredId,
		finalAverageSalary: formatMoney(p.finalAverageSalary),
		annualBenefit: formatMoney(p.annualBenefit),
		benefitStream: p.benefitStream.map((year) => ({
			age: year.age,
			amount: formatMoney(year.amount)
		})),
		totalBenefitCost: formatMoney(p.totalBenefitCost),
		netPresentValue: formatMoney(p.netPresentValue)
	};
}

/** A participant with no SERP liability (COLI-only) still needs a result entry for its face. */
function zeroLiabilityResult(insuredId: string): ParticipantResult {
	return {
		insuredId,
		finalAverageSalary: '0.00',
		annualBenefit: '0.00',
		benefitStream: [],
		totalBenefitCost: '0.00',
		netPresentValue: '0.00'
	};
}

/** Map one designed policy to the per-option design record stored on the participant. */
function toParticipantDesign(policy: DesignedPolicy): ParticipantDesign {
	const firstYear = policy.illustration.years[0];
	return {
		faceAmount: formatMoney(policy.faceAmount),
		firstYearPremium: policy.illustration.solvedAnnualPremium,
		accountValue: firstYear?.accountValue,
		cashSurrenderValue: firstYear?.cashSurrenderValue,
		deathBenefit: firstYear?.deathBenefit,
		gptAdjusted: policy.illustration.gptAdjusted,
		mecAdjusted: policy.illustration.mecAdjusted,
		// An infeasible solve still returns 200 with a best-effort premium, so carry the flag
		// through rather than let a design that misses its target look like a clean result.
		...(policy.illustration.solve != null
			? { solveFeasible: policy.illustration.solve.feasible }
			: {}),
		...(policy.illustration.lapseYear !== undefined
			? { lapseYear: policy.illustration.lapseYear }
			: {}),
		// Persist the full illustration stream (already cent-rounded at the adapter boundary) so
		// life-of-plan cash-flow / accounting figures can be derived and survive serialization.
		illustrationYears: policy.illustration.years
	};
}

/**
 * Assemble the full domain `Results` snapshot from a completed run: SERP liability merged with
 * the COLI asset designs. A run may design several funding options per participant, so designs
 * are keyed by strategy id under `designs` / `aggregate.byOption`.
 *
 * The flat participant fields and aggregate totals mirror `primaryStrategyId`, keeping existing
 * report and UI bindings working while they migrate to the option-aware shape.
 *
 * Money is rounded to cents at this output boundary (NFR5).
 */
export function assembleResults(input: {
	liability: LiabilityResult;
	/** Total death benefit for the primary (benefit-sized) option. */
	totalDeathBenefit: Big;
	designed: DesignedPolicy[];
	/** Which option's numbers mirror into the flat fields. Defaults to Cost Recovery. */
	primaryStrategyId?: string;
	/** Valuation date the run used (ISO YYYY-MM-DD); stamped on the snapshot for the report. */
	asOf?: string;
}): Results {
	const primaryStrategyId = input.primaryStrategyId ?? DEFAULT_FUNDING_STRATEGY_ID;

	const byId = new Map<string, ParticipantResult>();
	for (const p of input.liability.perParticipant) {
		byId.set(p.insuredId, participantLiabilityToResult(p));
	}

	const byOption: Record<string, AggregateDesign> = {};

	for (const policy of input.designed) {
		const entry = byId.get(policy.insuredId) ?? zeroLiabilityResult(policy.insuredId);
		const design = toParticipantDesign(policy);
		entry.designs = { ...entry.designs, [policy.strategyId]: design };

		if (policy.strategyId === primaryStrategyId) {
			entry.faceAmount = design.faceAmount;
			entry.firstYearPremium = design.firstYearPremium;
			entry.accountValue = design.accountValue;
			entry.cashSurrenderValue = design.cashSurrenderValue;
			entry.deathBenefit = design.deathBenefit;
			entry.gptAdjusted = design.gptAdjusted;
			entry.mecAdjusted = design.mecAdjusted;
			if (design.solveFeasible !== undefined) entry.solveFeasible = design.solveFeasible;
			if (design.lapseYear !== undefined) entry.lapseYear = design.lapseYear;
			entry.illustrationYears = design.illustrationYears;
		}
		byId.set(policy.insuredId, entry);

		const running = byOption[policy.strategyId];
		byOption[policy.strategyId] = {
			totalFaceAmount: formatMoney(
				new Big(running?.totalFaceAmount ?? '0').plus(new Big(design.faceAmount))
			),
			totalFirstYearPremium: formatMoney(
				new Big(running?.totalFirstYearPremium ?? '0').plus(new Big(design.firstYearPremium))
			),
			policyCount: (running?.policyCount ?? 0) + 1
		};
	}

	// Only the benefit-sized option carries a pre-sized death benefit; the rest derive face from
	// the solved premium, so a total death benefit would be an output, not a design input.
	if (byOption[primaryStrategyId] !== undefined) {
		byOption[primaryStrategyId].totalDeathBenefit = formatMoney(input.totalDeathBenefit);
	}

	const primary = byOption[primaryStrategyId];
	return {
		perParticipant: [...byId.values()],
		aggregate: {
			totalBenefitCost: formatMoney(input.liability.aggregate.totalBenefitCost),
			netPresentValue: formatMoney(input.liability.aggregate.netPresentValue),
			...(Object.keys(byOption).length > 0 ? { byOption } : {}),
			totalDeathBenefit: formatMoney(input.totalDeathBenefit),
			totalFirstYearPremium: primary?.totalFirstYearPremium ?? formatMoney(new Big(0))
		},
		...(input.asOf !== undefined ? { asOf: input.asOf } : {})
	};
}
