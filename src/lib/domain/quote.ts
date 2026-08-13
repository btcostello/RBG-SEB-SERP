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

/**
 * Per-report page visibility. Stores the registry page ids the operator has HIDDEN from each
 * paginated report — not the enabled ids — so the default (absent/empty) shows every page and a
 * page added to a registry later is visible until explicitly hidden. The interactive report is a
 * single narrative, not a page list, so it has no entry here.
 */
export const ReportSettingsSchema = v.object({
	/** Page ids hidden from the formal `/report`. Absent/empty ⇒ all pages shown. */
	hiddenPages: v.optional(v.array(v.string())),
	/** Page ids hidden from `/report/legacy`. Absent/empty ⇒ all pages shown. */
	hiddenLegacyPages: v.optional(v.array(v.string()))
});
export type ReportSettings = v.InferOutput<typeof ReportSettingsSchema>;

export const QuoteSchema = v.object({
	schemaVersion: v.literal(SCHEMA_VERSION),
	/** Stable identifier / storage key (one quote per prospect company). */
	id: v.pipe(v.string(), v.nonEmpty()),
	company: CompanySchema,
	modelSettings: ModelSettingsSchema,
	/** The executive census. */
	census: v.array(InsuredSchema),
	/** Computed results snapshot; `null` until a run computes it. */
	results: v.nullable(ResultsSchema),
	/**
	 * Report page visibility. Optional so pre-existing quotes still validate; absent means every
	 * page of every report is shown.
	 */
	reportSettings: v.optional(ReportSettingsSchema)
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
		// Default the plan effective date to the day the quote is created; the operator can override it.
		modelSettings: { ...DEFAULT_MODEL_SETTINGS, effectiveDate: todayIso() },
		census: [],
		results: null
	};
}

/** Today's local date as ISO YYYY-MM-DD (the default plan effective date). */
function todayIso(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * A "(copy)" name for `base` that does not collide with any name in `taken`. The first duplicate is
 * "Name (copy)"; further copies get "(copy 2)", "(copy 3)", … so the saved list stays unambiguous.
 */
function uniqueCopyName(base: string, taken: Set<string>): string {
	const first = `${base} (copy)`;
	if (!taken.has(first)) return first;
	let n = 2;
	while (taken.has(`${base} (copy ${n})`)) n++;
	return `${base} (copy ${n})`;
}

/**
 * Build a duplicate of a quote: a deep copy under a new `id` and a distinct "(copy)" company name.
 * The census, model settings, results snapshot, and report page selection all carry over, so the
 * copy opens identical to the original — only the id and display name differ. `existingNames` are the
 * current saved-quote names, used to keep the copy's name unique in the list. Pure: the deep clone
 * means edits to the copy never touch the original (AR5, immutable-style — see the store).
 *
 * The clone is a JSON round-trip (the Quote is fully JSON — money as strings, no Dates/Maps), which
 * also flattens the live Svelte `$state` proxy the setup workspace passes in; `structuredClone`
 * cannot clone that proxy, so it must not be used here.
 */
export function duplicateQuote(
	original: Quote,
	newId: string,
	existingNames: Iterable<string> = []
): Quote {
	const copy: Quote = JSON.parse(JSON.stringify(original));
	copy.id = newId;
	copy.company = {
		...copy.company,
		name: uniqueCopyName(original.company.name, new Set(existingNames))
	};
	return copy;
}
