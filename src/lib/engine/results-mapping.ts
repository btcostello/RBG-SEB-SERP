/**
 * Map the engine's Big-based LiabilityResult to the domain `Results` snapshot (decimal
 * strings). This is an output boundary, so money is rounded to cents here via the centralized
 * half-up policy (NFR5) — the engine itself never rounds.
 *
 * Asset-design fields (faceAmount, premium, …) are populated later by the run orchestrator
 * (Epic 3); they are optional on the schema and omitted here.
 */
import { Big, formatMoney } from '$lib/money/money';
import type { ParticipantResult, Results } from '$lib/domain';
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

/**
 * Assemble the full domain `Results` snapshot from a completed run: SERP liability merged with
 * the COLI asset design (per-person face, solved premium, year-1 account value / CSV / death
 * benefit, GPT/MEC flags) plus the aggregate total death benefit and total first-year premium.
 * Money is rounded to cents at this output boundary (NFR5).
 */
export function assembleResults(input: {
	liability: LiabilityResult;
	totalDeathBenefit: Big;
	designed: DesignedPolicy[];
}): Results {
	const byId = new Map<string, ParticipantResult>();
	for (const p of input.liability.perParticipant) {
		byId.set(p.insuredId, participantLiabilityToResult(p));
	}

	let totalFirstYearPremium = new Big(0);
	for (const policy of input.designed) {
		const entry = byId.get(policy.insuredId) ?? zeroLiabilityResult(policy.insuredId);
		const firstYear = policy.illustration.years[0];
		entry.faceAmount = formatMoney(policy.faceAmount);
		entry.firstYearPremium = policy.illustration.solvedAnnualPremium;
		entry.accountValue = firstYear?.accountValue;
		entry.cashSurrenderValue = firstYear?.cashSurrenderValue;
		entry.deathBenefit = firstYear?.deathBenefit;
		entry.gptAdjusted = policy.illustration.gptAdjusted;
		entry.mecAdjusted = policy.illustration.mecAdjusted;
		byId.set(policy.insuredId, entry);
		totalFirstYearPremium = totalFirstYearPremium.plus(
			new Big(policy.illustration.solvedAnnualPremium)
		);
	}

	return {
		perParticipant: [...byId.values()],
		aggregate: {
			totalBenefitCost: formatMoney(input.liability.aggregate.totalBenefitCost),
			netPresentValue: formatMoney(input.liability.aggregate.netPresentValue),
			totalDeathBenefit: formatMoney(input.totalDeathBenefit),
			totalFirstYearPremium: formatMoney(totalFirstYearPremium)
		}
	};
}
