/**
 * Quote — the aggregate root (AR5).
 *
 * A single serializable JSON object: Company + ModelSettings + Census (Insured[]) + a
 * computed Results snapshot, plus a `schemaVersion` for forward migration (AR5, FR33).
 * Everything needed to reopen a proposal identically lives here; there is no money as a JS
 * `number` and no `snake_case` anywhere in this type.
 */
import * as v from 'valibot';
import { CompanySchema } from './company';
import { ModelSettingsSchema, DEFAULT_MODEL_SETTINGS } from './model-settings';
import { InsuredSchema } from './insured';
import { ResultsSchema } from './results';

/** Current persisted Quote schema version. Bump when the shape changes (migration seam). */
export const SCHEMA_VERSION = 1;

export const QuoteSchema = v.object({
	schemaVersion: v.literal(SCHEMA_VERSION),
	/** Stable identifier / storage key (one quote per prospect company). */
	id: v.pipe(v.string(), v.nonEmpty()),
	company: CompanySchema,
	modelSettings: ModelSettingsSchema,
	/** The executive census. */
	census: v.array(InsuredSchema),
	/** Computed results snapshot; `null` until a run computes it. */
	results: v.nullable(ResultsSchema)
});

export type Quote = v.InferOutput<typeof QuoteSchema>;

/**
 * Build a new, empty quote for a prospect company with documented default settings (FR1, FR3).
 * The census starts empty and results are `null` until a run is performed.
 */
export function createQuote(params: {
	id: string;
	companyName: string;
	corporateTaxRate: number;
}): Quote {
	return {
		schemaVersion: SCHEMA_VERSION,
		id: params.id,
		company: {
			name: params.companyName,
			corporateTaxRate: params.corporateTaxRate
		},
		modelSettings: { ...DEFAULT_MODEL_SETTINGS },
		census: [],
		results: null
	};
}
