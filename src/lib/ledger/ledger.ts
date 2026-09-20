/**
 * Policy ledgers — the year-by-year illustrated values behind a funding option.
 *
 * A run stores each designed policy's full per-policy-year stream on
 * `ParticipantResult.designs[strategyId].illustrationYears`. This module turns those streams into
 * ledger rows: one policy at a time, or the whole census combined into a composite for an option.
 *
 * Pure and side-effect free — no Svelte, no stores. It reads a `Results` snapshot, so it works on a
 * reopened quote exactly as it does on a fresh run.
 *
 * ## Two things about the composite worth understanding before reading one
 *
 * 1. **Policies are summed by policy year, not by age.** Every policy in a quote is issued at the
 *    same time, so policy year 5 is the same calendar year for everybody — but the lives are
 *    different ages in it. A composite therefore has no single attained age, and `age` is null.
 * 2. **Policies drop out as they lapse**, and the streams are different lengths because of it. A
 *    year past a policy's lapse contributes nothing, so the composite's death benefit *falls* in
 *    that year. That is the design, not a gap in the data — `policyCount` on each row records how
 *    many policies were still illustrating, so a page can show the fall for what it is.
 */
import { Big, formatMoney } from '$lib/money/money';
import type { ParticipantDesign, ParticipantResult, Results } from '$lib/domain';

/** Subject id standing for "every policy in this option, combined". */
export const COMPOSITE_ID = '__composite__';

/** One year of a ledger. Money stays in canonical decimal strings. */
export interface LedgerRow {
	policyYear: number;
	/** Attained age. Null on a composite, where the lives are different ages in the same year. */
	age: number | null;
	premium: string;
	accountValue: string;
	cashSurrenderValue: string;
	/**
	 * Death benefit **gross of any loan**. A policy carrying a loan pays this less the outstanding
	 * balance, so read it against `loanBalance` rather than on its own.
	 */
	deathBenefit: string;
	/** Cash taken out as a withdrawal this year — a return of basis while basis lasts. */
	withdrawal: string;
	/** Cash taken out as a policy loan this year, after withdrawals have exhausted basis. */
	loan: string;
	/** Outstanding loan balance at year end. A running balance, not a flow — do not total it. */
	loanBalance: string;
	/**
	 * Death benefit net of the outstanding loan — what the company actually collects, since the
	 * insurer repays the loan out of the proceeds.
	 *
	 * This is the engine's own `net_death_benefit` metric, which is defined as
	 * `death_benefit − eoy_loan_balance` (see `report-data.cashFlowForOption`, which uses the same
	 * quantity for the life-of-plan cash flow). Equal to the gross figure on a policy with no loan.
	 */
	netDeathBenefit: string;
	/** How many policies contributed. Always 1 for an individual ledger. */
	policyCount: number;
}

/** Something a ledger can be shown for: one participant, or the composite. */
export interface LedgerSubject {
	id: string;
	label: string;
	isComposite: boolean;
}

/**
 * Column totals. Only the flow columns sum meaningfully down the years — premium in, withdrawals
 * and loans out. `loanBalance` is a running balance and has no total.
 */
export interface LedgerTotals {
	/** Every premium paid across the illustrated life of the policy or policies. */
	totalPremium: string;
	/** Every withdrawal taken. */
	totalWithdrawal: string;
	/** Every loan taken. */
	totalLoan: string;
	/** Withdrawals plus loans — the cash the policy handed back. */
	totalDistribution: string;
	/** Years the ledger covers. */
	years: number;
	/** Highest policy count seen in any year — the number of policies in a composite. */
	policyCount: number;
}

/**
 * The design a participant holds for one funding option, or undefined when they have none.
 *
 * Not every participant carries every option: a COLI-only participant is designed for Option 1
 * alone, because Options 2-4 exist to distribute a SERP benefit they do not have. Callers must
 * handle the gap rather than assume a design exists.
 */
export function designFor(
	participant: ParticipantResult,
	strategyId: string
): ParticipantDesign | undefined {
	return participant.designs?.[strategyId];
}

/** Ledger rows for one designed policy. Empty when the design carries no illustration stream. */
export function participantLedger(design: ParticipantDesign | undefined): LedgerRow[] {
	if (!design?.illustrationYears) return [];
	return design.illustrationYears.map((year) => ({
		policyYear: year.policyYear,
		age: year.age,
		premium: year.premium,
		accountValue: year.accountValue,
		cashSurrenderValue: year.cashSurrenderValue,
		deathBenefit: year.deathBenefit,
		// The loan fields arrived after the first persisted snapshots and are optional on the wire,
		// so an older quote reopens with no distribution data rather than failing to validate.
		withdrawal: year.withdrawal ?? '0.00',
		loan: year.loan ?? '0.00',
		loanBalance: year.loanBalance ?? '0.00',
		netDeathBenefit: netOfLoan(year.deathBenefit, year.loanBalance),
		policyCount: 1
	}));
}

/**
 * Ledger rows for every policy designed under one funding option, summed by policy year.
 *
 * Runs to the longest stream: a policy that lapsed earlier simply stops contributing, so both the
 * totals and `policyCount` step down in the year it drops out.
 */
export function compositeLedger(designs: readonly (ParticipantDesign | undefined)[]): LedgerRow[] {
	// Built from the single-policy ledgers so both paths share one field mapping — and one set of
	// defaults for the optional loan fields.
	const ledgers = designs.map(participantLedger).filter((rows) => rows.length > 0);
	if (ledgers.length === 0) return [];

	const byYear = new Map<number, LedgerRow>();
	for (const rows of ledgers) {
		for (const row of rows) {
			const running = byYear.get(row.policyYear);
			if (running === undefined) {
				// A composite spans several lives, so it has no single attained age.
				byYear.set(row.policyYear, { ...row, age: null });
				continue;
			}
			byYear.set(row.policyYear, {
				...running,
				premium: add(running.premium, row.premium),
				accountValue: add(running.accountValue, row.accountValue),
				cashSurrenderValue: add(running.cashSurrenderValue, row.cashSurrenderValue),
				deathBenefit: add(running.deathBenefit, row.deathBenefit),
				withdrawal: add(running.withdrawal, row.withdrawal),
				loan: add(running.loan, row.loan),
				loanBalance: add(running.loanBalance, row.loanBalance),
				// Summed from the per-policy nets rather than recomputed off the composite totals, so
				// a policy whose loan exceeds its own death benefit cannot eat into another's proceeds.
				netDeathBenefit: add(running.netDeathBenefit, row.netDeathBenefit),
				policyCount: running.policyCount + 1
			});
		}
	}

	return [...byYear.values()].sort((a, b) => a.policyYear - b.policyYear);
}

/** Totals for a set of ledger rows. */
export function ledgerTotals(rows: readonly LedgerRow[]): LedgerTotals {
	const total = (pick: (row: LedgerRow) => string): string =>
		rows.reduce((sum, row) => add(sum, pick(row)), '0.00');
	const totalWithdrawal = total((row) => row.withdrawal);
	const totalLoan = total((row) => row.loan);
	return {
		totalPremium: total((row) => row.premium),
		totalWithdrawal,
		totalLoan,
		totalDistribution: add(totalWithdrawal, totalLoan),
		years: rows.length,
		policyCount: rows.reduce((max, row) => Math.max(max, row.policyCount), 0)
	};
}

/**
 * Whether a ledger has any distribution activity at all — the test for showing the withdrawal,
 * loan and loan-balance columns.
 *
 * Asked of the rows rather than of the funding option, so it stays true to the data: Options 2 and
 * 4 distribute the SERP benefit out of the policy and Options 1 and 3 do not, but an option that
 * happens to distribute nothing should not carry three columns of zeros, and a future option that
 * distributes gets the columns without a change here.
 */
export function hasDistributions(rows: readonly LedgerRow[]): boolean {
	return rows.some(
		(row) => !isZero(row.withdrawal) || !isZero(row.loan) || !isZero(row.loanBalance)
	);
}

function isZero(value: string): boolean {
	return new Big(value).eq(0);
}

/**
 * Death benefit less the outstanding loan, floored at zero.
 *
 * The floor matches the engine, which reports a `net_death_benefit` of 0 rather than a negative
 * once a contract is gone. Inside an in-force stream the loan never exceeds the death benefit, so
 * the floor should not bind — it is there so a bad stream shows nothing collectable rather than a
 * negative figure that would quietly subtract from a composite.
 */
function netOfLoan(deathBenefit: string, loanBalance: string | undefined): string {
	const net = new Big(deathBenefit).minus(new Big(loanBalance ?? '0'));
	return formatMoney(net.lt(0) ? new Big(0) : net);
}

/**
 * The subjects a funding option can be shown for — the composite first, then every participant
 * designed under it, in census order.
 *
 * `nameFor` supplies the display name, so this module never reaches into the census itself.
 */
export function subjectsFor(
	results: Results,
	strategyId: string,
	nameFor: (insuredId: string) => string
): LedgerSubject[] {
	const designed = results.perParticipant.filter(
		(participant) => designFor(participant, strategyId)?.illustrationYears?.length
	);
	if (designed.length === 0) return [];

	const individuals = designed.map((participant) => ({
		id: participant.insuredId,
		label: nameFor(participant.insuredId),
		isComposite: false
	}));
	// One policy is its own composite, so offering both would be two names for one ledger.
	if (individuals.length === 1) return individuals;
	return [
		{ id: COMPOSITE_ID, label: 'Composite — all policies', isComposite: true },
		...individuals
	];
}

/** Ledger rows for a subject: the composite, or one participant. Empty when nothing is designed. */
export function ledgerFor(results: Results, strategyId: string, subjectId: string): LedgerRow[] {
	if (subjectId === COMPOSITE_ID) {
		return compositeLedger(results.perParticipant.map((p) => designFor(p, strategyId)));
	}
	const participant = results.perParticipant.find((p) => p.insuredId === subjectId);
	return participant ? participantLedger(designFor(participant, strategyId)) : [];
}

/** Whether any policy at all is designed under a funding option. */
export function hasDesigns(results: Results, strategyId: string): boolean {
	return results.perParticipant.some(
		(participant) => designFor(participant, strategyId)?.illustrationYears?.length
	);
}

function add(a: string, b: string): string {
	return formatMoney(new Big(a).plus(new Big(b)));
}
