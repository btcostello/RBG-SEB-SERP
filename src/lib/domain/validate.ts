/**
 * Field-level validation helper (AR4).
 *
 * Runs a Valibot schema and flattens any issues into a `{ fieldName: message }` map keyed by
 * the top-level path, so forms can surface a specific message under each invalid field.
 */
import * as v from 'valibot';

export type FieldErrors = Record<string, string>;

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
