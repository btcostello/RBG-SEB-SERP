/**
 * Report view model (FR28–FR31).
 *
 * Pure derivation of everything the proposal pages display from the Quote aggregate — counts,
 * covered payroll, tax math, per-participant rows — plus the report's display formatters.
 * Pages receive one `ReportModel` and render it; no page re-derives business numbers.
 *
 * Money display here is whole dollars (presentation-grade proposal style); the underlying
 * decimal-string values keep full cents (AR2) and are rounded half-up only for display.
 */
import { Big, formatMoneyDisplay } from '$lib/money/money';
import { ageNearestBirthday, completedYearsBetween } from '$lib/dates/age';
import {
	isColiParticipant,
	isSerpParticipant,
	type Insured,
	type ParticipantResult,
	type Quote
} from '$lib/domain';

// ---------------------------------------------------------------------------
// Display formatters
// ---------------------------------------------------------------------------

const MONTHS_LONG = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

/** "$1,234,568" — whole-dollar currency for the proposal (half-up at the display boundary). */
export function wholeDollars(value: string | Big): string {
	return `$${formatMoneyDisplay(value, 0)}`;
}

/** "60%" (or "3.5%" when the rate needs decimals to be faithful). */
export function formatPercent(rate: number, maxDecimals: number = 2): string {
	const scaled = rate * 100;
	const rounded = Number(scaled.toFixed(maxDecimals));
	return `${rounded}%`;
}

/** ISO YYYY-MM-DD → "July 9, 2026". */
export function longDate(iso: string): string {
	const [year, month, day] = iso.split('-').map(Number);
	return `${MONTHS_LONG[month - 1]} ${day}, ${year}`;
}

/** ISO YYYY-MM-DD → "7/9/2026" (compact table form). */
export function shortDate(iso: string): string {
	const [year, month, day] = iso.split('-').map(Number);
	return `${month}/${day}/${year}`;
}

/** ISO YYYY-MM-DD → zero-padded "07/09/2026" (census/table form). Empty in → "". */
export function usDate(iso: string): string {
	if (!iso) return '';
	const [year, month, day] = iso.split('-');
	return `${month}/${day}/${year}`;
}

// ---------------------------------------------------------------------------
// View-model shapes
// ---------------------------------------------------------------------------

export interface CensusRow {
	name: string;
	gender: string;
	dateOfBirth: string;
	age: number;
	dateOfHire: string;
	serviceYears: number;
	/** Whole-dollar display salary. */
	salary: string;
	/** True when this participant is insured under COLI. */
	coliInsured: boolean;
	/** True when this participant accrues a SERP benefit. */
	serpParticipant: boolean;
}

export interface ProjectionRow {
	name: string;
	currentAge: number;
	retirementAge: number;
	/** Whole-dollar final average salary. */
	finalAverageSalary: string;
	/** e.g. "60%". */
	benefitPercent: string;
	/** Whole-dollar level annual benefit. */
	annualBenefit: string;
	/** Number of annual payments in the stream. */
	paymentYears: number;
	/** Whole-dollar total benefit cost over the stream. */
	totalBenefit: string;
	/** Whole-dollar NPV at the plan discount rate. */
	netPresentValue: string;
}

export interface PolicyRow {
	name: string;
	issueAge: number;
	gender: string;
	riskClass: string;
	faceAmount: string;
	annualPremium: string;
	accountValue: string;
	cashSurrenderValue: string;
	deathBenefit: string;
	gptAdjusted: boolean;
	mecAdjusted: boolean;
}

export interface SampleChip {
	name: string;
	age: number;
	retirementAge: number;
	finalAverageSalary: string;
	benefitPercent: string;
	annualBenefit: string;
}

/**
 * Plan-level assumptions the report displays. Timing/salary assumptions are per-participant now,
 * so these are representative values (from a SERP participant, else the first census member, else
 * documented defaults) plus the one genuinely plan-level rate, the NPV discount rate.
 */
export interface PlanAssumptionsDisplay {
	retirementAge: number;
	assumedDeathBenefitAge: number;
	benefitWaitingPeriod: number;
	fasAveragingPeriod: number;
	salaryGrowthRate: number;
	npvDiscountRate: number;
}

/**
 * Benefit-formula terms shown on the Benefit Formula page. These are per-participant inputs in
 * the model, but the page presents them plan-wide, so they are taken from a representative
 * participant (SERP participant → first census member → documented defaults). If participants
 * carry differing terms, this reflects only the representative.
 */
export interface BenefitFormulaDisplay {
	/** Maximum benefit payout period, in years (maxBenefitYears), or 'varies'. */
	payoutPeriodYears: number | 'varies';
	/** Guaranteed minimum payout period certain, in years (minBenefitYears), or 'varies'. */
	guaranteedMinYears: number | 'varies';
	/** True when any survivor-benefit term differs across SERP participants. */
	survivorVaries: boolean;
	/** Survivor tier 1/2 fraction of salary and duration (only meaningful when !survivorVaries). */
	survivorTier1Pct: number;
	survivorTier1Years: number;
	survivorTier2Pct: number;
	survivorTier2Years: number;
	/** Guaranteed survivor payout period certain = tier 1 + tier 2 years, or 'varies'. */
	survivorGuaranteedYears: number | 'varies';
}

/**
 * Plan-specification overview values (section 2.4). Preformatted strings; per-participant values
 * (NRA, ERA, salary scale) resolve to a single value when uniform across SERP participants, else
 * the literal "Varies". Plan-level rates never vary.
 */
export interface PlanSpecsDisplay {
	/** Plan effective date, long form (e.g. "April 2, 2026"), or null when not set. */
	effectiveDate: string | null;
	/** Long-term corporate marginal tax rate, e.g. "21.00%". */
	longTermTaxRate: string;
	/** Accounting liability interest discount rate (NPV discount rate), e.g. "5.75%". */
	accountingLiabilityDiscountRate: string;
	/** Assumed hypothetical COLI net rate of return (crediting rate), e.g. "6.59%". */
	coliNetRateOfReturn: string;
	/** Normal retirement age — a number as string, or "Varies". */
	nra: string;
	/** Early retirement age (NRA − 5) — a number as string, or "Varies". */
	era: string;
	/** Average annual salary growth (salary scale) — e.g. "3.0%", or "Varies". */
	salaryScale: string;
}

/** One row of the legacy SERP Plan Census (page 3.1), computed as of the plan effective date. */
export interface LegacyCensusRow {
	index: number;
	name: string;
	/** SERP participant for whom COLI is not purchased (gets the "*" mark). */
	serpNotColi: boolean;
	gender: string;
	smoker: string;
	/** Zero-padded MM/DD/YYYY. */
	dateOfBirth: string;
	/** Age nearest birthday as of the reference (plan effective) date. */
	age: number;
	dateOfHire: string;
	/** Completed years of service as of the reference date. */
	serviceYears: number;
	/** Recognized salary, grouped whole dollars, no symbol (e.g. "162,240"). */
	salary: string;
}

/**
 * One row of the legacy Plan Participant Summary – Projections (page 3.2). Calculable columns are
 * always present; results-derived columns (FAS, annual/total SERP benefit) are null until a run;
 * salary-at-retirement and initial survivor benefit are not yet computed (tracked as gaps).
 */
export interface LegacyProjectionRow {
	index: number;
	/** Abbreviated name, e.g. "D. Burke JR.". */
	name: string;
	age: number;
	serviceYears: number;
	ageAtRetirement: number;
	serviceYearsAtRetirement: number;
	/** "20.00 %" of FAS, or "Fixed Benefit" for a fixed-dollar participant. */
	percentFas: string;
	/** Grouped whole-dollar strings, or null when not yet available (gap / pre-run). */
	salaryAtRetirement: string | null;
	finalAvgSalary: string | null;
	initialSurvivorBenefit: string | null;
	annualSerpBenefit: string | null;
	totalSerpBenefit: string | null;
}

/**
 * Option 1 (Cost Recovery) life-of-plan cash-flow totals (page 4.5), derived from the persisted
 * illustration streams. Grouped whole-dollar strings; outflows/losses are parenthesized. Cost
 * recovery is a percentage. Options 2–4 still require additional illustrations (rendered "—").
 */
/** Life-of-plan cash-flow totals for one funding option (page 4.5 column). */
export interface CashFlowOptionDisplay {
	netBenefitsCompanyCashFlow: string;
	netBenefitsColiAssets: string;
	netBenefitsTotal: string;
	coliPremiums: string;
	coliDeathBenefits: string;
	coliLoansWithdrawals: string;
	netColiGainLoss: string;
	aggregateCashFlow: string;
	costRecovery: string;
}

/**
 * The four funding options in report order. Ids match the funding strategy registry, so a
 * design keyed under `ParticipantResult.designs` lines up with the column that displays it.
 */
export const REPORT_FUNDING_OPTIONS = [
	{ id: 'cost-recovery', number: 1, label: 'Cost Recovery' },
	{ id: 'benefit-distribution', number: 2, label: 'Benefit Funding' },
	{ id: 'premium-deposit', number: 3, label: 'Funding Wherewithal' },
	{ id: 'premium-recovery', number: 4, label: 'Bene Funding + Cost Recov' }
] as const;

/** Headline figures for one funding option (page 4.3). */
export interface FundingOptionSummary {
	/** Total first-year premium across the option's policies. Null when not reportable. */
	premium: string | null;
	/** Initial face ÷ policies designed for this option. Null when not reportable. */
	averageFace: string | null;
	/** Policies designed. Options can cover different numbers of lives — see HANDOFF backlog. */
	policyCount: number;
	/**
	 * Policies whose solve failed. **A design that missed its target still returns a number**, so
	 * these totals are not reportable at all when this is non-zero — the engine's best effort can
	 * be wildly out of range, and averaging it in would print a plausible-looking figure that is
	 * not a design anyone could buy.
	 */
	infeasibleCount: number;
}

export interface ReportModel {
	companyName: string;
	/** "July 9, 2026" — the run's valuation date (falls back to the render date). */
	runDate: string;
	/** Valuation date, ISO. */
	asOf: string;

	// --- Plan population ---
	numSerp: number;
	numColi: number;
	numCensus: number;
	/** Rounded average age (nearest birthday) across the census; null when census empty. */
	averageAge: number | null;
	/** Whole-dollar combined recognized salary of SERP participants. */
	coveredPayroll: string;
	/** Whole-dollar combined recognized salary of everyone in the census. */
	censusPayroll: string;

	// --- Plan design ---
	settings: PlanAssumptionsDisplay;
	benefitFormula: BenefitFormulaDisplay;
	planSpecs: PlanSpecsDisplay;
	/** "60%" or "40%–60%" across SERP participants. */
	benefitPercentDisplay: string;
	firstPaymentAge: number;
	/** Payments per participant from first payment age through assumed death age (inclusive). */
	payoutYears: number;
	/** "3%" salary growth etc., preformatted. */
	salaryGrowthDisplay: string;
	npvDiscountDisplay: string;
	taxRateDisplay: string;

	// --- Costs (from the computed Results snapshot) ---
	totalBenefitCost: string;
	/** Tax deduction = total benefit cost × corporate tax rate. */
	taxDeduction: string;
	/** After-tax cost = total benefit cost × (1 − corporate tax rate). */
	afterTaxCost: string;
	netPresentValue: string;
	/** Total COLI face amount (equals the tax-adjusted cost under Cost Recovery). */
	totalDeathBenefit: string | null;
	totalFirstYearPremium: string | null;
	/** True once a run has populated the computed results. */
	hasResults: boolean;
	/** Option 1 average face per COLI participant (total face ÷ COLI count), or null pre-run. */
	option1AvgFace: string | null;
	/** Option 1 cash-flow totals for the life of the plan (page 4.5), or null pre-run. */
	cashFlow: CashFlowOptionDisplay | null;
	/** Headline premium / average face per funding option, keyed by strategy id (page 4.3). */
	fundingOptions: Record<string, FundingOptionSummary>;
	/** Life-of-plan cash-flow totals per funding option, keyed by strategy id (page 4.5). */
	cashFlowByOption: Record<string, CashFlowOptionDisplay>;

	/** Reference date for the legacy census/projections (plan effective date, else valuation date). */
	legacyAsOfDisplay: string;
	/**
	 * The same reference date as an ISO YYYY-MM-DD — the plan effective date when set, else the
	 * valuation date. Legacy pages that need to compute from it (rather than print it) use this.
	 */
	legacyRefDate: string;
	legacyCensus: LegacyCensusRow[];
	legacyProjections: LegacyProjectionRow[];
	/** Grouped whole-dollar total recognized salary of SERP participants (legacy census total). */
	legacyCensusSalaryTotal: string;
	/** Grouped whole-dollar total of the annual/total SERP benefit column, or null pre-run. */
	legacySerpBenefitTotal: string | null;

	// --- Tables ---
	census: CensusRow[];
	projections: ProjectionRow[];
	policies: PolicyRow[];
	/** Up to three illustrative SERP participants (largest annual benefits). */
	samples: SampleChip[];
}

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

function fullName(insured: Insured): string {
	return `${insured.firstName} ${insured.lastName}`;
}

/**
 * Representative plan assumptions for display. Prefers a SERP participant (they drive the
 * liability), then any census member, then documented defaults for an empty census.
 */
function planAssumptions(census: Insured[], npvDiscountRate: number): PlanAssumptionsDisplay {
	const rep = census.find(isSerpParticipant) ?? census[0];
	return {
		retirementAge: rep?.retirementAge ?? 65,
		assumedDeathBenefitAge: rep?.lifeExpectancy ?? 84,
		benefitWaitingPeriod: rep?.benefitWaitingPeriod ?? 5,
		fasAveragingPeriod: rep?.fasAveragingPeriod ?? 5,
		salaryGrowthRate: rep?.salaryGrowthRate ?? 0.03,
		npvDiscountRate
	};
}

/** Percent with a fixed number of decimals (e.g. pctFixed(0.2075, 2) → "20.75%"). */
function pctFixed(rate: number, decimals: number): string {
	return `${(rate * 100).toFixed(decimals)}%`;
}

/**
 * For a per-participant value shown plan-wide: the common value across SERP participants, or the
 * sentinel 'varies' if they differ, or null if there are no SERP participants (caller defaults).
 */
function commonSerpValue(census: Insured[], select: (i: Insured) => number): number | 'varies' | null {
	const serp = census.filter(isSerpParticipant);
	if (serp.length === 0) return null;
	const first = select(serp[0]);
	return serp.every((p) => select(p) === first) ? first : 'varies';
}

/** Plan-specification display strings for the Plan Specs Overview page (section 2.4). */
function planSpecsFrom(quote: Quote): PlanSpecsDisplay {
	const { company, modelSettings, census } = quote;
	const nra = commonSerpValue(census, (i) => i.retirementAge);
	const growth = commonSerpValue(census, (i) => i.salaryGrowthRate);
	return {
		effectiveDate: modelSettings.effectiveDate ? longDate(modelSettings.effectiveDate) : null,
		longTermTaxRate: pctFixed(company.corporateTaxRate, 2),
		accountingLiabilityDiscountRate: pctFixed(modelSettings.npvDiscountRate, 2),
		coliNetRateOfReturn: pctFixed(modelSettings.creditingRate, 2),
		nra: nra === null ? '65' : nra === 'varies' ? 'Varies' : String(nra),
		era: nra === null ? '60' : nra === 'varies' ? 'Varies' : String(nra - 5),
		salaryScale: growth === null ? pctFixed(0.03, 1) : growth === 'varies' ? 'Varies' : pctFixed(growth, 1)
	};
}

/**
 * Benefit-formula terms for display. Per-participant values resolve to a single value when
 * uniform across SERP participants, else 'varies' (see {@link BenefitFormulaDisplay}). Empty
 * census falls back to the documented defaults.
 */
function benefitFormulaFrom(census: Insured[]): BenefitFormulaDisplay {
	const valueOr = (select: (i: Insured) => number, fallback: number): number | 'varies' => {
		const v = commonSerpValue(census, select);
		return v === null ? fallback : v;
	};
	const tier1Pct = valueOr((i) => i.survivorTier1Pct, 1);
	const tier1Years = valueOr((i) => i.survivorTier1Years, 1);
	const tier2Pct = valueOr((i) => i.survivorTier2Pct, 0.5);
	const tier2Years = valueOr((i) => i.survivorTier2Years, 2);
	const survivorVaries = [tier1Pct, tier1Years, tier2Pct, tier2Years].some((v) => v === 'varies');
	const yearsVary = tier1Years === 'varies' || tier2Years === 'varies';
	return {
		payoutPeriodYears: valueOr((i) => i.maxBenefitYears, 20),
		guaranteedMinYears: valueOr((i) => i.minBenefitYears, 5),
		survivorVaries,
		survivorTier1Pct: typeof tier1Pct === 'number' ? tier1Pct : 0,
		survivorTier1Years: typeof tier1Years === 'number' ? tier1Years : 0,
		survivorTier2Pct: typeof tier2Pct === 'number' ? tier2Pct : 0,
		survivorTier2Years: typeof tier2Years === 'number' ? tier2Years : 0,
		survivorGuaranteedYears:
			yearsVary ? 'varies' : Number(tier1Years) + Number(tier2Years)
	};
}

/** Legacy SERP Plan Census rows (page 3.1), ages/service as of the reference (effective) date. */
function legacyCensusFrom(census: Insured[], refDate: string): LegacyCensusRow[] {
	return census.filter(isSerpParticipant).map((insured, idx) => ({
		index: idx + 1,
		name: `${insured.firstName} ${insured.lastName}`,
		serpNotColi: !isColiParticipant(insured),
		gender: insured.gender,
		smoker: insured.smoker,
		dateOfBirth: usDate(insured.dateOfBirth),
		age: ageNearestBirthday(insured.dateOfBirth, refDate),
		dateOfHire: usDate(insured.dateOfHire),
		serviceYears: Math.max(0, completedYearsBetween(insured.dateOfHire, refDate)),
		salary: formatMoneyDisplay(insured.currentSalary, 0)
	}));
}

/** Legacy projections rows (page 3.2). Calculable columns filled; results/gap columns may be null. */
function legacyProjectionsFrom(
	census: Insured[],
	refDate: string,
	resultById: Map<string, ParticipantResult>
): LegacyProjectionRow[] {
	const money0 = (v?: string): string | null => (v === undefined ? null : formatMoneyDisplay(v, 0));
	return census.filter(isSerpParticipant).map((insured, idx) => {
		const age = ageNearestBirthday(insured.dateOfBirth, refDate);
		const serviceYears = Math.max(0, completedYearsBetween(insured.dateOfHire, refDate));
		const ageAtRetirement = Math.max(insured.retirementAge, age + insured.benefitWaitingPeriod);
		const isFixed = insured.benefitPercentage === 0 && new Big(insured.benefitAmount).gt(0);
		const result = resultById.get(insured.id);
		return {
			index: idx + 1,
			name: `${insured.firstName.charAt(0)}. ${insured.lastName}`,
			age,
			serviceYears,
			ageAtRetirement,
			serviceYearsAtRetirement: serviceYears + (ageAtRetirement - age),
			percentFas: isFixed ? 'Fixed Benefit' : `${(insured.benefitPercentage * 100).toFixed(2)} %`,
			salaryAtRetirement: null,
			finalAvgSalary: money0(result?.finalAverageSalary),
			initialSurvivorBenefit: null,
			annualSerpBenefit: money0(result?.annualBenefit),
			totalSerpBenefit: money0(result?.totalBenefitCost)
		};
	});
}

/**
 * Life-of-plan cash-flow totals for ONE funding option, from that option's persisted
 * illustration streams. Death benefits are taken at each participant's life-expectancy age.
 * Returns null when no participant carries a design for this option.
 *
 * Options differ in *where* the benefit money comes from, not in how much is paid — so the
 * benefits total is constant across options and is split between company cash flow and COLI
 * assets by however much the policies distributed.
 *
 * For Option 1 there are no distributions, so this reduces exactly to the previous Option-1-only
 * derivation: company pays it all, and net COLI gain is death benefits less premiums.
 *
 * Returns null if ANY contributing design failed its solve. An infeasible solve still returns a
 * full stream built on a premium the engine never reached, and summing it produces a column of
 * numbers that look real. One bad participant invalidates the option's totals, not just its row.
 */
function cashFlowForOption(
	census: Insured[],
	resultById: Map<string, ParticipantResult>,
	afterTaxCost: Big,
	strategyId: string
): CashFlowOptionDisplay | null {
	let totalPremiums = new Big(0);
	let totalDeathAtLE = new Big(0);
	let totalDistributions = new Big(0);
	let anyStream = false;

	for (const insured of census.filter(isColiParticipant)) {
		const design = resultById.get(insured.id)?.designs?.[strategyId];
		if (design?.solveFeasible === false) return null;
		const years = design?.illustrationYears;
		if (!years || years.length === 0) continue;
		anyStream = true;
		for (const year of years) {
			// The engine bounds the premium window itself, so years past the pay period are 0.
			totalPremiums = totalPremiums.plus(new Big(year.premium));
			// Withdrawals and loans can both be non-zero in the crossover year of the hybrid
			// distribution types, so they sum rather than one superseding the other.
			totalDistributions = totalDistributions
				.plus(new Big(year.withdrawal ?? '0'))
				.plus(new Big(year.loan ?? '0'));
		}
		const leYear = years.find((y) => y.age === insured.lifeExpectancy) ?? years[years.length - 1];
		totalDeathAtLE = totalDeathAtLE.plus(new Big(leYear.deathBenefit));
	}
	if (!anyStream) return null;

	// Sign convention: outflows negative; grouped whole dollars, parentheses for negatives.
	const grouped = (b: Big) =>
		b.lt(0) ? `(${formatMoneyDisplay(b.abs(), 0)})` : formatMoneyDisplay(b, 0);

	// Benefits met from policy distributions never exceed the benefits actually owed.
	const fromColi = totalDistributions.gt(afterTaxCost) ? afterTaxCost : totalDistributions;
	const fromCompany = afterTaxCost.minus(fromColi);
	const netBenefitsTotal = afterTaxCost.times(-1);
	// What the policies returned (death proceeds + distributions) less what went in.
	const netColiGain = totalDeathAtLE.plus(totalDistributions).minus(totalPremiums);
	const aggregate = netBenefitsTotal.plus(netColiGain);
	const costRecovery = netColiGain.eq(0)
		? '—'
		: `${netBenefitsTotal.times(-1).div(netColiGain).times(100).round(0).toString()}%`;

	return {
		netBenefitsCompanyCashFlow: grouped(fromCompany.times(-1)),
		netBenefitsColiAssets: grouped(fromColi.times(-1)),
		netBenefitsTotal: grouped(netBenefitsTotal),
		coliPremiums: grouped(totalPremiums.times(-1)),
		coliDeathBenefits: formatMoneyDisplay(totalDeathAtLE, 0),
		coliLoansWithdrawals: formatMoneyDisplay(totalDistributions, 0),
		netColiGainLoss: grouped(netColiGain),
		aggregateCashFlow: grouped(aggregate),
		costRecovery
	};
}

/** Distinct benefit percentages across SERP participants → "60%" or "40%–60%". */
function benefitPercentRange(serp: Insured[]): string {
	if (serp.length === 0) return '—';
	const rates = serp.map((i) => i.benefitPercentage);
	const min = Math.min(...rates);
	const max = Math.max(...rates);
	return min === max ? formatPercent(min) : `${formatPercent(min)}–${formatPercent(max)}`;
}

/**
 * Build the report view model. `todayIso` anchors ages/dates when the results snapshot
 * predates the `asOf` stamp (older saved quotes).
 */
export function deriveReport(quote: Quote, todayIso: string): ReportModel {
	const { company, census, results } = quote;
	const asOf = results?.asOf ?? todayIso;
	const settings = planAssumptions(census, quote.modelSettings.npvDiscountRate);
	const benefitFormula = benefitFormulaFrom(census);
	const planSpecs = planSpecsFrom(quote);

	const serp = census.filter(isSerpParticipant);
	const coli = census.filter(isColiParticipant);

	const resultById = new Map<string, ParticipantResult>(
		(results?.perParticipant ?? []).map((p) => [p.insuredId, p])
	);

	// Population
	const ages = census.map((i) => ageNearestBirthday(i.dateOfBirth, asOf));
	const averageAge =
		ages.length === 0 ? null : Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
	const sumSalaries = (list: Insured[]) =>
		list.reduce((acc, i) => acc.plus(new Big(i.currentSalary)), new Big(0));
	const coveredPayroll = wholeDollars(sumSalaries(serp));
	const censusPayroll = wholeDollars(sumSalaries(census));

	// Legacy census/projections reference the plan effective date (else the valuation date).
	const legacyRefDate = quote.modelSettings.effectiveDate ?? asOf;
	const legacyCensus = legacyCensusFrom(census, legacyRefDate);
	const legacyProjections = legacyProjectionsFrom(census, legacyRefDate, resultById);
	const legacySerpBenefitTotal = results
		? wholeDollars(results.aggregate.totalBenefitCost)
		: null;

	// Plan design
	const firstPaymentAge = settings.retirementAge + settings.benefitWaitingPeriod;
	const payoutYears = Math.max(0, settings.assumedDeathBenefitAge - firstPaymentAge + 1);

	// Costs
	const totalBenefitCostRaw = results?.aggregate.totalBenefitCost ?? '0';
	const totalCost = new Big(totalBenefitCostRaw);
	const taxRate = company.corporateTaxRate;
	const afterTaxCostBig = totalCost.times(new Big(1).minus(taxRate));
	const taxDeduction = wholeDollars(totalCost.times(taxRate));
	const afterTaxCost = wholeDollars(afterTaxCostBig);

	// Life-of-plan cash flow per funding option, from that option's persisted illustration
	// streams. An option a run did not design simply has no entry, and its column shows "—".
	const cashFlowByOption: Record<string, CashFlowOptionDisplay> = {};
	const fundingOptions: Record<string, FundingOptionSummary> = {};
	if (results) {
		for (const option of REPORT_FUNDING_OPTIONS) {
			const flow = cashFlowForOption(census, resultById, afterTaxCostBig, option.id);
			if (flow) cashFlowByOption[option.id] = flow;

			const totals = results.aggregate.byOption?.[option.id];
			if (totals && totals.policyCount > 0) {
				const infeasibleCount = totals.infeasibleCount ?? 0;
				const reportable = infeasibleCount === 0;
				fundingOptions[option.id] = {
					premium: reportable ? wholeDollars(totals.totalFirstYearPremium) : null,
					averageFace: reportable
						? wholeDollars(new Big(totals.totalFaceAmount).div(totals.policyCount))
						: null,
					policyCount: totals.policyCount,
					infeasibleCount
				};
			}
		}
	}
	// Legacy alias: page 4.5 and existing bindings read Option 1 through this field.
	const cashFlow = cashFlowByOption[REPORT_FUNDING_OPTIONS[0].id] ?? null;

	// Census rows
	const censusRows: CensusRow[] = census.map((i) => ({
		name: fullName(i),
		gender: i.gender,
		dateOfBirth: shortDate(i.dateOfBirth),
		age: ageNearestBirthday(i.dateOfBirth, asOf),
		dateOfHire: shortDate(i.dateOfHire),
		serviceYears: Math.max(0, completedYearsBetween(i.dateOfHire, asOf)),
		salary: wholeDollars(i.currentSalary),
		coliInsured: isColiParticipant(i),
		serpParticipant: isSerpParticipant(i)
	}));

	// Benefit projections (SERP participants with computed liability)
	const projections: ProjectionRow[] = serp
		.map((i) => {
			const r = resultById.get(i.id);
			if (!r) return null;
			return {
				name: fullName(i),
				currentAge: ageNearestBirthday(i.dateOfBirth, asOf),
				retirementAge: i.retirementAge,
				finalAverageSalary: wholeDollars(r.finalAverageSalary),
				benefitPercent: formatPercent(i.benefitPercentage),
				annualBenefit: wholeDollars(r.annualBenefit),
				paymentYears: r.benefitStream.length,
				totalBenefit: wholeDollars(r.totalBenefitCost),
				netPresentValue: wholeDollars(r.netPresentValue)
			};
		})
		.filter((row): row is ProjectionRow => row !== null);

	// COLI policy design rows
	const policies: PolicyRow[] = coli
		.map((i): PolicyRow | null => {
			const r = resultById.get(i.id);
			if (!r || r.faceAmount === undefined) return null;
			return {
				name: fullName(i),
				issueAge: ageNearestBirthday(i.dateOfBirth, asOf),
				gender: i.gender,
				riskClass: i.riskClass,
				faceAmount: wholeDollars(r.faceAmount),
				annualPremium: r.firstYearPremium !== undefined ? wholeDollars(r.firstYearPremium) : '—',
				accountValue: r.accountValue !== undefined ? wholeDollars(r.accountValue) : '—',
				cashSurrenderValue:
					r.cashSurrenderValue !== undefined ? wholeDollars(r.cashSurrenderValue) : '—',
				deathBenefit: r.deathBenefit !== undefined ? wholeDollars(r.deathBenefit) : '—',
				gptAdjusted: r.gptAdjusted === true,
				mecAdjusted: r.mecAdjusted === true
			};
		})
		.filter((row): row is PolicyRow => row !== null);

	// Sample chips — the three largest annual benefits among SERP participants
	const samples: SampleChip[] = serp
		.map((i) => ({ insured: i, result: resultById.get(i.id) }))
		.filter((x): x is { insured: Insured; result: ParticipantResult } => x.result !== undefined)
		.sort((a, b) => new Big(b.result.annualBenefit).minus(a.result.annualBenefit).toNumber())
		.slice(0, 3)
		.map(({ insured, result }) => ({
			name: fullName(insured),
			age: ageNearestBirthday(insured.dateOfBirth, asOf),
			retirementAge: insured.retirementAge,
			finalAverageSalary: wholeDollars(result.finalAverageSalary),
			benefitPercent: formatPercent(insured.benefitPercentage),
			annualBenefit: wholeDollars(result.annualBenefit)
		}));

	return {
		companyName: company.name.trim() || 'the prospect company',
		runDate: longDate(asOf),
		asOf,

		numSerp: serp.length,
		numColi: coli.length,
		numCensus: census.length,
		averageAge,
		coveredPayroll,
		censusPayroll,

		settings,
		benefitFormula,
		planSpecs,
		benefitPercentDisplay: benefitPercentRange(serp),
		firstPaymentAge,
		payoutYears,
		salaryGrowthDisplay: formatPercent(settings.salaryGrowthRate),
		npvDiscountDisplay: formatPercent(settings.npvDiscountRate),
		taxRateDisplay: formatPercent(taxRate),

		totalBenefitCost: wholeDollars(totalCost),
		taxDeduction,
		afterTaxCost,
		netPresentValue: wholeDollars(results?.aggregate.netPresentValue ?? '0'),
		totalDeathBenefit:
			results?.aggregate.totalDeathBenefit !== undefined
				? wholeDollars(results.aggregate.totalDeathBenefit)
				: null,
		totalFirstYearPremium:
			results?.aggregate.totalFirstYearPremium !== undefined
				? wholeDollars(results.aggregate.totalFirstYearPremium)
				: null,
		hasResults: results != null,
		option1AvgFace:
			results?.aggregate.totalDeathBenefit !== undefined && coli.length > 0
				? wholeDollars(new Big(results.aggregate.totalDeathBenefit).div(coli.length))
				: null,
		cashFlow,
		fundingOptions,
		cashFlowByOption,

		legacyAsOfDisplay: longDate(legacyRefDate),
		legacyRefDate,
		legacyCensus,
		legacyProjections,
		legacyCensusSalaryTotal: coveredPayroll,
		legacySerpBenefitTotal,

		census: censusRows,
		projections,
		policies,
		samples
	};
}
