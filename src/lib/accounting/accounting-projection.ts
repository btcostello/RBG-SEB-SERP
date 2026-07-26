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
import { Big, formatMoney } from '$lib/money/money';
import { ageNearestBirthday, completedYearsBetween } from '$lib/dates/age';
import {
	isSerpParticipant,
	type Company,
	type Insured,
	type ModelSettings,
	type ParticipantResult,
	type Results
} from '$lib/domain';
import {
	averageFutureServiceYears,
	serpEarningsByYear,
	serpPensionForParticipant,
	type ParticipantPension,
	type SerpParticipantInput
} from './serp-pension';

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
	/** Gross SERP benefit payments this year (audit-trail column [5]). */
	grossBenefitPayments: Pending;
	/** Total pension cost − gross benefit payments (audit-trail column [6]). */
	annualUnfundedAccruedPensionCost: Pending;
	/** Cumulative annual unfunded accrued pension cost, end of year (audit-trail column [7]). */
	unfundedAccruedPensionCostEoy: Pending;
	/** Unrecognised prior service cost balance, beginning of year (audit-trail column [8]). */
	unrecognizedPriorServiceCostBoy: Pending;
	/** Unrecognised prior service cost balance, end of year = BOY − amortisation (column [9]). */
	unrecognizedPriorServiceCostEoy: Pending;
	/** Accumulated other comprehensive income balance, end of year (pre-tax benefit) — 6.x, not built. */
	aociEoy: Pending;

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
 * One plan year of the COLI asset accounting view, for ONE funding option — BUILT.
 *
 * Operator spec (2026-07-25): death is assumed at each participant's life expectancy; the annual
 * COLI earnings impact is **change in account value − premium**, plus the **death benefit** in the
 * life-expectancy year. The account value is **released at death** — in the LE year its change is
 * `0 − prior-year AV` — so lifetime earnings net to `death benefit − premiums` with no double
 * count of the account value (report 5.2 column [4]). Uses account value, not cash surrender value.
 *
 * All figures are per plan year, summed across the option's COLI policies. `premium` and
 * `deathProceeds` are stored as positive magnitudes; `accountValueChange` and `coliEarningsImpact`
 * are signed (income positive). Zero in a year with no cash flow; never null once built.
 */
export interface ColiAccountingYear {
	planYear: number;
	calendarYear: number;
	/** Premium paid into the policies this year (a positive magnitude; an expense in the formula). */
	premium: Pending;
	/** Change in account value this year — signed. Released to `0 − prior AV` in the death year. */
	accountValueChange: Pending;
	/** Death benefit received this year (positive), in each participant's life-expectancy year. */
	deathProceeds: Pending;
	/** COLI earnings impact = accountValueChange − premium + deathProceeds. Report 5.2 column [4]. */
	coliEarningsImpact: Pending;
	/**
	 * Combined earnings impact = net SERP [3] + COLI [4]. Report 5.2 column [5]. Still `null` — it
	 * needs the SERP pension side, which is not built yet.
	 */
	combinedEarningsImpact: Pending;
}

/**
 * One participant's reference-year pension expense, allocated for report 6.6. The columns are the
 * first plan year's figures (the sheet is titled for the plan reference year): service cost,
 * prior-service amortisation, interest accrual, their total, and the participant's share of the
 * consolidated total.
 */
export interface ParticipantPensionAllocation {
	insuredId: string;
	serviceCost: Pending;
	priorServiceCostAmortization: Pending;
	interestCost: Pending;
	/** Service + amortisation + interest for the reference year. */
	pensionExpense: Pending;
	/** Share as a fraction of the consolidated total (the 6.6 "% of total" column). */
	percentOfTotal: number | null;
}

/** The accounting module's output. Axis fields are real; monetary fields are pending the GAAP build. */
export interface AccountingResult {
	/**
	 * Build state. `'partial'` today: the COLI earnings side is built; the SERP pension side is
	 * still pending. Flips to `'complete'` once every section lands.
	 */
	status: 'not-built' | 'partial' | 'complete';
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

/** Per-plan-year COLI accumulator (full precision until the output boundary). */
interface ColiYearAccumulator {
	premium: Big;
	accountValueChange: Big;
	deathProceeds: Big;
}

/**
 * COLI earnings recognition per funding option (report 5.2 column [4]) — BUILT.
 *
 * Operator spec: assume death at each participant's life expectancy. For each COLI policy, walk
 * its illustration through the LE year and, per plan year, accumulate premium, change in account
 * value, and — in the LE year — the death benefit. The account value is **released at death**: in
 * the LE year its change is `0 − prior-year AV`, so the account value nets out and lifetime
 * earnings equal `death benefit − premiums` with no double count.
 *
 * The LE year and death benefit are keyed off `age === lifeExpectancy`, the same mapping the
 * report's Appendix C ledger and page 4.5 cash flow use, so the totals reconcile.
 *
 * A policy that never reaches its LE age in the stream (e.g. it lapsed earlier) contributes its
 * premiums and account-value changes but no death benefit — an honest loss, not a manufactured
 * gain.
 */
export function coliEarningsByOption(
	results: Results,
	census: Insured[],
	referenceYear: number,
	horizonPlanYears: number
): Record<string, ColiAccountingYear[]> {
	const lifeExpectancyById = new Map(census.map((i) => [i.id, i.lifeExpectancy]));
	const planYears = Array.from({ length: horizonPlanYears }, (_, i) => i + 1);

	// Gather every option id the run designed, so the result tracks the app's options.
	const optionIds = new Set<string>();
	for (const p of results.perParticipant) for (const id of Object.keys(p.designs ?? {})) optionIds.add(id);

	const out: Record<string, ColiAccountingYear[]> = {};
	for (const optionId of optionIds) {
		const byYear = new Map<number, ColiYearAccumulator>();
		const at = (planYear: number): ColiYearAccumulator => {
			let acc = byYear.get(planYear);
			if (!acc) {
				acc = { premium: new Big(0), accountValueChange: new Big(0), deathProceeds: new Big(0) };
				byYear.set(planYear, acc);
			}
			return acc;
		};

		for (const p of results.perParticipant) {
			accumulateColiPolicy(at, p, optionId, lifeExpectancyById.get(p.insuredId));
		}

		out[optionId] = planYears.map((planYear) => {
			const acc = byYear.get(planYear);
			const premium = acc?.premium ?? new Big(0);
			const accountValueChange = acc?.accountValueChange ?? new Big(0);
			const deathProceeds = acc?.deathProceeds ?? new Big(0);
			const earnings = accountValueChange.minus(premium).plus(deathProceeds);
			return {
				planYear,
				calendarYear: referenceYear + planYear - 1,
				premium: formatMoney(premium),
				accountValueChange: formatMoney(accountValueChange),
				deathProceeds: formatMoney(deathProceeds),
				coliEarningsImpact: formatMoney(earnings),
				// Needs the SERP net impact [3], which is not built yet.
				combinedEarningsImpact: null
			};
		});
	}
	return out;
}

/** Accumulate one participant's policy for one option into the per-year buckets (death at LE). */
function accumulateColiPolicy(
	at: (planYear: number) => ColiYearAccumulator,
	participant: ParticipantResult,
	optionId: string,
	lifeExpectancy: number | undefined
): void {
	const years = participant.designs?.[optionId]?.illustrationYears;
	if (!years || years.length === 0) return;

	// The death (life-expectancy) year, keyed by attained age — the same rule the report uses.
	const leRow = lifeExpectancy === undefined ? undefined : years.find((y) => y.age === lifeExpectancy);
	const lePlanYear = leRow?.policyYear;

	const ordered = [...years].sort((a, b) => a.policyYear - b.policyYear);
	let priorAccountValue = new Big(0);
	for (const year of ordered) {
		// Death is assumed at LE — the participant contributes nothing after that year.
		if (lePlanYear !== undefined && year.policyYear > lePlanYear) break;
		const isDeathYear = year.policyYear === lePlanYear;
		const accountValue = new Big(year.accountValue);
		// Released at death: the account value change is the full give-back of the prior balance.
		const change = isDeathYear ? new Big(0).minus(priorAccountValue) : accountValue.minus(priorAccountValue);

		const acc = at(year.policyYear);
		acc.premium = acc.premium.plus(new Big(year.premium));
		acc.accountValueChange = acc.accountValueChange.plus(change);
		if (isDeathYear && leRow) acc.deathProceeds = acc.deathProceeds.plus(new Big(leRow.deathBenefit));

		priorAccountValue = isDeathYear ? new Big(0) : accountValue;
	}
}

/**
 * Compute the accounting (GAAP) projection from a completed run — PARTIAL.
 *
 * The COLI earnings side is built (report 5.2 column [4]); the SERP pension side is still pending,
 * so its figures remain `null`. Returns the real plan-year/calendar-year axis, the life-of-program
 * horizon, and the per-participant allocation keys. Not wired to the report yet.
 */
export function computeAccounting(params: ComputeAccountingParams): AccountingResult {
	const { results, census, company, settings, refDate } = params;
	const referenceYear = Number(refDate.slice(0, 4));
	const horizonPlanYears = lifeOfProgramHorizon(results, census, refDate);
	const calendarYearOf = (planYear: number) => referenceYear + planYear - 1;

	// SERP pension side — BUILT. Assemble each participant's obligation, then roll it forward.
	const resultById = new Map(results.perParticipant.map((p) => [p.insuredId, p]));
	const serpParticipants: SerpParticipantInput[] = [];
	const pensionById: { insuredId: string; pension: ParticipantPension }[] = [];
	for (const insured of census.filter(isSerpParticipant)) {
		const result = resultById.get(insured.id);
		if (!result) continue;
		const currentAge = ageNearestBirthday(insured.dateOfBirth, refDate);
		const pension = serpPensionForParticipant({
			stream: result.benefitStream,
			discountRate: settings.npvDiscountRate,
			nra: insured.retirementAge,
			currentAge,
			pastServiceYears: Math.max(0, completedYearsBetween(insured.dateOfHire, refDate))
		});
		serpParticipants.push({ pension, currentAge, benefitStream: result.benefitStream });
		pensionById.push({ insuredId: insured.id, pension });
	}
	const avgFutureServiceYears = averageFutureServiceYears(serpParticipants.map((p) => p.pension));
	const serpRaw = serpEarningsByYear({
		participants: serpParticipants,
		avgFutureServiceYears,
		discountRate: settings.npvDiscountRate,
		taxRate: company.corporateTaxRate,
		horizonPlanYears
	});
	const serp: SerpAccountingYear[] = serpRaw.map((raw) => ({
		planYear: raw.planYear,
		calendarYear: calendarYearOf(raw.planYear),
		serviceCost: formatMoney(raw.serviceCost),
		interestCost: formatMoney(raw.interestCost),
		priorServiceCostAmortization: formatMoney(raw.priorServiceCostAmortization),
		pensionExpense: formatMoney(raw.pensionExpense),
		pboBoy: formatMoney(raw.pboBoy),
		pboEoy: formatMoney(raw.pboEoy),
		grossBenefitPayments: formatMoney(raw.grossBenefitPayments),
		annualUnfundedAccruedPensionCost: formatMoney(raw.annualUnfundedAccruedPensionCost),
		unfundedAccruedPensionCostEoy: formatMoney(raw.unfundedAccruedPensionCostEoy),
		unrecognizedPriorServiceCostBoy: formatMoney(raw.unrecognizedPriorServiceCostBoy),
		unrecognizedPriorServiceCostEoy: formatMoney(raw.unrecognizedPriorServiceCostEoy),
		// AOCI balance and the deferred tax asset balance are 6.x items not yet specced — left null.
		aociEoy: null,
		benefitTaxDeduction: formatMoney(raw.benefitTaxDeduction),
		deferredTaxAssetEoy: null,
		netSerpEarningsImpact: formatMoney(raw.netSerpEarningsImpact)
	}));

	// COLI earnings side — BUILT (report 5.2 column [4]). One series per option the run designed.
	const coliByOption = coliEarningsByOption(results, census, referenceYear, horizonPlanYears);

	// Combined earnings impact [5] = net SERP [3] + COLI [4], per option per plan year.
	const netSerpByPlanYear = new Map(serpRaw.map((r) => [r.planYear, r.netSerpEarningsImpact]));
	for (const optionId of Object.keys(coliByOption)) {
		coliByOption[optionId] = coliByOption[optionId].map((year) => ({
			...year,
			combinedEarningsImpact: formatMoney(
				(netSerpByPlanYear.get(year.planYear) ?? new Big(0)).plus(new Big(year.coliEarningsImpact ?? '0'))
			)
		}));
	}

	// 6.6 allocates the reference-year (plan year 1) pension expense across SERP participants. Each
	// participant's year-1 figures: service cost, prior-service amortisation, and interest on the
	// opening PBO (which is their prior service cost), then the share of the consolidated total.
	const allocations = pensionById.map(({ insuredId, pension }) => {
		const serviceCost = pension.futureServiceYears >= 1 ? pension.annualServiceCost : new Big(0);
		const levelAmort =
			avgFutureServiceYears > 0 ? pension.priorServiceCost.div(avgFutureServiceYears) : new Big(0);
		const amort = levelAmort.gt(pension.priorServiceCost) ? pension.priorServiceCost : levelAmort;
		const interestCost = pension.priorServiceCost.times(settings.npvDiscountRate);
		const total = serviceCost.plus(amort).plus(interestCost);
		return { insuredId, serviceCost, amort, interestCost, total };
	});
	const allocationTotal = allocations.reduce((sum, a) => sum.plus(a.total), new Big(0));
	const byParticipant: ParticipantPensionAllocation[] = allocations.map((a) => ({
		insuredId: a.insuredId,
		serviceCost: formatMoney(a.serviceCost),
		priorServiceCostAmortization: formatMoney(a.amort),
		interestCost: formatMoney(a.interestCost),
		pensionExpense: formatMoney(a.total),
		percentOfTotal: allocationTotal.eq(0) ? null : a.total.div(allocationTotal).toNumber()
	}));

	return { status: 'partial', referenceYear, horizonPlanYears, serp, coliByOption, byParticipant };
}
