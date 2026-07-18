/**
 * lifeproj wire schemas — the ONLY place the `snake_case` wire shape exists (AR-boundary).
 *
 * Tracks the v1 contract in `API.md`. The outbound request schema contains only actuarial
 * fields by construction, so the adapter cannot accidentally send a name/DOB/identifier
 * (NFR12). The inbound schemas parse just the fields the adapter consumes; unknown keys are
 * ignored (Valibot `object`), and fields the engine only sometimes returns are optional.
 */
import * as v from 'valibot';

// --- Outbound request (POST /api/v1/project) ---
const WirePeriodBase = {
	start_year: v.number(),
	end_year: v.number(),
	amount: v.optional(v.number())
};

export const WirePremiumPeriodSchema = v.object({
	...WirePeriodBase,
	kind: v.picklist(['specify', 'seven_pay', 'glp', 'gsp', 'solve'])
});

export const WireDistributionPeriodSchema = v.object({
	...WirePeriodBase,
	kind: v.picklist(['specify', 'solve'])
});

export const WireFacePeriodSchema = v.object({
	...WirePeriodBase,
	kind: v.picklist(['specify', 'solve', 'min_non_mec'])
});

/** DBO windows carry an `option`, not a `kind`/`amount`. */
export const WireDboPeriodSchema = v.object({
	start_year: v.number(),
	end_year: v.number(),
	option: v.picklist(['A', 'B'])
});

export const WireSolveSchema = v.object({
	mode: v.optional(v.picklist(['premium', 'face', 'distribution', 'rollout'])),
	metric: v.optional(v.picklist(['net_account_value', 'net_death_benefit'])),
	target: v.optional(v.picklist(['specify', 'endow', 'premium_recovery'])),
	/** Required for `target: "specify"` only; the derived targets ignore it. */
	value: v.optional(v.number()),
	when: v.number(),
	basis: v.optional(v.picklist(['year', 'age']))
});

export const WireProjectRequestSchema = v.object({
	issue_age: v.number(),
	gender: v.picklist(['M', 'F']),
	health: v.string(),
	face_amount: v.number(),
	face_periods: v.optional(v.array(WireFacePeriodSchema)),
	product_type: v.optional(v.picklist(['VUL', 'IUL'])),
	db_option: v.optional(v.picklist(['A', 'B'])),
	dbo_periods: v.optional(v.array(WireDboPeriodSchema)),
	annual_premium: v.optional(v.number()),
	premium_periods: v.optional(v.array(WirePremiumPeriodSchema)),
	premium_mode: v.optional(v.picklist(['annual', 'semiannual', 'quarterly', 'monthly'])),
	distribution_periods: v.optional(v.array(WireDistributionPeriodSchema)),
	distribution_type: v.optional(
		v.picklist([
			'withdrawal',
			'loan',
			'indexed_loan',
			'withdraw_to_basis_then_loan',
			'withdraw_to_basis_then_indexed_loan'
		])
	),
	credited_rate: v.optional(v.number()),
	qualification_test: v.optional(v.picklist(['GPT', 'CVAT'])),
	mec_handling: v.optional(v.picklist(['avoid', 'allow'])),
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
	/** Account value less the loan balance. Optional so an older engine still parses. */
	net_account_value: v.optional(v.number()),
	/** Net account value less the surrender charge, floored at 0. */
	cash_surrender_value: v.optional(v.number()),
	death_benefit: v.number(),
	status: v.optional(v.string())
});

/** Per-year distribution + loan detail, keyed back to `report[]` by `policy_year`. */
export const WireLoanRowSchema = v.object({
	policy_year: v.number(),
	withdrawal: v.optional(v.number()),
	new_loan: v.optional(v.number()),
	loan_interest: v.optional(v.number()),
	eoy_loan_balance: v.optional(v.number())
});

export const WireSummarySchema = v.object({
	/** Resolved year-1 face — the answer for options whose face derives from the solved premium. */
	initial_face_amount: v.optional(v.number()),
	initial_annual_premium: v.number(),
	guideline_single_premium: v.number(),
	guideline_level_premium_a: v.number(),
	guideline_level_premium_b: v.number(),
	lapse_year: v.optional(v.nullable(v.number())),
	mec_year: v.optional(v.nullable(v.number()))
});

/**
 * Solve result. Every field but `feasible` is optional because which one carries the answer
 * depends on the solve mode, and `reason` appears only on failure.
 */
export const WireSolveResultSchema = v.object({
	feasible: v.boolean(),
	reason: v.optional(v.string()),
	target_value: v.optional(v.number()),
	metric: v.optional(v.string()),
	target_kind: v.optional(v.string()),
	solved_premium: v.optional(v.number()),
	solved_face: v.optional(v.number()),
	solved_distribution: v.optional(v.number())
});

export const WireProjectResponseSchema = v.object({
	report: v.array(WireReportRowSchema),
	loans: v.optional(v.array(WireLoanRowSchema)),
	summary: WireSummarySchema,
	gpt_adjusted: v.boolean(),
	mec_adjusted: v.boolean(),
	solve: v.optional(v.nullable(WireSolveResultSchema))
});
export type WireProjectResponse = v.InferOutput<typeof WireProjectResponseSchema>;

// --- Inbound error envelope ---
export const WireErrorSchema = v.object({
	error: v.string(),
	message: v.optional(v.string()),
	details: v.optional(v.array(v.object({ field: v.string(), message: v.string() })))
});
export type WireError = v.InferOutput<typeof WireErrorSchema>;
