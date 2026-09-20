/**
 * Expected (survival-weighted) benefit stream — the basis the pension obligation is valued on.
 *
 * The liability module produces a **certain** stream: payments from the first payment age through
 * the participant's entered life expectancy, as if that age were a fact. That is the right basis
 * for the demonstration pages, where one clear death age is easier to follow than a distribution.
 * It is the wrong basis for ASC 715, where the projected benefit obligation is by definition an
 * *actuarial* present value — probability-weighted.
 *
 * This module produces the other stream. Both exist; neither replaces the other.
 *
 * ## What is weighted, and what is not
 *
 * Three things are paid, and they are weighted differently:
 *
 * - **Guaranteed payments.** A period-certain is paid whether or not the participant lives, so
 *   inside it the only uncertainty is whether benefits commenced at all. Those years carry the
 *   probability of reaching the first payment age, and nothing more.
 * - **Life-contingent payments.** After the guarantee, a payment is made only if the participant is
 *   alive to receive it, so it carries the probability of surviving to that age.
 * - **The survivor benefit.** Dying before retirement is not the absence of a benefit — the plan
 *   pays the beneficiary instead. That payment is weighted by the probability of dying *in that
 *   year*: alive at its start, dead by its end. Leaving this branch out would weight away the
 *   retirement benefit while paying nothing in its place, understating the obligation.
 *
 * ## Why the stream runs past life expectancy
 *
 * The certain stream stops at the entered life expectancy. Weighting a stream that already stops
 * there would just shrink a truncated stream — the tail, where a participant outlives their life
 * expectancy and keeps drawing, would be missing entirely. So the retirement payments are
 * regenerated out to the mortality table's terminal age before weighting, which is what makes this
 * a re-derivation rather than a multiplication.
 *
 * ## What this is not
 *
 * Deaths are treated as falling at year end: a payment due during a year is made if the participant
 * was alive at its start. That is the same whole-year convention the rest of the mortality module
 * uses, and it is deliberate — see `life-table.ts`.
 */
import { Big } from '$lib/money/money';
import { benefitStream, type BenefitYear } from './benefit-stream';
import type { SurvivorYear } from './survivor-benefit';

/** Annual probability of death at an attained age. `null` where the table says nothing. */
export type MortalityLookup = (age: number) => number | null;

export interface ExpectedBenefitParams {
	/** Level annual benefit in the first payment year, before COLA. */
	annualBenefit: Big;
	/** Attained age at the valuation date. */
	currentAge: number;
	/** Normal retirement age — also where the pre-retirement survivor benefit ends. */
	retirementAge: number;
	/** Years after retirement before the first payment (0 = at retirement). */
	benefitWaitingPeriod: number;
	/** Annual COLA escalation as a fraction. */
	colaScale?: number;
	/** Guaranteed number of payments once benefits commence — paid whether or not the life does. */
	guaranteedYears?: number;
	/** Cap on the number of payments, if the plan has one. */
	maxBenefitYears?: number;
	/**
	 * Pre-retirement survivor benefit by age of death — the total payable to the beneficiary for a
	 * death in that year, already collapsed from the durational schedule. Empty for a participant
	 * with no survivor benefit, or already at retirement age.
	 */
	survivorStream?: readonly SurvivorYear[];
	/** Annual mortality at each attained age. */
	mortality: MortalityLookup;
	/** Last age the table covers — the stream runs to here. */
	terminalAge: number;
}

/**
 * The expected benefit payable at each attained age, from the valuation age to the terminal age.
 *
 * Years with nothing payable are omitted, so the stream stays the same shape the accounting module
 * already consumes. Amounts are full-precision `Big`.
 *
 * Throws if the mortality table cannot cover the span, rather than treating a missing rate as
 * certain survival — silently assuming nobody dies is the dangerous direction.
 */
export function expectedBenefitStream(params: ExpectedBenefitParams): BenefitYear[] {
	const {
		annualBenefit,
		currentAge,
		retirementAge,
		benefitWaitingPeriod,
		colaScale = 0,
		guaranteedYears = 0,
		maxBenefitYears,
		survivorStream = [],
		mortality,
		terminalAge
	} = params;

	// Survival from the valuation age to the start of each age's year. Index by attained age.
	const survival = survivalByAge(currentAge, terminalAge, mortality);

	// The retirement payments as if the participant lived to the table's end — the certain stream
	// regenerated past life expectancy, so the tail exists to be weighted.
	const lifetime = benefitStream({
		annualBenefit,
		retirementAge,
		benefitWaitingPeriod,
		assumedDeathBenefitAge: terminalAge,
		colaScale,
		maxBenefitYears
	});

	const firstPaymentAge = retirementAge + benefitWaitingPeriod;
	// Reaching the first payment age is what commences benefits; the guarantee cannot start them.
	const reachedCommencement = survival.get(firstPaymentAge) ?? new Big(0);
	const lastGuaranteedAge = firstPaymentAge + guaranteedYears - 1;

	const byAge = new Map<number, Big>();
	const add = (age: number, amount: Big) => {
		if (amount.eq(0)) return;
		byAge.set(age, (byAge.get(age) ?? new Big(0)).plus(amount));
	};

	for (const payment of lifetime) {
		const weight =
			payment.age <= lastGuaranteedAge
				? reachedCommencement
				: (survival.get(payment.age) ?? new Big(0));
		add(payment.age, payment.amount.times(weight));
	}

	for (const year of survivorStream) {
		// Paid on a death during this year: alive at its start, dead by its end.
		const alive = survival.get(year.age);
		const q = mortality(year.age);
		if (alive === undefined || q === null) continue;
		add(year.age, year.amount.times(alive).times(q));
	}

	return [...byAge.entries()].sort((a, b) => a[0] - b[0]).map(([age, amount]) => ({ age, amount }));
}

/**
 * Probability of surviving from `fromAge` to the start of each age's year, for every age in range.
 *
 * The valuation age itself is certain (the participant is alive to be valued), and each later age
 * compounds one more year of survival.
 */
function survivalByAge(
	fromAge: number,
	terminalAge: number,
	mortality: MortalityLookup
): Map<number, Big> {
	const out = new Map<number, Big>();
	let alive = new Big(1);
	for (let age = fromAge; age <= terminalAge; age++) {
		out.set(age, alive);
		const q = mortality(age);
		if (q === null) {
			throw new Error(
				`expectedBenefitStream: no mortality rate at age ${age}; the table does not cover ` +
					`the span ${fromAge}-${terminalAge}`
			);
		}
		alive = alive.times(new Big(1).minus(q));
	}
	return out;
}

/**
 * Probability that a participant aged `currentAge` is still alive at `atAge` — the figure the 5.2
 * footnote quotes, and the one a reader checks a weighted column against.
 *
 * Returns 1 for an age already reached. Throws on a span the table cannot cover, like the stream.
 */
export function survivalTo(currentAge: number, atAge: number, mortality: MortalityLookup): Big {
	if (atAge <= currentAge) return new Big(1);
	return survivalByAge(currentAge, atAge, mortality).get(atAge) ?? new Big(0);
}
