# Legacy Report — Handoff Notes

Status as of **2026-07-17**. Paired doc: [DATA-GAPS.md](./DATA-GAPS.md) (per-page detail + the running gap list).
Read this first when resuming in a fresh session.

---

## 1. What this is

An alternative report ("Legacy Report") being rebuilt page-by-page from operator-supplied source
PDFs (`…/NYLEX DB SERP/CPJA/Report/*.pdf`). It renders at **`/report/legacy`** alongside the
existing production report at `/report`, and reuses the same design system and `ReportModel`.

**Working method** (keep doing this):
1. Operator sends one source PDF + a field-by-field mapping ("X = [model field]", or "add to data gaps").
2. Extract text with `pdftotext -layout "<file>" -` (poppler is available via Git Bash; PDF *image*
   rendering is NOT — `pdftoppm` is missing, and the browser screenshot tool times out in this env).
3. Rebuild the page structure/format as closely as the design system allows.
4. Bind to `ReportModel` where data exists; render a labelled placeholder ("—" / "— not set —")
   where it doesn't, and log the gap in DATA-GAPS.md.
5. Register in `legacy-registry.ts`, then verify: `npm run check`, `npm test`, and in-browser
   DOM inspection (see §6).

---

## 2. Progress — 43 pages built

Source sections A1 → H3. Registered in [legacy-registry.ts](./legacy-registry.ts) in this order:

| # | Page | Section | Source PDF |
|---|---|---|---|
| 1 | Cover | — | A1 Cover |
| 2 | Title Page | — | A3 TitlePage |
| 3–4 | Disclosure (2 sheets) | — | A4 Disclosure |
| 5 | Table of Contents | — | A5 ToC |
| 6 | Considerations | 1.1 | A6 Considerations |
| 7 | SERP Actuarial Modeling System | 1.2 | B1 SERP AMS |
| 8 | SERP Benefit Formula | 2.1 | B2 SERP Benefit Formula |
| 9 | Participant Benefits Formula (spec) | 2.2 | B3 Benefit Formula |
| 10 | Plan Specifications & Assumptions | 2.3 | B4 Plan Specs |
| 11 | Plan Specs & Assumptions Overview | 2.4 | B5 Plan Specs Details |
| 12 | SERP Plan Census | 3.1 | C1 Census (p1) |
| 13 | Plan Participant Summary — Projections | 3.2 | C1 Census (p2) |
| 14–15 | Financial Overview (2 sheets) | 4.1, 4.2 | D1 Fin Overview |
| 16 | Overview — SERP Benefit Financing | 4.3 | D2 Funding Options - 2 |
| 17 | Cash Flow Summary — Life of Plan | 4.5 | D5 CF Summary |
| 18 | Earnings Impact | 5.1 | E1 Earnings Imp Desc |
| 19–22 | Annual Impact on Earnings (4 sheets, one per option) — **placeholder** | 5.2-1…5.2-4 | E3 Earnings Imp Ledger |
| 23–25 | SERP Accounting Entry Worksheet (entries, reconciliation, notes) — **placeholder** | 6.1–6.3 | F1 SERP Summary |
| 26 | COLI Accounting Entry Worksheet — **placeholder** | 6.4 | F2 COLI Summary |
| 27 | FASB ASC 715-30 Audit Trail — **placeholder** | 6.5 | F3 Audit Trail |
| 28 | Pension Expense Allocation by Participant — **placeholder** | 6.6 | F4 Cost Allocation |
| 29 | Summary of Benefits (sample, census[0]) | Appendix A | G1 Ben Statement |
| 30–31 | COLI Face vs Survivor Liability (Options 1, 2) | Appendix B.1–B.2 | G2 Face Survivor |
| 32–39 | Option Ledgers (4 options × 2 sheets, **landscape**) | Appendix C.1–C.8 | G3 Ledgers |
| 40 | Accounting for SERP Programs (static) | Appendix D | G5 Acct Desc |
| 41–42 | Informational Overview — SERPs, COLI (static) | Appendix E.1–E.2 | G6 Info Overview |
| 43 | Comparison of Mortality Assumptions (chart) — **placeholder** | Appendix G | H3 Mortality Chart |

**Next up:** the remaining Appendix set (TOC F, H: hypothetical COLI
value, glossary). Appendix A–E and G are built.

The accounting worksheets are now roughed in, but **ten pages are placeholders blocked on the
GAAP layer** (5.2-1…5.2-4 and 6.1–6.6). See the "Missing subsystem" section at the top of
[DATA-GAPS.md](./DATA-GAPS.md) for the single list of quantities they all need.

---

## 3. Architecture

```
src/lib/report/legacy/
  legacy-registry.ts        ordered page list — adding a page is append-only
  LegacyReportView.svelte   renders registered pages; derives ReportModel once
  DATA-GAPS.md              per-page mapping + running gap list
  HANDOFF.md                this file
  pages/
    LegacyPageShell.svelte     interior-page chrome: footer "Page X.Y" + date.
                               `pageNoSide: 'left'|'right'` mirrors per source page.
    LegacyProsePage.svelte     centered title + justified paragraphs (static text pages)
    LegacyRichProsePage.svelte same, but body is heading/paragraph *blocks*
    LegacyBulletPage.svelte    centered title + bullets, optional nested sub-list
    DisclosureSheet.svelte     shared disclosure layout (A4 pages)
    <one component per page>
```
Route: `src/routes/report/legacy/+page.svelte` — gated on **having a quote** (not on results), so
pages can be previewed pre-run; a banner notes when computed figures are absent.

Front-matter pages (cover/title/disclosure/ToC) do **not** use `LegacyPageShell`.

---

## 4. Data model extensions (all in `src/lib/report/report-data.ts`)

Added to `ReportModel` for the legacy pages (production report untouched):

| Field | Purpose |
|---|---|
| `benefitFormula` | Page 2.2 terms (payout/guaranteed/survivor), "varies"-aware |
| `planSpecs` | Page 2.4 (effective date, tax/discount/crediting rates, NRA, ERA, salary scale) |
| `legacyCensus` | Page 3.1 rows — ages/service **as of plan effective date** |
| `legacyProjections`, `legacySerpBenefitTotal` | Page 3.2 rows |
| `hasResults`, `option1AvgFace` | Page 4.3 (results-gated display) |
| `cashFlow` | Page 4.5 Option 1 life-of-plan totals |
| `legacyAsOfDisplay`, `legacyCensusSalaryTotal` | Shared legacy labels/totals |

**Key helper — the "varies" rule:** `commonSerpValue()` returns the shared value across SERP
participants, or the sentinel `'varies'`. Operator rule: any per-participant value shown at plan
level prints the value when uniform, else **"Varies"**. Applied on pages 2.2 and 2.4.

**Domain/settings changes made along the way:**
- `ModelSettings.effectiveDate` (optional ISO date) — plan effective date input.
- `ModelSettings.premiumYears` (optional int, default 10) — premium-payment period.
- `ParticipantResult.illustrationYears` (optional) — **full per-policy-year illustration stream**,
  now persisted with the quote. This is what unlocked the page 4.5 cash-flow derivation.
- All three are **optional** on purpose, so previously-saved/persisted quotes still validate.

---

## 5. API contract — status against lifeproj v1

Wire contract lives in `src/lib/server/lifeproj/wire-schemas.ts` (POST `/api/v1/project`),
tracking `API.md` v1 as of 2026-07-18. **All four previously-blocking additions have landed.**

- **Request:** `issue_age, gender(M|F), health, face_amount, product_type?, db_option?,
  annual_premium?, premium_periods[]?, premium_mode?, distribution_periods[]?,
  distribution_type?, credited_rate?, qualification_test?, mec_handling?, maturity_age?,
  solve{mode?,metric?,target?,value?,when,basis?}`
- **Response:** `report[]{policy_year, age, premium, account_value, net_account_value,
  cash_surrender_value, death_benefit, status}`, `loans[]{policy_year, withdrawal, new_loan,
  loan_interest, eoy_loan_balance}`, `summary{…, lapse_year, mec_year}`, `gpt_adjusted`,
  `mec_adjusted`, `solve{feasible, reason?, target_value?, solved_premium?, …}`

**Resolved (2026-07-18):**

1. ☑ **Premium payment period** — sent as `premium_periods:[{1..premiumYears, kind:"solve"}]`.
   `run.ts` passes `ModelSettings.premiumYears` through `buildCostRecoveryDesignRequest`, so the
   engine's own stream now stops charging premium after the period; our summation no longer
   diverges from the returned cash values.
2. ☑ **Loans / withdrawals** — `loans[]` is folded into the year rows by `policy_year`, so
   `IllustrationYear` now carries `withdrawal`, `loan`, `loanBalance`.
3. ☑ **Cash surrender value** — real `cash_surrender_value` replaces the account-value
   approximation (the fallback remains only for an older engine deployment). The old
   approximation was **materially wrong in early durations**: live year 1 shows
   `account_value` 6,752.69 against `cash_surrender_value` **0.00** (the surrender charge
   wipes it out), and the two do not converge until roughly year 20. Any early-duration CSV
   the report has shown to date was overstated.
4. ☑ **Funding strategies 2 / 3 / 4** — now *expressible* (see below); the strategies themselves
   are still to be built.

> ⚠ **A solve needs both halves.** The `solve` block AND a period with `kind: "solve"`.
> We previously sent the block alone. **Verified against the live engine 2026-07-18 — the
> failure is silent, not loud.** With no `premium_periods` the engine falls back to legacy
> level-premium behaviour and solves a *pay-every-year* policy: same target, `feasible: true`,
> no warning, but a materially different product. For a 45M Standard NT, $474k face @5.75%:
>
> | | solved premium | premiums paid |
> |---|---|---|
> | old shape (no window) | **$4,685.67** | every year to lapse (56 yrs) |
> | correct 10-pay window | **$9,790.20** | years 1–10 only |
>
> So the old code understated the annual premium by ~2× while looking perfectly healthy.
> Fixed in `cost-recovery.ts`.

> ℹ **`/api/v1/schema` was briefly stale for the solve block; re-checked 2026-07-18 and it now
> matches `API.md`** (`mode: premium|face|distribution|rollout`, `metric`, `target`) and
> documents the solve-window pairing rule. `/schema` is trustworthy again — keep using it as
> the authority.

### Design basis for Options 2–4 — IMPLEMENTED (2026-07-18)

**Operator direction:** face for Options 2–4 = the smallest face that does not fail 7702/7702A
("min non-MEC" as shorthand for compliance, not the literal API kind). GPT + DBO B gives the
lowest death benefit for the solved premium — never buy more than that. Designs fund over 5–10
years. Pick a plausible structure now; deep testing later.

Built in [`design-basis.ts`](../../funding/design-basis.ts), shared by all three options:
`face_periods: min_non_mec`, `db_option: 'B'`, `qualification_test: 'GPT'`, premium solved over
the pay period. The options differ only in solve target and distributions:

| | file | distributions | solve |
|---|---|---|---|
| Opt 2 Benefit Distribution | `benefit-distribution.ts` | SERP benefit stream | premium → $1k net AV @ 100 |
| Opt 3 Premium Deposit | `premium-deposit.ts` | none | none (Opt 2's premium, specified) |
| Opt 4 Premium Recovery | `premium-recovery.ts` | SERP benefit stream | premium → net DB ≥ cum. premium @ LE |

**DBO schedule (operator, 2026-07-18):** option **B while premiums are going in, switching to A
the year after the final premium** — `dboSwitchAfterFunding()`. B buys guideline room exactly
when premium goes in; A avoids paying B's extra COI across the whole distribution phase.
**Live-verified to work:** Option 3 went from lapsing in year 59 (B held for life) to **staying
in force**; Options 2/4 extended from year 37 to 40 and gained a death benefit at LE where the
policy had previously lapsed before reaching it.

**Live status after the engine change (2026-07-18):**

- ☑ **The 400 is gone.** `min_non_mec` + a premium solve is accepted and **converges correctly** —
  18 iterations, and the seed `face_amount` is properly irrelevant (100k/500k/1M/5M seeds all
  return the identical answer, since face is derived from premium).
- ☑ **Option 3 runs today** (specified premium — never needed the fix).
- ☑ **The $50,000 solve ceiling is lifted** (engine, 2026-07-18). All four options now solve at
  realistic benefit levels.

**All four options, live (45M Standard NT, IUL @5.75%, $30k/yr benefit ages 66–85, LE 85):**

| | premium | face | cum. premium | net DB @ LE | lapse |
|---|---|---|---|---|---|
| Opt 2 Benefit Distribution | $55,711 | $708,187 | $237,676 | $213,450 | yr 56 (age 101, by design) |
| Opt 3 Premium Deposit | $55,711 | $708,187 | $237,676 | $1,392,439 | none |
| Opt 4 Premium Recovery | $57,049 | $725,195 | $243,384 | **$243,384** | yr 62 (age 107) |

**Option 4 now works exactly as defined:** net death benefit at LE equals cumulative premium to
the dollar, and the policy stays in force well past LE. The earlier degenerate behaviour is gone
— it was an artifact of the oversized cost-recovery face, not of the target.

⚠ **REMAINING BLOCKER — the premium schedule is not presentable.** `gpt_adjusted: true` on every
option. `min_non_mec` sizes face against the **7-pay** limit, which is far more generous than the
**guideline** limit, so the solved premium does not fit the face under GPT and the engine rations
it year by year. The "10-pay at $55,711" design actually pays:

| yr 1–3 | yr 4 | yr 5–8 | yr 9 | yr 10 | total |
|---|---|---|---|---|---|
| $55,710.63 | $35,455.28 | **$0** | $11,321.50 | $23,767.63 | $237,676 of $557,106 (43%) |

Internally consistent — the solve does hit its target — but no client can be told "pay $55,711
for ten years" when the real schedule is three full years, a partial, a four-year gap, then two
odd amounts. **This is the operator's own stated intent not being met:** min-non-MEC was meant as
"never fail 7702 *or* 7702A", and only 7702A is being honoured.

Two ways out, in preference order:

1. **Engine (asked):** a face kind that binds on *both* limits — the smallest face at which the
   entered premium is cut by neither the 7-pay limit nor the guideline limit.
2. **Our side (no engine change):** raise face until `gpt_adjusted` is false, with a specified
   premium — the bisection previously sketched. Costs N calls per participant and buys more death
   benefit than the operator wants, but unblocks presentable designs today.

### Option 4 is floored at Option 2 — and is genuinely distinct only sometimes

**Rule (operator, 2026-07-18):** Option 4 must be at least as well funded as Option 2, so its
premium is `max(recovery solve, Option 2 premium)`. Option 2 funds all SERP benefits from
distributions and stays in force to age 100; Option 4 does the same **and** requires net death
benefit at LE to be at least cumulative premium paid.

**Does Option 2 satisfy Option 4 automatically? No — usually, but not always.** Live sweep
(10-pay, $30k draws ages 66–85, LE 85), Option 2's recovery margin by issue age:

| issue age | Opt 2 premium | net DB @ LE | cum. premium | margin | |
|---|---|---|---|---|---|
| 38 | $18,116 | $160,242 | $181,164 | −$20,922 | **fails** |
| 40 | $20,601 | $147,089 | $206,006 | −$58,918 | **fails** |
| 41 | $22,034 | $190,550 | $220,335 | −$29,785 | **fails** |
| **42** | $23,639 | $252,284 | $236,393 | +$15,891 | recovers |
| 45 | $32,129 | $591,286 | $321,295 | +$269,992 | recovers |
| 55 | $132,777 | $3,462,916 | $1,327,767 | +$2,135,149 | recovers |

At age 40 Option 4 stands alone and costs more — premium $21,564 vs $20,601, recovery binding to
the dollar ($215,642 = $215,642), and the policy lapses in year 72 rather than 61.

**Why young ages fail.** The margin is roughly `P × (k − payYears) − D`, where k is the
face-to-premium multiple and D the accumulated draws. **D is fixed by the plan while P swings
hard with issue age.** A 40-year-old needs only ~$20k/yr (45 years of growth ahead), so a
$600,000 benefit stream dwarfs $206,006 of premium and eats the death benefit below it. A
55-year-old needs ~$133k/yr, so the same draws are a rounding error against a $2.7M face. k does
fall with age, but nowhere near fast enough to offset that.

**Expect Options 2 and 4 to match for most participants and diverge for the youngest.**

The `max()` is load-bearing, not cosmetic: without it, the recovery solve at ages 42+ converges
onto the "survives exactly to LE" edge (`net_death_benefit` is 0 for a policy that lapsed
earlier, so the feasible region has a hard boundary there) and produces a fragile design that
lapses precisely at life expectancy. See `premiumRecoveryIsUnderfunded` /
`buildFlooredPremiumRecoveryDesignRequest`.

**Engine bug to report:** issue age 65 returns `feasible: false` with `solved_premium:
1.8446744073709552e+22` (2⁶⁴ × 1000 — an integer overflow artifact). The design is genuinely
infeasible there, but the number is garbage and would print if surfaced.

**Two caveats to settle in deep testing:**

1. ⚠ **`min_non_mec` does not prevent a GPT cap.** It binds on the 7-pay/MEC limit only. Live,
   Option 3 at a min-non-MEC face came back `gpt_adjusted: true`, admitting **$143,765 of an
   intended $336,980**. If the intent is "never fail 7702 *or* 7702A", the face rule must bind on
   the guideline limit too. For reference, funding $500k uncapped needs ~$1.75M face (DBO A) or
   ~$1.5M (DBO B) at issue 45 — far above the min-non-MEC face.
2. ⚠ **DBO B is not strictly better.** It admits ~17% more premium on a 10-pay (neutral on a
   5-pay, where GSP binds and is option-independent), but its death benefit rides the account
   value and so buys more COI. Live, a $1M-face Option 2 was **feasible under A and infeasible
   under B** (lapsed year 46). More room to pay in, less to draw out.

⚠ **CVAT is a trap right now.** It admits the full premium at the min-non-MEC face, which looks
like it solves everything. But `API.md` states the CVAT columns are **reported, not enforced** —
nothing tests cash value against them. That headroom is most likely the engine declining to
police CVAT at all, not real compliance room (it also raised `mec_adjusted`). Treat CVAT as
unavailable until the engine enforces it.

**Orchestrator: WIRED (2026-07-18).** `runModel` designs all four options per COLI participant
and `assembleResults` keys them under `designs` / `aggregate.byOption`.

- **Options run sequentially within a participant** — they are a dependency chain (Option 3
  reuses Option 2's solved premium; Option 4 is floored at it). **Participants run in parallel**
  in a bounded pool (`DEFAULT_RUN_CONCURRENCY = 4`, overridable per run).
- **Face for Options 2–4 is read back** off `summary.initial_face_amount` (now parsed as
  `IllustrationResult.initialFaceAmount`) — it is the *answer*, not an input.
- **COLI-only participants get Option 1 only** — ⚠ **placeholder, see Backlog below.**
- **Progress counts options, not participants**, so a large census does not appear to stall.
- **Output is ordered by census, not completion**, so a re-run reproduces an identical snapshot
  despite the parallelism (NFR11).
- **Fail-fast preserved**: the first error aborts in-flight calls in the other workers rather
  than leaving them running.

Verified end to end against the live engine: a 3-participant census (2 SERP+COLI, 1 COLI-only)
produced 9 designs in ~1.6s and a snapshot that validates against `ResultsSchema`. The young
participant's Option 4 stood on its own solve while the older one floored to Option 2 — the
age-driven divergence predicted above, showing up in a real run.

**Next:** bind report pages 4.3 / 4.5 to `aggregate.byOption`, and surface `solveFeasible` /
`gptAdjusted` / `lapseYear` so a capped or infeasible design cannot reach a page looking clean.

### ⚠ BACKLOG — mixed-membership participants (SERP-only / COLI-only)

**Not designed yet. The current behaviour is a placeholder chosen to keep the orchestrator
running, not an operator decision** (operator, 2026-07-18: "one of several approaches I want to
take — not ready to build that just yet").

What ships today, in `run.ts`:

| membership | today's behaviour |
|---|---|
| SERP + COLI (`BOTH`) | all four options |
| COLI-only | **Option 1 only** — skipped for 2–4 |
| SERP-only | no COLI design at all (correct — there is no policy) |

**Why COLI-only is skipped for Options 2–4:** those options exist to pay a SERP benefit out of
the policy. A COLI-only participant has no benefit stream, so there is nothing to distribute, and
the Option 2 solve degenerates — with no distributions pinning the design, a `net_account_value`
target shrinks face and premium together toward a trivial policy (live: premium $1,612 / face
$20,496). Skipping avoids printing a meaningless design; it does **not** answer what a COLI-only
participant *should* contribute to Options 2–4.

**Approaches to weigh when this comes up** (operator has others in mind):

1. Skip, as today — Options 2–4 cover fewer lives than Option 1, so the option comparison on
   pages 4.3 / 4.5 is not like-for-like. `policyCount` on `aggregate.byOption` already records
   the difference, so the report *can* disclose it.
2. Fund COLI-only lives in Options 2–4 with no distributions (effectively Option 3's shape), so
   every option covers every COLI life.
3. Allocate a share of the aggregate SERP benefit to COLI-only lives so they carry
   distributions too.

Whichever is chosen, the like-for-like question on the option comparison needs an answer, since
Option 1 currently covers more lives than Options 2–4.

**Options 2–4 — how they map** (operator-confirmed 2026-07-18):

- **Option 2** — `distribution_periods` carrying the SERP benefit stream +
  `distribution_type: "withdraw_to_basis_then_loan"`, premium solved to $1,000 net account
  value at age 100. Year-varying benefits can use `distribution_schedule` instead.
  **Needs its own face sizing — see the Option 4 note below.** Watch for `gptAdjusted`: in the
  under-sized range the solved premium is GPT-capped and non-monotonic in face (live: $52k at
  $750k face vs $28k at $1M face), so a capped result is not a usable design.
- **Option 3** — no solve; Option 2's solved premium as a `specify` window, no distributions.
- **Option 4** — Option 2 *plus* a floor on the face: the death benefit at life expectancy must
  be **at least** cumulative premiums paid (over-recovery is fine). Two unknowns, and the API
  allows one solve per call, so this needs an outer loop on our side: trial face → engine
  solves premium → compare `net_death_benefit` at LE against cumulative premium → raise face
  and repeat. A `mode: "face"` solve does **not** help — it returns the *largest* face reaching
  the target, which for a death-benefit metric finds the lapse boundary, the opposite end.

  **Live-verified with distributions included (2026-07-18) — this is the key finding for
  Options 2 AND 4.**

  ⚠ **Options 2 and 4 cannot use the cost-recovery face.** It is not a calibration nit — it is
  structurally infeasible. 7702 caps *total* premium at roughly the guideline single premium,
  which scales with face. At the Option 1 face ($474k for a 45M) the GSP is only ~$135k, and
  $135k cannot fund $600k of SERP distributions. The engine confirms it: premium pinned at the
  7-pay limit, `gpt_adjusted` and `mec_adjusted` both true, policy **lapses in year 32**, solve
  infeasible. **Face drives maximum fundable premium, which drives supportable distributions**
  — so Options 2 and 4 need their own, much larger face sizing.

  Face sweep, 45M Standard NT @5.75%, $30k/yr draws policy years 21–40, LE 85 (year 40):

  | face | Option 2 (net AV $1k @ 100) | Option 4 (recovery @ LE) |
  |---|---|---|
  | $474k (Opt 1 face) | **infeasible**, lapse yr 32 | **infeasible**, lapse yr 32 |
  | $750k | feasible, GPT-capped | infeasible, GPT+MEC capped |
  | $850k–$1.0M | feasible | **floor binds exactly, slack $0** |
  | ≥$1.05M | feasible | floor goes slack; lapses at LE |

  **Option 4 has a well-defined answer, and it is the binding band.** Between ~$850k and
  ~$1.0M the solve lands `net_death_benefit` at LE *exactly* equal to cumulative premium
  (slack $0.00 at every point tested), and from $900k up the policy **stays in force**. Above
  ~$1.05M the constraint goes slack, the solve degenerates to "minimum premium that survives to
  LE," and the contract lapses precisely in year 40 — fragile, and strictly worse. So the face
  rule is: **the largest face at which the recovery constraint still binds** (~$1.0M here),
  which is also the in-force end of the band.

  Caveat: `gpt_adjusted` is true throughout the binding band, so the guideline limit is part of
  what sets the answer. The result is well-defined but the GPT interaction should be understood
  before it is presented as a design.

**Remaining gaps (API-side):**

- **No taxable-income modelling.** Distributions are only tax-free if the contract is not a MEC;
  the engine reports a MEC but does not change the distribution math. Check `mecYear`.
- **One solve per call** — face sizing stays our own calculation (see below).
- **`mec_handling: "avoid"` silently caps premium**, so a "successful" solve can carry a quietly
  reduced premium. `solveFeasible` / `gptAdjusted` / `mecAdjusted` are now on `ParticipantResult`
  and should be surfaced in the UI.
- **`lapseYear` is non-null for every Option 1 policy by design** — solving to $1,000 at age 100
  leaves nothing behind, so the contract lapses the following year (live: `lapse_year: 56`,
  age 101). Do **not** surface this as an error; only a lapse *before* life expectancy matters.
  Note the projection also stops at lapse, so the stream is ~56 rows, not to age 121.
- **Rate tables are placeholders** — structurally correct, not product-accurate.

**Our-side calc item (not API):** the cost-recovery funding strategy sizes face = *after-tax
benefits only*, not benefits + premiums. So Option 1's aggregate cash flow doesn't land at 0 and
cost recovery doesn't land at 100% (currently ~112%). Calibration decision pending.

---

## 6. How to resume

```bash
# dev server (do NOT use bash for this; use the preview tooling)
#   .claude/launch.json has: dev (5173), dev-alt (5199), dev-verify (5251)
npm run check      # svelte-check — must be 0 errors
npm test           # vitest — currently 191 passing
```

**Verification pattern used throughout:**
1. Start the dev server via the preview tool, open `/report/legacy`.
2. Inspect via `javascript_tool` DOM queries — assert on rendered values, and check **both**
   dimensions against the sheet:
   - height ≤ **960px** portrait / **720px** landscape
   - **width**: content `scrollWidth` ≤ the page's `clientWidth` minus padding
   Checking height alone missed the Appendix C ledgers overflowing horizontally for two commits.
3. Console errors must be clean — and note that a Svelte render error (e.g. a duplicate
   `{#each}` key) **fails silently**: the URL changes, the old page stays, nothing logs. Install
   a `window.addEventListener('error', …)` before navigating if a page mysteriously does not load.
4. Verify with a quote that **has results** — an unrun quote leaves data-driven pages nearly
   empty, which hides layout problems.

**Landscape sheets:** a registry entry can set `landscape: true` (see the Appendix C ledgers).
That renders 10in × 7.5in on screen and uses a named `@page` rule in print. Wide tables should
also carry `width: 100%` so they compress rather than clip if a print path ignores named pages.

**Gotchas learned:**
- Svelte re-renders **asynchronously** — set an input value in one JS call, then click/read in a
  *separate* call, or you'll act on stale state.
- Shared test fixtures live in `src/lib/testing/fixtures.ts` (`makeInsured` / `makeInsuredDraft` /
  `makeSettings`) — use these when adding domain fields so suites don't break one-by-one.
- The active quote persists to `sessionStorage` (`schiff:active-quote`) and is schema-validated on
  hydrate — this is a deliberate **stopgap**; a proper storage layer is planned.

---

## 7. Operator decisions already made (don't re-litigate)

- Smoker column → the `smoker` field (Nonsmoker/Smoker), not risk class.
- Census → **SERP participants only**.
- Boilerplate/disclosure text → stays **hardcoded** (firm-standard, not per-quote).
- Section page numbers ("1.1", "2.1"…) → hardcoded per page is fine for now.
- TOC structure → taken as fact; no dynamic add/remove.
- Buy-sell lines on page 4.3 → **excluded** (errors in the sample PDF).
- Earnings Summary section on page 4.5 → **excluded** (redundant to the cash-flow rows).
- Benefit calc rule (when wired): **additive** — Fixed $ + (%FAS × FAS) + (UnitCredit × service × FAS).
