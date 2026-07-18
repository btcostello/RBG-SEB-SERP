/**
 * Shared test fixtures.
 *
 * A single source of truth for a complete, valid {@link Insured} keeps the many test suites from
 * breaking every time a per-participant input is added. Timing defaults use clean arithmetic
 * (0% salary growth, 0-year waiting, 3-year FAS, retire 65, life 84) so numeric assertions stay
 * exact; override per test as needed.
 */
import type { Insured, InsuredDraft, ModelSettings } from '$lib/domain';

export function makeInsured(overrides: Partial<Insured> = {}): Insured {
	return {
		id: 'i1',
		firstName: 'Jane',
		lastName: 'Doe',
		gender: 'Female',
		smoker: 'Nonsmoker',
		planMembership: 'SERP',
		dateOfBirth: '1967-06-15',
		dateOfHire: '2005-01-01',
		retirementAge: 65,
		benefitWaitingPeriod: 0,
		minBenefitYears: 5,
		maxBenefitYears: 20,
		lifeExpectancy: 84,
		colaScale: 0,
		benefitAmount: '0',
		currentSalary: '100000',
		salaryGrowthRate: 0,
		fasAveragingPeriod: 3,
		benefitPercentage: 0.6,
		unitCredit: 0,
		serviceBasis: 'All Years',
		survivorTier1Pct: 1,
		survivorTier1Years: 1,
		survivorTier2Pct: 0.5,
		survivorTier2Years: 2,
		riskClass: 'Standard Non Tobacco',
		...overrides
	};
}

/** The same fixture without the store-assigned `id` — for census add/draft tests. */
export function makeInsuredDraft(overrides: Partial<InsuredDraft> = {}): InsuredDraft {
	const { id: _id, ...draft } = makeInsured(overrides as Partial<Insured>);
	return draft;
}

export function makeSettings(overrides: Partial<ModelSettings> = {}): ModelSettings {
	return { npvDiscountRate: 0, creditingRate: 0.0575, mortalityTable: 'RP-2012U', ...overrides };
}
