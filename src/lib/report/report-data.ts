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
import { survivorBenefitAtAge, survivorBenefitStream } from '$lib/engine/survivor-benefit';
import { computeAccounting } from '$lib/accounting';
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
	/** Stable key. Names are NOT unique — two executives can share one. */
	insuredId: string;
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
	/** Stable participant id — lets option/allocation sheets (6.6) key back to this row. */
	insuredId: string;
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

/**
 * Sample participant benefit statement (Appendix A) — the first census member.
 *
 * Inputs and post-run figures are populated; the two survivor **totals** are null because the
 * survivor benefit calculation is not wired yet (the tier percentages and years below are inputs,
 * so the schedule prints even while the amounts do not).
 */
export interface BenefitStatementDisplay {
	name: string;
	dateOfBirth: string;
	statementDate: string;
	/** Age nearest birthday at the statement date. */
	age: number;
	retirementAge: number;
	currentSalary: string;
	/** "20.00%" — the defined-benefit percentage of final average salary. */
	benefitPercentDisplay: string;
	/** Trailing years averaged into FAS, e.g. 5. */
	fasAveragingPeriod: number;
	salaryGrowthDisplay: string;
	// --- Post-run (null until a model run populates results) ---
	annualBenefit: string | null;
	finalAverageSalary: string | null;
	/** Annual benefit × the guaranteed minimum payout years. */
	guaranteedTotal: string | null;
	guaranteedYears: number;
	/** Annual benefit × the full payout years. */
	projectedTotal: string | null;
	projectedYears: number;
	// --- Survivor schedule (inputs) ---
	survivorTier1Display: string;
	survivorTier1Years: number;
	survivorTier2Display: string;
	survivorTier2Years: number;
	/** Age one year before retirement, used to label the second survivor line. */
	priorToRetirementAge: number;
	/**
	 * Total survivor benefit for a death this year, and for one in the year before retirement.
	 * Both are pure derivations from inputs, so they are present without a model run — and both
	 * are zero for a participant already at or past normal retirement age.
	 */
	survivorTotalThisYear: string;
	survivorTotalPriorToRetirement: string;
}

/**
 * One participant's row on the face-vs-survivor analysis (Appendix B), for a single funding
 * option. Compares the COLI death benefit against the after-tax survivor liability it would have
 * to cover, for a death now and for one in the year before retirement.
 */
export interface FaceSurvivorRow {
	/** Stable key. Names are NOT unique — two participants can share one, and blank rows do. */
	insuredId: string;
	/** Abbreviated name, e.g. "J. Thren". */
	name: string;
	age: number;
	nra: number;
	survivorCurrent: string;
	survivorAtNra: string;
	afterTaxCurrent: string;
	afterTaxAtNra: string;
	/** Null for a SERP participant with no COLI policy — the source prints 0 for these. */
	faceCurrent: string | null;
	faceAtNra: string | null;
	/** "40 %" — COLI face ÷ after-tax survivor benefit. Null when either side is missing. */
	ratioCurrent: string | null;
	ratioAtNra: string | null;
}

/** Appendix B sheet for one funding option: participant rows plus the current-year totals. */
export interface FaceSurvivorAnalysis {
	rows: FaceSurvivorRow[];
	/** The source totals only the current-year columns, not the NRA − 1 ones. */
	totalSurvivorCurrent: string;
	totalAfterTaxCurrent: string;
	totalFaceCurrent: string | null;
	totalRatioCurrent: string | null;
}

/**
 * One plan year of the Appendix C ledger, for a single funding option. Sign convention follows
 * the source: outflows (benefits, premiums) are negative, inflows positive.
 */
export interface LedgerRow {
	planYear: number;
	grossBenefits: string;
	taxDeduction: string;
	netBenefitsPaid: string;
	netFromCompanyCashFlow: string;
	netFromColiAssets: string;
	coliPremiums: string;
	coliDeathProceeds: string;
	coliLoansWithdrawals: string;
	coliCashSurrenderValue: string;
	coliFaceAmount: string;
}

/** Appendix C ledger for one funding option: year rows plus life-of-program totals. */
export interface OptionLedger {
	rows: LedgerRow[];
	/** Totals over the whole program, not just the years a sheet displays. */
	totals: Omit<LedgerRow, 'planYear'>;
}

/**
 * SERP pension columns of the 5.2 earnings ledger ([1] pre-tax impact, [2] tax deduction, [3] net
 * impact) — **option-independent**, so one of these serves all four option sheets. Keyed by
 * calendar year; grouped whole dollars, charges to earnings parenthesized. Present only when there
 * are SERP participants and a run exists.
 */
export interface EarningsLedgerSerpDisplay {
	/** [1] Pre-tax SERP earnings impact (an expense, parenthesized). */
	col1ByYear: Record<number, string>;
	/** [2] Benefit tax deduction. */
	col2ByYear: Record<number, string>;
	/** [3] Net SERP earnings impact. */
	col3ByYear: Record<number, string>;
	col1Total: string;
	col2Total: string;
	col3Total: string;
}

/**
 * COLI and combined columns of the 5.2 ledger for one funding option ([4] COLI earnings impact,
 * [5] combined = net SERP [3] + COLI [4]), from the accounting module. An option present here is
 * feasible and run; infeasible or undesigned options are omitted (columns [4]/[5] then show "—",
 * while the option-independent SERP columns still show). Grouped whole dollars, charges parenthesized.
 */
export interface EarningsLedgerOptionDisplay {
	/** Column [4] per calendar year. */
	coliByYear: Record<number, string>;
	/** Column [5] per calendar year. */
	combinedByYear: Record<number, string>;
	/** Life-of-program totals — not limited to the years the sheet displays. */
	coliTotal: string;
	combinedTotal: string;
}

/**
 * The consolidated FASB ASC 715-30 audit trail (report page 6.5) — the nine SERP pension columns
 * per calendar year, preformatted. Present only after a run with SERP participants. Columns:
 * [1] service cost, [2] prior-service amortisation, [3] interest accrual, [4] total pension cost,
 * [5] gross benefit payments, [6] annual unfunded, [7] EOY unfunded, [8] BOY unrecognised prior
 * service cost, [9] EOY unrecognised prior service cost.
 */
export interface AuditTrailDisplay {
	/** Nine formatted column values (charges parenthesized) keyed by calendar year. */
	byYear: Record<number, string[]>;
}

/**
 * Reference-year pension expense allocation by participant (report page 6.6). Five formatted
 * columns per SERP participant ([1] service cost, [2] prior-service amortisation, [3] interest,
 * [4] total pension expense, [5] % of total), keyed by insured id, plus the consolidated totals
 * row. Present only after a run with SERP participants.
 */
export interface CostAllocationDisplay {
	byInsuredId: Record<string, string[]>;
	/** Totals row — [1]–[4] consolidated, [5] is "100.0%". */
	totals: string[];
}

/**
 * Census age span and mortality assumption for the Appendix G chart footnote. Derived from
 * inputs, so it fills pre-run even though the chart itself awaits a mortality table.
 */
export interface MortalityAssumptions {
	youngestAge: number | null;
	oldestAge: number | null;
	/** Single life expectancy across SERP participants, or "Varies" (the shared rule). */
	lifeExpectancyDisplay: string;
}

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
	/** Sample benefit statement for the first census member, or null on an empty census. */
	benefitStatement: BenefitStatementDisplay | null;
	/** COLI face vs survivor liability per funding option, keyed by strategy id (Appendix B). */
	faceSurvivorByOption: Record<string, FaceSurvivorAnalysis>;
	/** Year-by-year ledger per funding option, keyed by strategy id (Appendix C). */
	ledgerByOption: Record<string, OptionLedger>;
	/** SERP pension columns [1][2][3] of the 5.2 ledger (option-independent), or null pre-run / no SERP. */
	earningsLedgerSerp: EarningsLedgerSerpDisplay | null;
	/** Consolidated FASB ASC 715-30 audit trail (page 6.5), or null pre-run / no SERP participants. */
	auditTrail: AuditTrailDisplay | null;
	/** Reference-year pension expense allocation by participant (page 6.6), or null pre-run / no SERP. */
	costAllocation: CostAllocationDisplay | null;
	/**
	 * COLI [4] and combined [5] columns of the 5.2 ledger per funding option, keyed by strategy id.
	 * Only feasible, run options appear; others are absent and those columns render "—".
	 */
	earningsLedgerByOption: Record<string, EarningsLedgerOptionDisplay>;
	/** Census age span + life expectancy for the mortality chart footnote (Appendix G). */
	mortalityAssumptions: MortalityAssumptions;

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

/**
 * Census age span and the assumed life expectancy, for the Appendix G chart footnote. Ages are
 * nearest-birthday at the plan reference date, matching the census and projections pages.
 */
function mortalityAssumptionsFrom(census: Insured[], refDate: string): MortalityAssumptions {
	const serp = census.filter(isSerpParticipant);
	const ages = serp.map((insured) => ageNearestBirthday(insured.dateOfBirth, refDate));
	const le = commonSerpValue(census, (insured) => insured.lifeExpectancy);
	return {
		youngestAge: ages.length > 0 ? Math.min(...ages) : null,
		oldestAge: ages.length > 0 ? Math.max(...ages) : null,
		lifeExpectancyDisplay: le === null ? '—' : le === 'varies' ? 'Varies' : `Age ${le}`
	};
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
/**
 * Build the sample benefit statement (Appendix A) for the first census member.
 *
 * Everything here is either a per-participant input or an already-computed result — except the
 * two survivor totals, which need the survivor benefit calculation. The inputs for that exist
 * (tier percentages/years, salary, growth rate), so it is a calc to write, not data to gather.
 */
function benefitStatementFor(
	insured: Insured | undefined,
	refDate: string,
	resultById: Map<string, ParticipantResult>
): BenefitStatementDisplay | null {
	if (!insured) return null;
	const result = resultById.get(insured.id);
	const annual = result?.annualBenefit;
	const timesYears = (years: number): string | null =>
		annual === undefined ? null : wholeDollars(new Big(annual).times(years));

	const age = ageNearestBirthday(insured.dateOfBirth, refDate);
	const survivor = survivorStreamFor(insured, refDate);

	return {
		name: fullName(insured),
		dateOfBirth: longDate(insured.dateOfBirth),
		statementDate: longDate(refDate),
		age,
		retirementAge: insured.retirementAge,
		currentSalary: wholeDollars(insured.currentSalary),
		benefitPercentDisplay: formatPercent(insured.benefitPercentage),
		fasAveragingPeriod: insured.fasAveragingPeriod,
		salaryGrowthDisplay: formatPercent(insured.salaryGrowthRate, 1),
		annualBenefit: annual !== undefined ? wholeDollars(annual) : null,
		finalAverageSalary:
			result?.finalAverageSalary !== undefined ? wholeDollars(result.finalAverageSalary) : null,
		guaranteedTotal: timesYears(insured.minBenefitYears),
		guaranteedYears: insured.minBenefitYears,
		projectedTotal: timesYears(insured.maxBenefitYears),
		projectedYears: insured.maxBenefitYears,
		survivorTier1Display: formatPercent(insured.survivorTier1Pct, 1),
		survivorTier1Years: insured.survivorTier1Years,
		survivorTier2Display: formatPercent(insured.survivorTier2Pct, 1),
		survivorTier2Years: insured.survivorTier2Years,
		priorToRetirementAge: insured.retirementAge - 1,
		survivorTotalThisYear: wholeDollars(survivorBenefitAtAge(survivor, age)),
		survivorTotalPriorToRetirement: wholeDollars(
			survivorBenefitAtAge(survivor, insured.retirementAge - 1)
		)
	};
}

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
		insuredId: insured.id,
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

/**
 * Appendix B — COLI face amount against pre-retirement survivor liability, for one funding
 * option. For each SERP participant: the survivor benefit for a death now and for one in the
 * year before NRA, the after-tax cost of each, the option's death benefit at those two points,
 * and the ratio between them.
 *
 * Face comes from the persisted illustration stream, so it is results-gated; the survivor and
 * after-tax columns are pure and fill pre-run. A SERP participant with no COLI policy has no
 * face and no ratio — the source prints 0 for those rows.
 */
function faceSurvivorFor(
	census: Insured[],
	refDate: string,
	resultById: Map<string, ParticipantResult>,
	taxRate: number,
	strategyId: string
): FaceSurvivorAnalysis {
	const afterTaxFactor = new Big(1).minus(taxRate);
	let totalSurvivor = new Big(0);
	let totalAfterTax = new Big(0);
	let totalFace = new Big(0);
	let anyFace = false;

	const rows = census.filter(isSerpParticipant).map((insured): FaceSurvivorRow => {
		const age = ageNearestBirthday(insured.dateOfBirth, refDate);
		const nra = insured.retirementAge;
		const stream = survivorStreamFor(insured, refDate);
		const survivorCurrent = survivorBenefitAtAge(stream, age);
		const survivorAtNra = survivorBenefitAtAge(stream, nra - 1);
		const afterTaxCurrent = survivorCurrent.times(afterTaxFactor);
		const afterTaxAtNra = survivorAtNra.times(afterTaxFactor);

		// The option's death benefit now (policy year 1) and in the year before retirement.
		const years = resultById.get(insured.id)?.designs?.[strategyId]?.illustrationYears;
		const faceCurrent = years?.[0]?.deathBenefit;
		const faceAtNra = years?.find((year) => year.age === nra - 1)?.deathBenefit;

		totalSurvivor = totalSurvivor.plus(survivorCurrent);
		totalAfterTax = totalAfterTax.plus(afterTaxCurrent);
		if (faceCurrent !== undefined) {
			totalFace = totalFace.plus(new Big(faceCurrent));
			anyFace = true;
		}

		/** Ratio of cover to liability; undefined when either side is unavailable. */
		const ratio = (face: string | undefined, afterTax: Big): string | null => {
			if (face === undefined || afterTax.eq(0)) return null;
			return `${new Big(face).div(afterTax).times(100).round(0).toString()} %`;
		};

		return {
			insuredId: insured.id,
			name: `${insured.firstName.charAt(0)}. ${insured.lastName}`,
			age,
			nra,
			survivorCurrent: formatMoneyDisplay(survivorCurrent, 0),
			survivorAtNra: formatMoneyDisplay(survivorAtNra, 0),
			afterTaxCurrent: formatMoneyDisplay(afterTaxCurrent, 0),
			afterTaxAtNra: formatMoneyDisplay(afterTaxAtNra, 0),
			faceCurrent: faceCurrent !== undefined ? formatMoneyDisplay(faceCurrent, 0) : null,
			faceAtNra: faceAtNra !== undefined ? formatMoneyDisplay(faceAtNra, 0) : null,
			ratioCurrent: ratio(faceCurrent, afterTaxCurrent),
			ratioAtNra: ratio(faceAtNra, afterTaxAtNra)
		};
	});

	return {
		rows,
		totalSurvivorCurrent: formatMoneyDisplay(totalSurvivor, 0),
		totalAfterTaxCurrent: formatMoneyDisplay(totalAfterTax, 0),
		totalFaceCurrent: anyFace ? formatMoneyDisplay(totalFace, 0) : null,
		totalRatioCurrent:
			anyFace && !totalAfterTax.eq(0)
				? `${totalFace.div(totalAfterTax).times(100).round(0).toString()} %`
				: null
	};
}

/**
 * Appendix C — year-by-year ledger for one funding option.
 *
 * Everything is aggregated by **plan year**. Policies are all issued at the plan start, so a
 * policy year and a plan year are the same thing; a benefit at attained age A falls in plan year
 * `A − currentAge`, the same mapping the illustration stream uses (its year 1 ends at issue age
 * + 1).
 *
 * Death proceeds land in the plan year containing each participant's life expectancy — the same
 * mortality assumption page 4.5 totals against.
 */
function optionLedgerFor(
	census: Insured[],
	refDate: string,
	resultById: Map<string, ParticipantResult>,
	taxRate: number,
	strategyId: string
): OptionLedger {
	const zero = new Big(0);
	type Acc = {
		gross: Big;
		premiums: Big;
		deathProceeds: Big;
		draws: Big;
		csv: Big;
		face: Big;
	};
	const byYear = new Map<number, Acc>();
	const at = (planYear: number): Acc => {
		let acc = byYear.get(planYear);
		if (!acc) {
			acc = { gross: zero, premiums: zero, deathProceeds: zero, draws: zero, csv: zero, face: zero };
			byYear.set(planYear, acc);
		}
		return acc;
	};

	for (const insured of census) {
		const currentAge = ageNearestBirthday(insured.dateOfBirth, refDate);
		const result = resultById.get(insured.id);

		// SERP side: the benefit stream, keyed by attained age.
		for (const year of result?.benefitStream ?? []) {
			at(year.age - currentAge).gross = at(year.age - currentAge).gross.plus(new Big(year.amount));
		}

		// COLI side: this option's illustration stream.
		const years = result?.designs?.[strategyId]?.illustrationYears ?? [];
		for (const year of years) {
			const acc = at(year.policyYear);
			acc.premiums = acc.premiums.plus(new Big(year.premium));
			acc.draws = acc.draws
				.plus(new Big(year.withdrawal ?? '0'))
				.plus(new Big(year.loan ?? '0'));
			acc.csv = acc.csv.plus(new Big(year.cashSurrenderValue));
			acc.face = acc.face.plus(new Big(year.deathBenefit));
			// Proceeds are received in the year the participant is assumed to die.
			if (year.age === insured.lifeExpectancy) {
				acc.deathProceeds = acc.deathProceeds.plus(new Big(year.deathBenefit));
			}
		}
	}

	const money = (b: Big) => formatMoneyDisplay(b, 0);
	/** Outflow: shown negative, in parentheses when non-zero. */
	const outflow = (b: Big) => (b.gt(0) ? `(${money(b)})` : money(b));

	const running = {
		gross: zero,
		tax: zero,
		net: zero,
		company: zero,
		coli: zero,
		premiums: zero,
		proceeds: zero,
		draws: zero
	};

	const planYears = [...byYear.keys()].filter((y) => y >= 1).sort((a, b) => a - b);
	const rows = planYears.map((planYear): LedgerRow => {
		const acc = at(planYear);
		const tax = acc.gross.times(taxRate);
		const net = acc.gross.minus(tax);
		// Benefits met from policy distributions that year, never more than the benefits owed.
		const fromColi = acc.draws.gt(net) ? net : acc.draws;
		const fromCompany = net.minus(fromColi);

		running.gross = running.gross.plus(acc.gross);
		running.tax = running.tax.plus(tax);
		running.net = running.net.plus(net);
		running.company = running.company.plus(fromCompany);
		running.coli = running.coli.plus(fromColi);
		running.premiums = running.premiums.plus(acc.premiums);
		running.proceeds = running.proceeds.plus(acc.deathProceeds);
		running.draws = running.draws.plus(acc.draws);

		return {
			planYear,
			grossBenefits: outflow(acc.gross),
			taxDeduction: money(tax),
			netBenefitsPaid: outflow(net),
			netFromCompanyCashFlow: outflow(fromCompany),
			netFromColiAssets: outflow(fromColi),
			coliPremiums: outflow(acc.premiums),
			coliDeathProceeds: money(acc.deathProceeds),
			coliLoansWithdrawals: money(acc.draws),
			// Balances, not flows — shown as at the end of the year.
			coliCashSurrenderValue: money(acc.csv),
			coliFaceAmount: money(acc.face)
		};
	});

	const last = rows.length > 0 ? at(planYears[planYears.length - 1]) : undefined;
	return {
		rows,
		totals: {
			grossBenefits: outflow(running.gross),
			taxDeduction: money(running.tax),
			netBenefitsPaid: outflow(running.net),
			netFromCompanyCashFlow: outflow(running.company),
			netFromColiAssets: outflow(running.coli),
			coliPremiums: outflow(running.premiums),
			coliDeathProceeds: money(running.proceeds),
			coliLoansWithdrawals: money(running.draws),
			// Balance columns do not total — the source leaves them blank on the totals row.
			coliCashSurrenderValue: last ? '' : '',
			coliFaceAmount: ''
		}
	};
}

/** The participant's pre-retirement survivor stream, from their own schedule inputs. */
function survivorStreamFor(insured: Insured, refDate: string) {
	return survivorBenefitStream({
		currentSalary: new Big(insured.currentSalary),
		dateOfBirth: insured.dateOfBirth,
		asOf: refDate,
		retirementAge: insured.retirementAge,
		salaryGrowthRate: insured.salaryGrowthRate,
		schedule: {
			tier1Pct: insured.survivorTier1Pct,
			tier1Years: insured.survivorTier1Years,
			tier2Pct: insured.survivorTier2Pct,
			tier2Years: insured.survivorTier2Years
		}
	});
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
		// Survivor benefit for a death in the current year — pure, so it needs no run.
		const survivorNow = survivorBenefitAtAge(survivorStreamFor(insured, refDate), age);
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
			initialSurvivorBenefit: formatMoneyDisplay(survivorNow, 0),
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

	// Appendix B compares each option's face against the survivor liability. The survivor and
	// after-tax columns are pure, so these build with or without a run.
	const faceSurvivorByOption: Record<string, FaceSurvivorAnalysis> = {};
	const ledgerByOption: Record<string, OptionLedger> = {};
	for (const option of REPORT_FUNDING_OPTIONS) {
		faceSurvivorByOption[option.id] = faceSurvivorFor(
			census,
			legacyRefDate,
			resultById,
			taxRate,
			option.id
		);
		ledgerByOption[option.id] = optionLedgerFor(
			census,
			legacyRefDate,
			resultById,
			taxRate,
			option.id
		);
	}

	// Page 5.2 earnings ledger, from the accounting module. Computed only after a run. The SERP
	// columns [1][2][3] are option-independent; the COLI [4] and combined [5] columns are per option
	// and an option with any infeasible solve is suppressed, matching how pages 4.3 / 4.5 refuse to
	// total a design built on a solve that missed its target.
	let earningsLedgerSerp: EarningsLedgerSerpDisplay | null = null;
	let auditTrail: AuditTrailDisplay | null = null;
	let costAllocation: CostAllocationDisplay | null = null;
	const earningsLedgerByOption: Record<string, EarningsLedgerOptionDisplay> = {};
	if (results) {
		const accounting = computeAccounting({
			results,
			census,
			company,
			settings: quote.modelSettings,
			refDate: legacyRefDate
		});
		const grouped = (b: Big) =>
			b.lt(0) ? `(${formatMoneyDisplay(b.abs(), 0)})` : formatMoneyDisplay(b, 0);

		// SERP columns [1][2][3] — [1] is the pre-tax impact (an expense = −pension expense).
		if (serp.length > 0) {
			const col1: Record<number, string> = {};
			const col2: Record<number, string> = {};
			const col3: Record<number, string> = {};
			let t1 = new Big(0);
			let t2 = new Big(0);
			let t3 = new Big(0);
			for (const year of accounting.serp) {
				const pre = new Big(year.pensionExpense ?? '0').times(-1);
				const ded = new Big(year.benefitTaxDeduction ?? '0');
				const net = new Big(year.netSerpEarningsImpact ?? '0');
				col1[year.calendarYear] = grouped(pre);
				col2[year.calendarYear] = grouped(ded);
				col3[year.calendarYear] = grouped(net);
				t1 = t1.plus(pre);
				t2 = t2.plus(ded);
				t3 = t3.plus(net);
			}
			earningsLedgerSerp = {
				col1ByYear: col1,
				col2ByYear: col2,
				col3ByYear: col3,
				col1Total: grouped(t1),
				col2Total: grouped(t2),
				col3Total: grouped(t3)
			};

			// Page 6.5 audit trail — the nine SERP pension columns per calendar year.
			const byYear: Record<number, string[]> = {};
			for (const year of accounting.serp) {
				byYear[year.calendarYear] = [
					grouped(new Big(year.serviceCost ?? '0')),
					grouped(new Big(year.priorServiceCostAmortization ?? '0')),
					grouped(new Big(year.interestCost ?? '0')),
					grouped(new Big(year.pensionExpense ?? '0')),
					grouped(new Big(year.grossBenefitPayments ?? '0')),
					grouped(new Big(year.annualUnfundedAccruedPensionCost ?? '0')),
					grouped(new Big(year.unfundedAccruedPensionCostEoy ?? '0')),
					grouped(new Big(year.unrecognizedPriorServiceCostBoy ?? '0')),
					grouped(new Big(year.unrecognizedPriorServiceCostEoy ?? '0'))
				];
			}
			auditTrail = { byYear };

			// Page 6.6 — reference-year pension expense allocated by participant, plus the totals row.
			const pct = (fraction: number | null): string =>
				fraction == null ? '—' : `${(fraction * 100).toFixed(1)}%`;
			const byInsuredId: Record<string, string[]> = {};
			for (const alloc of accounting.byParticipant) {
				byInsuredId[alloc.insuredId] = [
					grouped(new Big(alloc.serviceCost ?? '0')),
					grouped(new Big(alloc.priorServiceCostAmortization ?? '0')),
					grouped(new Big(alloc.interestCost ?? '0')),
					grouped(new Big(alloc.pensionExpense ?? '0')),
					pct(alloc.percentOfTotal)
				];
			}
			// Totals = the consolidated reference-year figures (accounting.serp[0]); share is 100%.
			const refYear = accounting.serp[0];
			costAllocation = {
				byInsuredId,
				totals: [
					grouped(new Big(refYear?.serviceCost ?? '0')),
					grouped(new Big(refYear?.priorServiceCostAmortization ?? '0')),
					grouped(new Big(refYear?.interestCost ?? '0')),
					grouped(new Big(refYear?.pensionExpense ?? '0')),
					'100.0%'
				]
			};
		}

		// COLI [4] and combined [5] per option.
		for (const option of REPORT_FUNDING_OPTIONS) {
			const series = accounting.coliByOption[option.id];
			if (!series) continue;
			if ((results.aggregate.byOption?.[option.id]?.infeasibleCount ?? 0) > 0) continue;
			const coliByYear: Record<number, string> = {};
			const combinedByYear: Record<number, string> = {};
			let coliTotal = new Big(0);
			let combinedTotal = new Big(0);
			for (const year of series) {
				const coli = new Big(year.coliEarningsImpact ?? '0');
				const combined = new Big(year.combinedEarningsImpact ?? '0');
				coliByYear[year.calendarYear] = grouped(coli);
				combinedByYear[year.calendarYear] = grouped(combined);
				coliTotal = coliTotal.plus(coli);
				combinedTotal = combinedTotal.plus(combined);
			}
			earningsLedgerByOption[option.id] = {
				coliByYear,
				combinedByYear,
				coliTotal: grouped(coliTotal),
				combinedTotal: grouped(combinedTotal)
			};
		}
	}

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
			insuredId: insured.id,
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
		// Appendix A samples the first census member, per operator.
		benefitStatement: benefitStatementFor(census[0], legacyRefDate, resultById),
		faceSurvivorByOption,
		ledgerByOption,
		earningsLedgerSerp,
		auditTrail,
		costAllocation,
		earningsLedgerByOption,
		mortalityAssumptions: mortalityAssumptionsFrom(census, legacyRefDate),

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
