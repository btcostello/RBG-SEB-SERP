# Four Funding Options — API Call Spec

How to reproduce the four COLI funding scenarios (Options 1–4) against the **lifeproj**
projection engine. Everything here is per **one insured**; a census runs this per participant.

Companion to [`API.md`](./API.md) (the raw engine contract). **Where the two disagree, this
document wins** — see the ⚠ note in §1, and always treat live `GET /api/v1/schema` as the final
authority.

---

## 0. TL;DR

| Option | Name | Premium | Distributions | Face | Solve |
|---|---|---|---|---|---|
| **1** | Cost Recovery | **solved** → $1,000 net AV @ age 100 | none | **input** (allocated from SERP liability) | `premium` / `net_account_value` / `specify` |
| **2** | Benefit Distribution | **solved** → $1,000 net AV @ age 100 | SERP benefit stream | **output** (`min_non_mec`) | `premium` / `net_account_value` / `specify` |
| **3** | Premium Deposit | **= Option 2's premium** (specified) | none | **output** (`min_non_mec`) | none |
| **4** | Premium Recovery | **solved** → net DB ≥ cum. premium @ LE, **floored at Option 2** | SERP benefit stream | **output** (`min_non_mec`) | `premium` / `net_death_benefit` / `premium_recovery` |

The options are a **dependency chain** and must run **in order** per insured: 3 and 4 both need
Option 2's solved premium. Different insureds are independent and can run in parallel.

---

## 1. Transport

```
POST  https://<host>/api/v1/project
Headers:  Content-Type: application/json
          X-API-Key: <your-key>
```

- `GET /api/v1/health` and `GET /api/v1/schema` are open (no key). `/schema` is the live,
  authoritative field catalog — pull enums/defaults from it rather than hardcoding.
- Stateless: each POST is a pure function of its body; safe to retry.
- Errors: **400** `validation_failed` (with `details[]`), **401** `unauthorized`,
  **422** `projection_failed`.

> ⚠ **The request shape in `API.md` §3 is stale.** That file documents an older
> *schedule-based* body (`premium_schedule`, `distribution_schedule`, `distribution_amount`,
> and a bare `solve: {value, when, basis}`). The engine actually in use takes the
> **period/kind-based** body documented here (`premium_periods[]`, `distribution_periods[]`,
> `face_periods[]` with a `kind`, `dbo_periods[]`, and a richer `solve` block with
> `mode`/`metric`/`target`). Verify against `GET /api/v1/schema` before you start — it was
> confirmed to match this period-based shape as of 2026-07-18.

### Request fields used here

All money is a **JSON number** (dollars). Periods are keyed by **policy year** (year 1 = issue
year). `[]?` = optional.

| Field | Type | Notes |
|---|---|---|
| `issue_age` | int | required. Age at issue. |
| `gender` | `"M"`\|`"F"` | required. |
| `health` | string | required. Exact risk-class string (see §2). |
| `face_amount` | number | required. Seed/anchor face; for Options 2–4 it is superseded by `face_periods` but must still be sent. |
| `face_periods[]?` | `{start_year,end_year,kind}` | `kind`: `specify`\|`solve`\|`min_non_mec`. |
| `product_type?` | `"VUL"`\|`"IUL"` | |
| `db_option?` | `"A"`\|`"B"` | A = level, B = increasing. |
| `dbo_periods[]?` | `{start_year,end_year,option}` | `option`: `A`\|`B`. Per-window DBO schedule. |
| `annual_premium?` | number | not used here (we drive premium via `premium_periods`). |
| `premium_periods[]?` | `{start_year,end_year,kind,amount?}` | `kind`: `specify`\|`seven_pay`\|`glp`\|`gsp`\|`solve`. `amount` only for `specify`. |
| `distribution_periods[]?` | `{start_year,end_year,kind,amount?}` | `kind`: `specify`\|`solve`. |
| `distribution_type?` | enum | we use `withdraw_to_basis_then_loan` (see §2). |
| `credited_rate?` | number | fraction, e.g. `0.0575`. |
| `qualification_test?` | `"GPT"`\|`"CVAT"` | use `GPT` (see §2). |
| `solve?` | see below | |

**Solve block:**
```
solve: {
  mode:   "premium" | "face" | "distribution" | "rollout",
  metric: "net_account_value" | "net_death_benefit",
  target: "specify" | "endow" | "premium_recovery",
  value:  number,          // required ONLY for target:"specify"
  when:   number,          // year or age (see basis)
  basis:  "year" | "age"
}
```

> ⚠ **A solve needs BOTH halves.** The `solve` block **and** a period with `kind:"solve"`
> (here, `premium_periods`). Sending the block alone does **not** error — the engine silently
> falls back to a pay-every-year policy and returns a materially different (≈½) premium with
> `feasible:true`. This is the single most common way to get a wrong-but-clean-looking answer.

### Response fields you read

```
report[]      { policy_year, age, premium, account_value, net_account_value,
                cash_surrender_value, death_benefit, status }
loans[]       { policy_year, withdrawal, new_loan, loan_interest, eoy_loan_balance }
summary       { initial_face_amount, initial_annual_premium,
                guideline_single_premium, guideline_level_premium_a/_b,
                lapse_year, mec_year }
solve         { feasible, reason?, solved_premium?, solved_face?, target_value?, ... } | null
gpt_adjusted  boolean
mec_adjusted  boolean
```

- **Solved premium** → `summary.initial_annual_premium` (equivalently `solve.solved_premium`).
- **Derived face** (Options 2–4) → `summary.initial_face_amount`. This is the *answer*, not an input.
- **Always check** `solve.feasible`, `gpt_adjusted`, `mec_adjusted`, `lapse_year`. A solve can be
  `feasible:true` yet `gpt_adjusted:true`, meaning the premium was rationed year-by-year and the
  schedule is **not presentable** as "pay $X for N years" (see §5). Treat a GPT-capped design as
  not client-ready.

---

## 2. Shared conventions (all options)

- **Pay period:** 10 policy years unless overridden (`premium_periods` end_year = 10).
- **Risk class strings** must be exact, one of:
  `Preferred Best Non Tobacco`, `Preferred Non Tobacco`, `Standard Plus Non Tobacco`,
  `Standard Non Tobacco`, `Preferred Tobacco`, `Standard Tobacco`.
- **Benefit stream → distribution periods (Options 2 & 4):** a SERP benefit at *attained age A*
  falls in *policy year A − issue_age*. Collapse consecutive equal-amount years into one window.
  Skip any benefit at or before the issue age.
- **Options 2–4 "design basis"** (shared): face = smallest compliant face via
  `face_periods:[{1..121, kind:"min_non_mec"}]`; `qualification_test:"GPT"`; DBO **B while paying
  premium, A the year after the last premium**:
  `dbo_periods:[{1..payYears, B}, {payYears+1..121, A}]` (also set `db_option:"B"` as the anchor).
- **Distribution type:** `withdraw_to_basis_then_loan` — withdrawals while cost basis remains,
  loans after. This is what carries the tax-free intent; the engine does **not** compute taxable
  income, so this choice is load-bearing. (Watch `mec_year`: distributions are only tax-free if
  the contract is not a MEC.)

The worked JSON below uses a representative insured: **45 y/o male, Standard Non Tobacco, IUL,
credited rate 5.75%, 10-pay, SERP benefit $30,000/yr at attained ages 66–85 (policy years 21–40),
life expectancy age 85.** Seed `face_amount` 474000 (any reasonable seed works for 2–4; the
answer is derived from the premium).

---

## 3. The four requests

### Option 1 — Cost Recovery
Face is an **input** (allocated share of the tax-adjusted SERP liability). Solve the level
premium that leaves $1,000 net account value at age 100. No `min_non_mec`, no DBO schedule.

```json
{
  "issue_age": 45,
  "gender": "M",
  "health": "Standard Non Tobacco",
  "face_amount": 474000,
  "product_type": "IUL",
  "credited_rate": 0.0575,
  "premium_periods": [{ "start_year": 1, "end_year": 10, "kind": "solve" }],
  "solve": {
    "mode": "premium",
    "metric": "net_account_value",
    "target": "specify",
    "value": 1000,
    "when": 100,
    "basis": "age"
  }
}
```
→ Read `summary.initial_annual_premium`. `lapse_year` will be non-null (≈ age 101) **by design** —
solving to $1,000 at 100 leaves nothing after; do not treat that as an error. Only a lapse
*before* life expectancy matters.

---

### Option 2 — Benefit Distribution
Distributions pay each year's SERP benefit; solve the premium that funds them and still leaves
$1,000 net AV at age 100. Face is derived (`min_non_mec`).

```json
{
  "issue_age": 45,
  "gender": "M",
  "health": "Standard Non Tobacco",
  "face_amount": 474000,
  "product_type": "IUL",
  "credited_rate": 0.0575,
  "face_periods": [{ "start_year": 1, "end_year": 121, "kind": "min_non_mec" }],
  "db_option": "B",
  "dbo_periods": [
    { "start_year": 1,  "end_year": 10,  "option": "B" },
    { "start_year": 11, "end_year": 121, "option": "A" }
  ],
  "qualification_test": "GPT",
  "premium_periods": [{ "start_year": 1, "end_year": 10, "kind": "solve" }],
  "distribution_periods": [{ "start_year": 21, "end_year": 40, "kind": "specify", "amount": 30000 }],
  "distribution_type": "withdraw_to_basis_then_loan",
  "solve": {
    "mode": "premium",
    "metric": "net_account_value",
    "target": "specify",
    "value": 1000,
    "when": 100,
    "basis": "age"
  }
}
```
→ **Capture `option2Premium = summary.initial_annual_premium`** (needed by 3 and 4). Read face
from `summary.initial_face_amount`. If `solve.feasible === false`, **stop the chain** — do not run
3 or 4 (they would be built on a failed solve and look clean). Cannot reuse the Option 1 face —
it is structurally too small to support the draws (7702 caps premium by face).

---

### Option 3 — Premium Deposit
Option 2's premium, **specified** (not solved), with **no distributions** — "fund it and leave it
alone." Same design basis; no `solve`, no `distribution_periods`.

```json
{
  "issue_age": 45,
  "gender": "M",
  "health": "Standard Non Tobacco",
  "face_amount": 474000,
  "product_type": "IUL",
  "credited_rate": 0.0575,
  "face_periods": [{ "start_year": 1, "end_year": 121, "kind": "min_non_mec" }],
  "db_option": "B",
  "dbo_periods": [
    { "start_year": 1,  "end_year": 10,  "option": "B" },
    { "start_year": 11, "end_year": 121, "option": "A" }
  ],
  "qualification_test": "GPT",
  "premium_periods": [{ "start_year": 1, "end_year": 10, "kind": "specify", "amount": 55711 }]
}
```
(`amount` = the Option 2 premium you captured, e.g. 55711.)

---

### Option 4 — Premium Recovery  *(two-call pattern)*
Option 2's distributions, but the endpoint is: **net death benefit at life expectancy ≥ cumulative
premiums paid** (over-recovery is fine). Then **floored at Option 2's premium**.

**Call A** — solve premium against the derived recovery target (`when` = life-expectancy age):

```json
{
  "issue_age": 45,
  "gender": "M",
  "health": "Standard Non Tobacco",
  "face_amount": 474000,
  "product_type": "IUL",
  "credited_rate": 0.0575,
  "face_periods": [{ "start_year": 1, "end_year": 121, "kind": "min_non_mec" }],
  "db_option": "B",
  "dbo_periods": [
    { "start_year": 1,  "end_year": 10,  "option": "B" },
    { "start_year": 11, "end_year": 121, "option": "A" }
  ],
  "qualification_test": "GPT",
  "premium_periods": [{ "start_year": 1, "end_year": 10, "kind": "solve" }],
  "distribution_periods": [{ "start_year": 21, "end_year": 40, "kind": "specify", "amount": 30000 }],
  "distribution_type": "withdraw_to_basis_then_loan",
  "solve": {
    "mode": "premium",
    "metric": "net_death_benefit",
    "target": "premium_recovery",
    "when": 85,
    "basis": "age"
  }
}
```
Note: `target:"premium_recovery"` is **derived** — it carries no `value`.

**Then apply the floor:** if `solved_premium < option2Premium`, **Call B** — re-run with Option 2's
premium *specified* and **no `solve`** (recovery becomes a reported outcome, easily cleared):

```json
{
  "...": "same base as Call A (face_periods, dbo_periods, qualification_test, distributions)",
  "premium_periods": [{ "start_year": 1, "end_year": 10, "kind": "specify", "amount": 55711 }],
  "distribution_periods": [{ "start_year": 21, "end_year": 40, "kind": "specify", "amount": 30000 }],
  "distribution_type": "withdraw_to_basis_then_loan"
}
```

**Why the floor is load-bearing, not cosmetic:** `net_death_benefit` is 0 for a policy that lapsed
before the target year, so the feasible region has a hard edge at "survives to LE." Left unfloored,
the recovery solve converges *onto that edge* and lapses the contract **exactly at life
expectancy** — leaving nothing for an insured who outlives LE. Flooring at Option 2's premium
prevents that. In practice Options 2 and 4 **match for most insureds** and diverge only for the
youngest (small premium vs a fixed benefit stream), where Option 4 stands alone and costs more.

---

## 4. Orchestration (per insured)

```
1. Option 1  → solved premium (face was input)
2. Option 2  → option2Premium, derived face
              if solve.feasible == false  →  STOP (skip 3 & 4)
3. Option 3  → specify option2Premium, no distributions
4. Option 4  → Call A (solve premium_recovery @ LE)
              if solvedPremium < option2Premium  →  Call B (specify option2Premium, no solve)
```

- **Sequential within an insured** (3 & 4 depend on 2). **Parallel across insureds** (bounded pool;
  the reference implementation uses 4).
- **Fail-fast:** the first hard error aborts in-flight calls.
- **Order output by census, not completion**, so a re-run reproduces an identical snapshot.

---

## 5. Known gotchas / caveats

- **Solve needs both halves** (block + `kind:"solve"` period) — silent ≈½-premium fallback otherwise.
- **`min_non_mec` only binds the 7-pay (7702A) limit, not GPT.** A design can come back
  `gpt_adjusted:true`, meaning the solved premium was rationed year-by-year (e.g. three full
  years, a partial, a multi-year gap, then odd amounts). Internally consistent but **not
  presentable** as a level premium. Surface `gpt_adjusted` and don't ship a capped design.
- **Options 2–4 must size their own face** — the Option 1 (cost-recovery) face is structurally
  infeasible for the draws.
- **CVAT is a trap:** its columns are *reported but not enforced* by the engine, so its apparent
  headroom is an artifact. Use `GPT`.
- **`lapse_year` non-null is expected** for Option 1 (and Option 2 by age ~101). Only a lapse
  *before* LE is a problem.
- **Engine overflow bug:** infeasible young-age recovery solves can return
  `solved_premium: 1.84e22` (a 2⁶⁴ artifact) with `feasible:false`. Gate on `feasible` before
  reading the number, or it will print as garbage.
- **No taxable-income modelling.** MEC status is reported (`mec_year`) but doesn't change the
  distribution math — `distribution_type: withdraw_to_basis_then_loan` carries the tax intent.

---

## 6. Reference implementation (this repo)

The exact request builders live in `src/lib/funding/`:

| Option | Builder |
|---|---|
| shared basis (2–4) | `design-basis.ts` → `premiumFundedBase`, `dboSwitchAfterFunding`, `benefitStreamToDistributionPeriods` |
| 1 | `cost-recovery.ts` → `buildCostRecoveryDesignRequest` |
| 2 | `benefit-distribution.ts` → `buildBenefitDistributionDesignRequest` |
| 3 | `premium-deposit.ts` → `buildPremiumDepositDesignRequest` |
| 4 | `premium-recovery.ts` → `buildPremiumRecoveryDesignRequest` + `buildFlooredPremiumRecoveryDesignRequest` (+ `premiumRecoveryIsUnderfunded`) |

Orchestration: `src/lib/orchestrator/run.ts`. Wire shape + camelCase→snake_case mapping:
`src/lib/server/lifeproj/wire-schemas.ts` and `adapter.ts` (these two are the source of truth for
the exact field names on the wire).
