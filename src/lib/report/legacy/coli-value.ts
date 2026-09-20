/**
 * Hypothetical Value of COLI (report Appendix F).
 *
 * The page answers one question a CFO asks about the asset side: *what do we get back?* It shows
 * the policy values building year by year, the annual charge or credit to earnings, the year the
 * programme turns accretive, and what the whole thing returns over its life.
 *
 * Every figure comes from the persisted illustration streams for one funding option, so it needs no
 * new engine work — `compositeLedger` already sums an option's policies by policy year.
 *
 * ## Definitions, which are worth being exact about
 *
 * - **CSV + Proceeds** — the option's cash surrender value at the end of the year, plus every death
 *   benefit received up to that point. It is what the programme is worth to the company at that
 *   moment: what could be surrendered plus what has already been collected.
 * - **After-tax earnings** — the year's charge or credit to earnings: the movement in surrender
 *   value, less the premium paid, plus any death proceeds received. It is labelled after-tax
 *   because there is no tax to apply — under ASC 740-10 no deferred tax is provided on the inside
 *   build-up of a policy the company intends to hold to maturity, and death proceeds are received
 *   free of tax. Premiums are not deductible, which is why the early years are a charge.
 * - **Accretive from year N** — the first year the annual figure is positive. Early durations are
 *   negative because the premium exceeds the surrender value it buys; the policy has to work
 *   through its acquisition charges first.
 * - **Total return** — CSV + proceeds at the end of the illustration.
 * - **Total gain** — total return less every premium paid. What the programme returned above what
 *   it cost.
 *
 * ## Why the year rows thin out
 *
 * The source shows years 1-10 and then every fifth year to 30, plus an "Ultimate" row for the end
 * of the illustration. Early years are where the shape is — the dip and the crossover — and after
 * that the reader only needs the trend.
 */
import { Big, formatMoneyDisplay } from '$lib/money/money';
import { compositeLedger, type LedgerRow } from '$lib/ledger/ledger';
import type { ParticipantDesign, Results } from '$lib/domain';

/** One row of the value table. */
export interface ColiValueRow {
	/** "1" … "30", or "Ultimate" for the final row. */
	label: string;
	/** Policy year this row reports, so a caller can line it up with a ledger. */
	policyYear: number;
	/** Surrender value plus death proceeds received to date, whole dollars. */
	csvPlusProceeds: string;
	/** The year's charge (parenthesised) or credit to earnings, whole dollars. */
	afterTaxEarnings: string;
}

/** Everything Appendix F renders for one funding option. */
export interface ColiValueDisplay {
	rows: ColiValueRow[];
	/** Cumulative earnings impact per policy year, for the chart. Index 0 is year 1. */
	cumulativeEarnings: number[];
	/** Years the chart spans. */
	years: number;
	/** Level annual premium — the first year's, which is the level amount while premiums are paid. */
	levelAnnualPremium: string;
	/** Total return: CSV + proceeds at the end of the illustration. */
	totalReturn: string;
	/** Total gain: total return less every premium paid. */
	totalGain: string;
	/** First policy year the annual earnings figure is positive, or null if it never is. */
	accretiveFromYear: number | null;
}

/** Whole dollars, charges in parentheses — the report's convention. */
function display(value: Big): string {
	return value.lt(0) ? `(${formatMoneyDisplay(value.abs(), 0)})` : formatMoneyDisplay(value, 0);
}

/** The years the table reports: every year to 10, then each fifth to 30, then the last. */
function reportedYears(lastYear: number): number[] {
	const wanted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30].filter((y) => y < lastYear);
	return [...wanted, lastYear];
}

/**
 * Build Appendix F for one funding option, or null when that option designed nothing.
 *
 * `deathProceedsByPlanYear` comes from the accounting module, which assumes each participant dies
 * at their life expectancy. Policy year and plan year are the same thing here: every policy is
 * issued at plan start.
 */
export function coliValueForOption(
	results: Results,
	strategyId: string,
	deathProceedsByPlanYear: readonly Big[]
): ColiValueDisplay | null {
	const ledger: LedgerRow[] = compositeLedger(
		results.perParticipant.map(
			(participant) => participant.designs?.[strategyId] as ParticipantDesign | undefined
		)
	);
	if (ledger.length === 0) return null;

	let cumulativePremium = new Big(0);
	let cumulativeProceeds = new Big(0);
	let cumulativeEarningsRunning = new Big(0);
	let priorCsv = new Big(0);

	const csvPlusProceeds: Big[] = [];
	const annualEarnings: Big[] = [];
	const cumulativeEarnings: number[] = [];

	for (const [index, row] of ledger.entries()) {
		const csv = new Big(row.cashSurrenderValue);
		const premium = new Big(row.premium);
		const proceeds = deathProceedsByPlanYear[index] ?? new Big(0);

		cumulativePremium = cumulativePremium.plus(premium);
		cumulativeProceeds = cumulativeProceeds.plus(proceeds);

		// The year's credit or charge: what the policy gained, less what was paid in, plus what was
		// collected on a death.
		const earnings = csv.minus(priorCsv).minus(premium).plus(proceeds);
		cumulativeEarningsRunning = cumulativeEarningsRunning.plus(earnings);

		csvPlusProceeds.push(csv.plus(cumulativeProceeds));
		annualEarnings.push(earnings);
		cumulativeEarnings.push(cumulativeEarningsRunning.toNumber());
		priorCsv = csv;
	}

	const lastYear = ledger.length;
	const totalReturn = csvPlusProceeds[lastYear - 1];
	const accretive = annualEarnings.findIndex((value) => value.gt(0));

	const rows = reportedYears(lastYear).map((year) => ({
		label: year === lastYear ? 'Ultimate' : String(year),
		policyYear: year,
		csvPlusProceeds: display(csvPlusProceeds[year - 1]),
		// The final row reports the programme's whole gain rather than one year's movement — the
		// source's "Ultimate" row is an end state, not an annual figure.
		afterTaxEarnings: display(
			year === lastYear ? totalReturn.minus(cumulativePremium) : annualEarnings[year - 1]
		)
	}));

	return {
		rows,
		cumulativeEarnings,
		years: lastYear,
		levelAnnualPremium: display(new Big(ledger[0].premium)),
		totalReturn: display(totalReturn),
		totalGain: display(totalReturn.minus(cumulativePremium)),
		accretiveFromYear: accretive === -1 ? null : accretive + 1
	};
}
