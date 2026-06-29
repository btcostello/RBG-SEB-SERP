/**
 * Centralized money module (AR2, NFR3, NFR5).
 *
 * Every monetary value in the system flows through here. The rules, enforced once:
 *   - Money is a `Big` instance during calculation; it is NEVER a JS `number` (floats drift).
 *   - A single, documented rounding policy: HALF-UP (round half away from zero).
 *   - Money serializes to / parses from decimal strings (e.g. "162240.00") with no loss.
 *   - The engine never rounds mid-calculation; rounding happens only at output boundaries
 *     via {@link roundToCents} / {@link formatMoney}.
 *
 * `Big.DP` is the precision used for division; it is intentionally high so intermediate
 * results (salary projection, NPV discounting) keep full precision until a deliberate
 * rounding step.
 */
import Big from 'big.js';

// Single documented rounding mode for the whole app: half-up (round half away from zero).
// big.js exposes this as `Big.roundHalfUp` (value 1).
Big.RM = Big.roundHalfUp;

// Division precision. High enough that intermediate calc never loses cents prematurely (NFR5).
Big.DP = 20;

/** A monetary amount. Always a `Big`, never a JS `number`, outside of display formatting. */
export type Money = Big;

/** Number of decimal places money is rounded to at output boundaries (cents). */
export const MONEY_DECIMAL_PLACES = 2;

/** Zero money constant. */
export const ZERO: Money = new Big(0);

/**
 * Create a `Big` money value from a decimal string (preferred), number, or existing `Big`.
 * Throws if the input is not a valid number — callers handling user input should validate
 * with {@link isMoneyString} first (or via the domain Valibot schema).
 */
export function money(value: string | number | Big): Money {
	return new Big(value);
}

/**
 * Parse a decimal money string into a `Big`. Strict: throws on malformed input.
 * Use at the persistence/input boundary when reconstructing money from stored strings.
 */
export function parseMoney(value: string): Money {
	return new Big(value);
}

/**
 * Serialize money to its canonical, lossless decimal string for storage/JSON (AR18).
 * `Big.toString()` is exact, so {@link parseMoney}(serializeMoney(x)) reproduces x exactly.
 */
export function serializeMoney(value: Money): string {
	return value.toString();
}

/**
 * Format money for display as a fixed-decimal string (default: cents, e.g. "162240.00").
 * Rounds using the centralized half-up policy.
 */
export function formatMoney(value: Money, decimalPlaces: number = MONEY_DECIMAL_PLACES): string {
	return value.toFixed(decimalPlaces);
}

/** Round money to cents using the centralized half-up policy. Returns a `Big`. */
export function roundToCents(value: Money): Money {
	return value.round(MONEY_DECIMAL_PLACES, Big.roundHalfUp);
}

/** Convert money to an integer number of cents (half-up). For exact equality checks/tests. */
export function toCents(value: Money): number {
	return Number(value.times(100).round(0, Big.roundHalfUp).toString());
}

/**
 * Predicate: is `value` a string that parses as a valid decimal number?
 * Kept free of Valibot so the money module has a single dependency (big.js); the domain
 * layer wraps this in a Valibot schema (`MoneyStringSchema`).
 */
export function isMoneyString(value: string): boolean {
	try {
		new Big(value);
		return true;
	} catch {
		return false;
	}
}

export { Big };
