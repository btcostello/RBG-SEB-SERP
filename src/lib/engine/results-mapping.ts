/**
 * Map the engine's Big-based LiabilityResult to the domain `Results` snapshot (decimal
 * strings). This is an output boundary, so money is rounded to cents here via the centralized
 * half-up policy (NFR5) — the engine itself never rounds.
 *
 * Asset-design fields (faceAmount, premium, …) are populated later by the run orchestrator
 * (Epic 3); they are optional on the schema and omitted here.
 */
import { formatMoney } from '$lib/money/money';
import type { Results } from '$lib/domain';
import type { LiabilityResult } from './compute-liability';

export function toResults(liability: LiabilityResult): Results {
	return {
		perParticipant: liability.perParticipant.map((p) => ({
			insuredId: p.insuredId,
			finalAverageSalary: formatMoney(p.finalAverageSalary),
			annualBenefit: formatMoney(p.annualBenefit),
			benefitStream: p.benefitStream.map((year) => ({
				age: year.age,
				amount: formatMoney(year.amount)
			})),
			totalBenefitCost: formatMoney(p.totalBenefitCost),
			netPresentValue: formatMoney(p.netPresentValue)
		})),
		aggregate: {
			totalBenefitCost: formatMoney(liability.aggregate.totalBenefitCost),
			netPresentValue: formatMoney(liability.aggregate.netPresentValue)
		}
	};
}
