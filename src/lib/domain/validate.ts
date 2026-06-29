/**
 * Field-level validation helper (AR4).
 *
 * Runs a Valibot schema and flattens any issues into a `{ fieldName: message }` map keyed by
 * the top-level path, so forms can surface a specific message under each invalid field.
 */
import * as v from 'valibot';

export type FieldErrors = Record<string, string>;

/**
 * Coerce a raw form-input value to a number for schema validation, returning `NaN` for
 * empty/blank input so it fails validation rather than silently becoming 0.
 *
 * Svelte's `bind:value` on `<input type="number">` yields a `number` (or `null` when empty),
 * while text inputs yield a `string`. This accepts both so callers never assume one shape
 * (calling `.trim()` on a number throws).
 */
export function toNumberOrNaN(value: string | number | null | undefined): number {
	if (value === null || value === undefined) return Number.NaN;
	if (typeof value === 'string' && value.trim() === '') return Number.NaN;
	return Number(value);
}

/**
 * Validate `input` against `schema` and return a map of field path → first error message.
 * An empty map means the input is valid. `abortPipeEarly` keeps one message per field.
 */
export function fieldErrors<TSchema extends v.GenericSchema>(
	schema: TSchema,
	input: unknown
): FieldErrors {
	const result = v.safeParse(schema, input, { abortPipeEarly: true });
	const errors: FieldErrors = {};
	if (!result.success) {
		for (const issue of result.issues) {
			const key = issue.path?.map((segment) => String(segment.key)).join('.') ?? '';
			// Top-level field with no path (e.g. a whole-object issue) is keyed as '_'.
			const field = key === '' ? '_' : key;
			if (!(field in errors)) errors[field] = issue.message;
		}
	}
	return errors;
}
