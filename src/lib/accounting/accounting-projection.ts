/**
 * Accounting module — the third calculation module (STUB).
 *
 * Runs THIRD, after liability (SERP engine) and asset (COLI illustrations). It turns the *cash*
 * views those two produce into the *accounting* (GAAP) view the report's earnings-impact ledger
 * (report pages 5.2-1…5.2-4) and entry worksheets (6.1…6.6) need. See the "Missing subsystem —
 * GAAP accounting engine" note in `src/lib/report/legacy/DATA-GAPS.md`; every quantity below is
 * one row of that table.
 *
 * ── Status: SCAFFOLD ONLY ────────────────────────────────────────────────────────────────────
 * The monetary figures are NOT computed yet — each is `null` and `status` is `'not-built'`.
 * What IS real today, because it needs no accounting assumptions:
 *   - the plan-year / calendar-year axis, keyed off the plan reference date;
 *   - the life-of-program horizon (max plan year across every benefit and illustration stream),
 *     which the report needs because its totals are life-of-program, NOT the 30 displayed years;
 *   - the per-participant allocation keys for the 6.6 cost-allocation sheet.
 * So wiring a real column later is a binding exercise on a fixed shape, not a rebuild.
 *
 * Pure and deterministic, like the liability engine and funding builders: it imports only the
 * money module, the date utility, and domain types — no Svelte, no I/O. Each GAAP formula will be
 * built behind its own named function as specs arrive, one feature at a time.
 */
import { Big } from '$lib/money/money';
import { ageNearestBirthday } from '$lib/dates/age';
import {
	isSerpParticipant,
	type Company,
	type Insured,
	type ModelSettings,
	type Results
} from '$lib/domain';

/** A monetary figure that is not computed yet. `null` = "blocked on the GAAP layer", not "$0". */
type Pending = string | null;

/**
 * One plan year of the SERP pension accounting view (ASC 715-30). Option-independent — the
 * pension obligation does not depend on how the COLI asset is funded. Columns map to the report's
 * 5.2 earnings-impact ledger [1]–[3] and the 6.1–6.3 / 6.5 SERP worksheets.
 */
export interface SerpAccountingYear {
	/** Plan year (1 = the plan's first year). Policies issue at plan start, so plan year = policy year. */
	planYear: number;
	/** Calendar year this plan year falls in — real, derived from the plan reference date. */
	calendarYear: number;

	// --- Pension obligation roll-forward (ASC 715-30) ---
	/** Annual accrual of benefit earned this year. Also split per participant on 6.6. */
	serviceCost: Pending;
	/** Interest accrual on the projected benefit obligation at the accounting discount rate. */
	interestCost: Pending;
	/** Level amortisation of prior service cost recognised at plan inception. */
	priorServiceCostAmortization: Pending;
	/** Pension expense = service + interest + amortisation. Report 5.2 column [1] (an expense, negative). */
	pensionExpense: Pending;
	/** Projected Benefit Obligation, beginning and end of year — distinct from the engine's NPV. */
	pboBoy: Pending;
	pboEoy: Pending;
	/** Unrecognised prior service cost balance carried in AOCI, end of year. */
	unrecognizedPriorServiceCostEoy: Pending;
	/** Accumulated other comprehensive income balance, end of year (pre-tax benefit). */
	aociEoy: Pending;
	/** Unfunded accrued pension cost, end of year (audit-trail balance, 6.5). */
	unfundedAccruedPensionCostEoy: Pending;

	// --- Tax effect (at Company.corporateTaxRate) ---
	/** Tax deduction on the pension expense. Report 5.2 column [2]. */
	benefitTaxDeduction: Pending;
	/** Deferred tax asset for the future tax benefit of the obligation, end of year (ASC 740-10). */
	deferredTaxAssetEoy: Pending;

	/**
	 * Net SERP earnings impact = pre-tax impact + tax deduction. Report 5.2 column [3]. Marked in
	 * the source as mortality-weighted (survival-adjusted), so NOT a plain sum for a single life —
	 * it needs the mortality table subsystem, also still missing.
	 */
	netSerpEarningsImpact: Pending;
}

/**
 * One plan year of the COLI asset accounting view (ASC 325-30, cash-surrender-value method), for
 * ONE funding option. Report 5.2 column [4]. The *inputs* already exist on
 * `Results.perParticipant[].designs[optionId].illustrationYears` (premium, CSV, death benefit) —
 * only the accounting treatment is unbuilt, which makes this the closest column to buildable.
 */
export interface ColiAccountingYear {
	planYear: number;
	calendarYear: number;
	/** Premium paid into the policies this year (an expense under the CSV method). */
	premium: Pending;
	/** Change in cash surrender value this year (income when positive). */
	cashSurrenderValueChange: Pending;
	/** Death proceeds received in excess of CSV this year. */
	deathProceeds: Pending;
	/** COLI earnings impact = CSV change − premium + death proceeds. Report 5.2 column [4]. */
	coliEarningsImpact: Pending;
	/** Combined earnings impact = net SERP [3] + COLI [4]. Report 5.2 column [5]. */
	combinedEarningsImpact: Pending;
}

/**
 * Pension expense allocated to one participant (report 6.6). Names/keys are real; the split and
 * the percent-of-total await the pension expense calc.
 */
export interface ParticipantPensionAllocation {
	insuredId: string;
	/** This participant's share of consolidated pension expense. */
	pensionExpense: Pending;
	/** Share as a fraction of the consolidated total (the 6.6 "% of total" column). */
	percentOfTotal: number | null;
}

/** The accounting module's output. Axis fields are real; monetary fields are pending the GAAP build. */
export interface AccountingResult {
	/** `'not-built'` until the first real column lands; flip per-feature as specs arrive. */
	status: 'not-built';
	/** Calendar year of plan year 1 (the plan reference year). */
	referenceYear: number;
	/**
	 * Life-of-program horizon in plan years — the last plan year carrying any benefit payment or
	 * illustration row across the whole census. The report's ledger totals run to here, not to the
	 * 30 years it displays, so the projection horizon must exceed the print horizon.
	 */
	horizonPlanYears: number;
	/** SERP pension accounting, one row per plan year 1…horizon (axis real, figures pending). */
	serp: SerpAccountingYear[];
	/** COLI asset accounting per funding option, keyed by strategy id (axis real, figures pending). */
	coliByOption: Record<string, ColiAccountingYear[]>;
	/** Per-participant pension expense allocation for the 6.6 sheet (keys real, figures pending). */
	byParticipant: ParticipantPensionAllocation[];
}

export interface ComputeAccountingParams {
	/** The assembled liability + asset snapshot this accounting view is derived from. */
	results: Results;
	/** The census — needed for current age (plan-year mapping) and participant allocation. */
	census: Insured[];
	/** Corporate tax rate drives the deferred-tax and tax-deduction columns. */
	company: Company;
	/** NPV/accounting discount rate drives interest cost and the PBO roll-forward. */
	settings: ModelSettings;
	/** Plan reference date, ISO YYYY-MM-DD — the same `legacyRefDate` the report ledgers key off. */
	refDate: string;
}

/**
 * The life-of-program horizon in plan years: the last plan year that carries any cash event —
 * a SERP benefit payment or a COLI illustration row — across the entire census.
 *
 * Plan year of a benefit at attained age A for a participant currently aged C is `A − C`, the
 * same mapping the report's Appendix C ledger and page 4.5 cash flow use. Illustration rows carry
 * their own `policyYear`, and policies issue at plan start, so a policy year IS a plan year.
 *
 * Real today — no accounting assumptions involved.
 */
export function lifeOfProgramHorizon(results: Results, census: Insured[], refDate: string): number {
	const ageById = new Map(census.map((i) => [i.id, ageNearestBirthday(i.dateOfBirth, refDate)]));
	let horizon = 0;

	for (const p of results.perParticipant) {
		const currentAge = ageById.get(p.insuredId);
		if (currentAge !== undefined) {
			for (const year of p.benefitStream) {
				horizon = Math.max(horizon, year.age - currentAge);
			}
		}
		for (const design of Object.values(p.designs ?? {})) {
			for (const year of design.illustrationYears ?? []) {
				horizon = Math.max(horizon, year.policyYear);
			}
		}
	}
	return horizon;
}

/**
 * Compute the accounting (GAAP) projection from a completed run — STUB.
 *
 * Returns the real plan-year/calendar-year axis, the life-of-program horizon, and the
 * per-participant allocation keys, with every monetary figure `null` and `status: 'not-built'`.
 * The report pages keep rendering their "—" placeholders; nothing is wired to consume this yet.
 * Each GAAP formula is filled in behind its own named function as specs arrive.
 */
export function computeAccounting(params: ComputeAccountingParams): AccountingResult {
	const { results, census, refDate } = params;
	const referenceYear = Number(refDate.slice(0, 4));
	const horizonPlanYears = lifeOfProgramHorizon(results, census, refDate);

	const planYears = Array.from({ length: horizonPlanYears }, (_, i) => i + 1);
	const calendarYearOf = (planYear: number) => referenceYear + planYear - 1;

	const serp: SerpAccountingYear[] = planYears.map((planYear) => ({
		planYear,
		calendarYear: calendarYearOf(planYear),
		serviceCost: null,
		interestCost: null,
		priorServiceCostAmortization: null,
		pensionExpense: null,
		pboBoy: null,
		pboEoy: null,
		unrecognizedPriorServiceCostEoy: null,
		aociEoy: null,
		unfundedAccruedPensionCostEoy: null,
		benefitTaxDeduction: null,
		deferredTaxAssetEoy: null,
		netSerpEarningsImpact: null
	}));

	// One COLI series per funding option the run actually designed — so this tracks the options
	// the app produces rather than a hardcoded list. Axis real; figures pending.
	const coliByOption: Record<string, ColiAccountingYear[]> = {};
	const optionIds = new Set<string>();
	for (const p of results.perParticipant) {
		for (const id of Object.keys(p.designs ?? {})) optionIds.add(id);
	}
	for (const optionId of optionIds) {
		coliByOption[optionId] = planYears.map((planYear) => ({
			planYear,
			calendarYear: calendarYearOf(planYear),
			premium: null,
			cashSurrenderValueChange: null,
			deathProceeds: null,
			coliEarningsImpact: null,
			combinedEarningsImpact: null
		}));
	}

	// 6.6 allocates consolidated pension expense across SERP participants (a COLI-only life carries
	// no pension expense). Keys are real; the split awaits the pension expense calc.
	const byParticipant: ParticipantPensionAllocation[] = census
		.filter(isSerpParticipant)
		.map((insured) => ({ insuredId: insured.id, pensionExpense: null, percentOfTotal: null }));

	// Reference `Big` so the money module (and its rounding policy) is loaded here too, keeping this
	// file's import surface identical to the other calc modules for when the real figures land.
	void Big;

	return { status: 'not-built', referenceYear, horizonPlanYears, serp, coliByOption, byParticipant };
}
