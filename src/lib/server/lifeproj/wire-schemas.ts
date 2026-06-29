/**
 * lifeproj wire schemas — the ONLY place the `snake_case` wire shape exists (AR-boundary).
 *
 * The outbound request schema contains only actuarial fields by construction, so the
 * adapter cannot accidentally send a name/DOB/identifier (NFR12). The inbound schemas parse
 * just the fields the adapter consumes; unknown keys are ignored (Valibot `object`).
 */
import * as v from 'valibot';

// --- Outbound request (POST /api/v1/project) ---
export const WireSolveSchema = v.object({
	value: v.number(),
	when: v.number(),
	basis: v.optional(v.picklist(['year', 'age']))
});

export const WireProjectRequestSchema = v.object({
	issue_age: v.number(),
	gender: v.picklist(['M', 'F']),
	health: v.string(),
	face_amount: v.number(),
	product_type: v.optional(v.picklist(['VUL', 'IUL'])),
	db_option: v.optional(v.picklist(['A', 'B'])),
	annual_premium: v.optional(v.number()),
	premium_mode: v.optional(v.picklist(['annual', 'semiannual', 'quarterly', 'monthly'])),
	credited_rate: v.optional(v.number()),
	qualification_test: v.optional(v.picklist(['GPT', 'CVAT'])),
	maturity_age: v.optional(v.number()),
	solve: v.optional(WireSolveSchema)
});
export type WireProjectRequest = v.InferOutput<typeof WireProjectRequestSchema>;

// --- Inbound response (200) — only the fields the adapter reads ---
export const WireReportRowSchema = v.object({
	policy_year: v.number(),
	age: v.number(),
	premium: v.number(),
	account_value: v.number(),
	death_benefit: v.number()
});

export const WireSummarySchema = v.object({
	initial_annual_premium: v.number(),
	guideline_single_premium: v.number(),
	guideline_level_premium_a: v.number(),
	guideline_level_premium_b: v.number()
});

export const WireProjectResponseSchema = v.object({
	report: v.array(WireReportRowSchema),
	summary: WireSummarySchema,
	gpt_adjusted: v.boolean(),
	mec_adjusted: v.boolean()
});
export type WireProjectResponse = v.InferOutput<typeof WireProjectResponseSchema>;

// --- Inbound error envelope ---
export const WireErrorSchema = v.object({
	error: v.string(),
	message: v.optional(v.string()),
	details: v.optional(v.array(v.object({ field: v.string(), message: v.string() })))
});
export type WireError = v.InferOutput<typeof WireErrorSchema>;
