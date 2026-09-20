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
	deathBenefit: string;
	/** How many policies contributed. Always 1 for an individual ledger. */
	policyCount: number;
}

/** Something a ledger can be shown for: one participant, or the composite. */
export interface LedgerSubject {
	id: string;
	label: string;
	isComposite: boolean;
}

/** Column totals — only the flow column (premium) sums meaningfully down the years. */
export interface LedgerTotals {
	/** Every premium paid across the illustrated life of the policy or policies. */
	totalPremium: string;
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
	const streams = designs
		.map((design) => design?.illustrationYears)
		.filter((years): years is NonNullable<typeof years> => years !== undefined && years.length > 0);
	if (streams.length === 0) return [];

	const byYear = new Map<number, LedgerRow>();
	for (const stream of streams) {
		for (const year of stream) {
			const running = byYear.get(year.policyYear);
			if (running === undefined) {
				byYear.set(year.policyYear, {
					policyYear: year.policyYear,
					age: null,
					premium: year.premium,
					accountValue: year.accountValue,
					cashSurrenderValue: year.cashSurrenderValue,
					deathBenefit: year.deathBenefit,
					policyCount: 1
				});
				continue;
			}
			byYear.set(year.policyYear, {
				...running,
				premium: add(running.premium, year.premium),
				accountValue: add(running.accountValue, year.accountValue),
				cashSurrenderValue: add(running.cashSurrenderValue, year.cashSurrenderValue),
				deathBenefit: add(running.deathBenefit, year.deathBenefit),
				policyCount: running.policyCount + 1
			});
		}
	}

	return [...byYear.values()].sort((a, b) => a.policyYear - b.policyYear);
}

/** Totals for a set of ledger rows. */
export function ledgerTotals(rows: readonly LedgerRow[]): LedgerTotals {
	return {
		totalPremium: rows.reduce((sum, row) => add(sum, row.premium), '0.00'),
		years: rows.length,
		policyCount: rows.reduce((max, row) => Math.max(max, row.policyCount), 0)
	};
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
