/**
 * Shared domain value-object schemas (Valibot).
 *
 * These wrap the money and date utilities in field-level validators so every domain schema
 * draws on one source of truth for "what is a valid money string / ISO date / rate".
 * Types are derived via `v.InferOutput` — never hand-written in parallel (AR4).
 */
import * as v from 'valibot';
import { isMoneyString } from '$lib/money/money';
import { isValidIsoDate } from '$lib/dates/age';

/**
 * Money as a decimal string (AR2). Money is NEVER a JS `number` outside the engine, so all
 * domain monetary fields use this schema and serialize as strings (e.g. "162240.00").
 */
export const MoneyStringSchema = v.pipe(
	v.string(),
	v.nonEmpty('A monetary value is required'),
	v.check(isMoneyString, 'Must be a valid decimal amount (e.g. "162240.00")')
);
export type MoneyString = v.InferOutput<typeof MoneyStringSchema>;

/** Date-only ISO string `YYYY-MM-DD` (AR3). All age math goes through the date utility. */
export const IsoDateSchema = v.pipe(
	v.string(),
	v.check(isValidIsoDate, 'Must be a valid date (YYYY-MM-DD)')
);
export type IsoDate = v.InferOutput<typeof IsoDateSchema>;

/**
 * A rate/ratio in the closed interval [0, 1] (e.g. corporate tax rate, discount rate).
 * Rates are plain numbers — they are not money.
 */
export const RateSchema = v.pipe(
	v.number(),
	v.minValue(0, 'Must be at least 0'),
	v.maxValue(1, 'Must be at most 1')
);
export type Rate = v.InferOutput<typeof RateSchema>;

/** A non-negative rate with no upper bound (e.g. salary growth rate). */
export const NonNegativeRateSchema = v.pipe(v.number(), v.minValue(0, 'Must be at least 0'));

/** A non-negative integer count of years (e.g. waiting period, averaging period). */
export const YearCountSchema = v.pipe(
	v.number(),
	v.integer('Must be a whole number of years'),
	v.minValue(0, 'Must be at least 0')
);

/** A plausible human age in whole years (0–120). */
export const AgeSchema = v.pipe(
	v.number(),
	v.integer('Age must be a whole number'),
	v.minValue(0, 'Age must be at least 0'),
	v.maxValue(120, 'Age must be at most 120')
);
