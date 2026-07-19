# Legacy Report — Data Gaps

A running checklist of data points the Legacy Report needs but the app cannot yet supply
(missing input, missing calculation, or missing model field). We resolve these together as we go.

> **Resuming?** Read [HANDOFF.md](./HANDOFF.md) first — status, architecture, operator decisions,
> and the **API contract additions** the report needs from the calculator.

**How this works**
- Each report page is added to `legacy-registry.ts` as a component under `pages/`.
- Where a value exists on the derived `ReportModel` ([../report-data.ts](../report-data.ts)), the page binds to it.
- Where it does not, the page renders a labelled placeholder (e.g. `— TBD —`) and the item is logged below.
- Resolving a gap means: add the input (setup form / census grid), add the calculation (engine), extend
  `ReportModel`, then bind the page to the new field and check the item off.

**Status legend:** ☐ open · ⧗ in progress · ☑ resolved

---

## Open questions (cross-cutting)
- **"Varies" rule (operator-set):** any per-participant value shown at plan level prints the single value when uniform across SERP participants, else the literal **"Varies"**. Implemented in `report-data.ts` (`commonSerpValue`). Applied to NRA / ERA / salary scale (page 2.4) ☑ and to benefit-formula terms + survivor formula (page 2.2) ☑.

## Decisions (operator, 2026-07-17)
- ☑ **Smoker column** → show the `smoker` field (Nonsmoker/Smoker), not risk class.
- ☑ **Census scope** → SERP participants only (no COLI-only rows).
- ☑ **Boilerplate/disclosure text** → leave hardcoded (firm-standard, not per-quote).
- ☑ **Section page numbers** ("1.1", "2.1"…) → hardcoded per page is fine for now.

## ⚠ Missing subsystem — GAAP accounting engine

**Ten pages are full-page placeholders** because the app has no accounting layer: 5.2-1…5.2-4
(Annual Impact on Earnings) and 6.1…6.6 (SERP/COLI entry worksheets, audit trail, cost
allocation). The engine computes the *cash* benefit stream and the COLI illustration; it does not
compute the **accounting** view.

Rather than repeat a gap list per page, the underlying quantities are listed once here. Every
placeholder column on those ten pages is one of these, or arithmetic on them:

| Quantity | Notes |
|---|---|
| **Service cost** | Annual accrual of benefit earned. Per participant *and* consolidated (6.6 needs the split). |
| **Interest cost / accrual** | On the projected benefit obligation. |
| **Projected Benefit Obligation (PBO)** | Balance, rolled forward — distinct from the NPV the engine already computes. |
| **Prior service cost** | Initial recognition, plus level amortisation and the unrecognised balance (BOY/EOY). |
| **Pension expense** | Service + interest + amortisation. |
| **Deferred tax asset / expense** | Tax effect of the above at `corporateTaxRate`. |
| **AOCI balance & amortisation** | Accumulated other comprehensive income, before and after tax benefit. |
| **Unfunded accrued pension cost** | Annual and EOY balances (audit trail columns 6–7). |
| **Mortality weighting** | Survival-weighted expense; also the "% living at average life expectancy" footnote on 5.2. |
| **COLI earnings recognition** | Per FASB ASC 325-30 cash-surrender-value method: premium, CSV change, death proceeds → earnings. The **inputs already exist** on `ParticipantResult.designs[].illustrationYears`; only the accounting treatment is missing. |

Two structural notes that will matter when this is built:

- **Totals are life-of-program, not the displayed window.** 5.2's totals row is explicitly "not
  limited to the 30 years displayed", so the projection horizon must exceed the print horizon.
- **Per-participant allocation is required**, not just consolidated figures — page 6.6 splits
  pension expense by participant with a percentage-of-total column.

This is the largest remaining gap in the report. Per-page detail below is deliberately brief:
the structure is reproduced, and every figure traces back to this table.

## Calculations to add (engine / derivations)

☑ **Foundational step done (2026-07-17):** the full per-policy-year illustration stream is now
persisted on `ParticipantResult.illustrationYears` and survives serialization. This unlocked the
page 4.5 cash-flow derivation and is available to the accounting pages still to come.

Still needed by page 3.2 (Projections). Some are available post-run; others need new pure derivations so they show without requiring a full model run.
- ☐ **Salary at retirement** — projected salary at retirement age = recognized salary × (1+growth)^(years to retirement). Engine computes the salary path internally but it is not exposed. Needs a derivation (or exposure) → `LegacyProjectionRow.salaryAtRetirement`.
- ☐ **5-Year Final Average Salary** — the engine's FAS (`finalAverageSalary`). Currently only present after a run (via results). Needs a pure derivation to show pre-run.
- ☐ **Initial pre-retirement survivor benefit** — not computed anywhere yet (uses recognized salary × survivor tiers, death in current year). Needs an engine calc.
- ⧗ **Annual SERP benefit** & **Total SERP benefit to life expectancy** — available from results after a run (`annualBenefit`, `totalBenefitCost`); shown when present, else "—". A pure pre-run derivation would let them show without a run.
- Note: "Fixed Benefit" participants (benefitPercentage 0 & benefitAmount > 0) show "Fixed Benefit" in the % FAS column; their benefit amounts aren't calculated yet (fixed-benefit calc is post-MVP).

## Missing input fields (to add to the app)
- ☑ **Plan Effective Date** — RESOLVED. Added `effectiveDate` (optional ISO date) to `ModelSettings`, with a date input in the Model settings form; surfaced on `ReportModel.planSpecs.effectiveDate` (long form). Page 2.4 shows it, or "— not set —" until entered.

## Per-page gaps

### 1. Cover — `pages/LegacyCoverPage.svelte`
Source: `A1 Cover.pdf`
Operator notes: "just a simple cover page"
Bindings: company name → `report.companyName`; date → `report.runDate` (valuation date).
Gaps:
- ☑ _None._ All dynamic values map to existing `ReportModel` fields; the rest is fixed boilerplate.

### 2. Title Page — `pages/LegacyTitlePage.svelte`
Source: `A3 TitlePage.pdf`
Operator notes: "title page with some disclosures. Charles P Johnson & Associates is the Company Name."
Bindings: company name → `report.companyName`. Title lines + two disclosure paragraphs are fixed boilerplate (reproduced verbatim).
Gaps:
- ☑ _None._ Disclosure text stays hardcoded (operator-confirmed).

### 3. Disclosure (2 sheets) — `pages/LegacyDisclosurePageA.svelte`, `pages/LegacyDisclosurePageB.svelte`
Source: `A4 Disclosure.pdf` (shared text in `pages/disclosure-text.ts`)
Operator notes: "long static disclosure page. you can split across 2 pages if needed." → split 5 / 3 paragraphs.
Bindings: footer date → `shortDate(report.asOf)`. All 8 paragraphs are fixed boilerplate (reproduced verbatim).
Gaps:
- ☑ _None._ Boilerplate stays hardcoded (operator-confirmed).

### 4. Table of Contents — `pages/LegacyTocPage.svelte`
Source: `A5 ToC.pdf`
Operator notes: "Take the structure as fact. No need to customize add/remove sections at this point."
Bindings: company name → `report.companyName`; footer date → `shortDate(report.asOf)`. The outline (sections 1–6, A–H) is a hardcoded static structure.
Gaps:
- ☑ _None._ Corrected source typo "Comparision" → "Comparison". Section ids are static; if the TOC should later reflect the actual generated legacy pages/page numbers, that's a future enhancement (deferred per operator).

### 5. Considerations — `pages/LegacyConsiderationsPage.svelte` (section page 1.1)
Source: `A6 Considerations.pdf`
Operator notes: "Another boring static text page."
Bindings: footer date → `shortDate(report.asOf)` (via `LegacyPageShell`). Title + six paragraphs are fixed boilerplate.
Introduced `LegacyPageShell` (shared interior-page footer: "Page X.Y" + date). Page number "1.1" is currently a hardcoded prop.
Gaps:
- ☑ Section page numbering hardcoded per page — operator-confirmed fine for now (deferred).

### 6. SERP Actuarial Modeling System — `pages/LegacyAmsPage.svelte` (section page 1.2)
Source: `B1 SERP AMS.pdf`
Operator notes: "Actuarial Modeling System Summary page. Just static information."
Bindings: footer date → `shortDate(report.asOf)`. Title, paragraphs, and 9-item bullet list are fixed boilerplate.
Footer mirrors page 1.1 (date left / page no. right) — added `pageNoSide` prop to `LegacyPageShell`.
Gaps:
- ☑ _None._

### 7. SERP Benefit Formula — `pages/LegacyBenefitFormulaPage.svelte` (section page 2.1)
Source: `B2 SERP Benefit Formula.pdf`
Operator notes: "Static text page. describes how benefits can be structured."
Bindings: footer date → `shortDate(report.asOf)`. Title + four paragraphs are fixed boilerplate.
Introduced `LegacyProsePage` (reusable centered-title + justified-paragraphs layout on the shell) for the recurring static text pages.
Gaps:
- ☑ _None._

### 8. Participant Benefits Formula (spec) — `pages/LegacyBenefitFormulaSpecPage.svelte` (section page 2.2)
Source: `B3 Benefit Formula.pdf` — **first data-driven page.**
Operator notes / mapping:
- Payout period = `maxBenefitYears`
- Guaranteed minimum payout period certain = `minBenefitYears`
- Survivor: `survivorTier1Pct` of salary for `survivorTier1Years`; plus `survivorTier2Pct` for next `survivorTier2Years`
- Guaranteed (survivor) payout period certain = `survivorTier1Years` + `survivorTier2Years`
Model change: added `benefitFormula` to `ReportModel` ([../report-data.ts](../report-data.ts)) — a representative-participant projection of these per-participant fields.
Bindings: company → `report.companyName`; footer date → `shortDate(report.asOf)`; terms → `report.benefitFormula`.
Gaps / notes:
- ☑ **"Varies" rule applied.** Terms are per-participant; when uniform across SERP participants the value shows, else "Varies" (payout period, guaranteed minimum, guaranteed survivor certain). The survivor formula shows "Varies by participant" when any survivor term differs.
- Minor format deviations from source (acceptable): survivor % uses whole percents ("100%"/"50%") vs. source "100.0%"/"50%"; year counts rendered numerically (e.g. "1 year") vs. source words ("one year"). Flag if you want exact.

### 9. Plan Specifications and Actuarial Assumptions — `pages/LegacyPlanSpecsPage.svelte` (section page 2.3)
Source: `B4 Plan Specs.pdf`
Operator notes: "Another static page."
Bindings: footer date → `shortDate(report.asOf)`. Title + six paragraphs are fixed boilerplate (uses `LegacyProsePage`).
Gaps:
- ☑ _None._ (Added a period to the source's unterminated "…assist in this Annual Review" sentence.)

### 10. Plan Specs & Assumptions Overview — `pages/LegacyPlanSpecsDetailPage.svelte` (section page 2.4)
Source: `B5 Plan Specs Details.pdf`
Operator mapping:
- Long-Term Marginal Tax Rate = `corporateTaxRate`; Accounting Liability Interest Discount Rate = `npvDiscountRate`; Hypothetical COLI Net Rate of Return = `creditingRate`
- NRA = `retirementAge` (or "Varies"); ERA = NRA − 5 (or "Varies"); Salary Scale = `salaryGrowthRate` (or "Varies")
- Plan Effective Date = **missing input** (see Missing input fields above)
Model change: added `planSpecs` to `ReportModel` + `commonSerpValue` "varies" helper.
Rates formatted to 2 decimals ("21.00%"); salary scale to 1 decimal ("3.0%") to match source. Much of the page (participation criteria, accounting methods, mortality, AMT, COLI products) is static boilerplate. Mortality "generally age 84" kept static (not wired to per-participant `lifeExpectancy`).
Gaps:
- ☑ Plan Effective Date — resolved (see Missing input fields above); now shows the model-settings date or "— not set —".
- Note: mortality "age 84" and the FASB/IRC references are static; wire to data only if you want them dynamic.

### 11. SERP Plan Census — `pages/LegacyCensusPage.svelte` (section page 3.1)
Source: `C1 Census.pdf` (page 1 of 2)
Operator mapping: participant = first+last; gender = `gender`; smoker = **[risk class]** (see note); DOB = `dateOfBirth`; age = calc (nearest birthday **as of plan effective date**); DOH = `dateOfHire`; years of service = calc (as of effective date); recognized salary = `currentSalary`.
Model change: added `legacyCensus` to `ReportModel`, computed as of `effectiveDate` (fallback: valuation date). Totals = SERP/COLI counts + SERP salary sum.
Gaps / notes:
- ☑ Smoker column shows the `smoker` field (Nonsmoker/Smoker) — operator-confirmed.
- ☑ Census lists SERP participants only — operator-confirmed.

### 12. Plan Participant Summary — Projections — `pages/LegacyProjectionsPage.svelte` (section page 3.2)
Source: `C1 Census.pdf` (page 2 of 2)
Operator mapping:
- Age at retirement = greater of `retirementAge` and (age + `benefitWaitingPeriod`) ✅
- Service years at retirement = years of service + (age at retirement − age) ✅
- Annual SERP % FAS = `benefitPercentage` (or "Fixed Benefit") ✅
- Salary at retirement / 5-Yr FAS / Initial survivor benefit / Annual SERP benefit / Total SERP benefit → see "Calculations to add" above. Rendered as "—" until wired (annual/total/FAS auto-fill after a run).
Model change: added `legacyProjections` + `legacySerpBenefitTotal` to `ReportModel`.

### 13. Financial Overview (2 sheets) — `pages/LegacyFinOverviewPageA.svelte`, `pages/LegacyFinOverviewPageB.svelte` (pages 4.1, 4.2)
Source: `D1 Fin Overview.pdf`
Operator notes: "static text."
Bindings: footer date → `shortDate(report.asOf)`. Title + prose (with "Option 1–4"/"Note" sub-headings) are fixed boilerplate. Introduced `LegacyRichProsePage` (title + heading/paragraph blocks).
Gaps:
- ☑ _None._

### 14. Overview — SERP Benefit Financing — `pages/LegacyFundingOverviewPage.svelte` (section page 4.3)
Source: `D2 Funding Options - 2.pdf`
Operator mapping:
- Projected SERP Benefit Payments = sum of all benefits = `results.aggregate.totalBenefitCost` (report.totalBenefitCost) ✅ (post-run)
- Tax deduction rate = `corporateTaxRate` (report.taxRateDisplay) ✅
- Tax deduction savings = payments × rate = `report.taxDeduction` ✅ (post-run)
- After-tax cost = payments − savings = `report.afterTaxCost` ✅ (post-run)
- Option 1 premium = total premium from illustrations = `report.totalFirstYearPremium` ✅ (post-run)
- Option 1 avg face = total face ÷ COLI count (`report.option1AvgFace`) ✅ (post-run)
Model change: added `hasResults` + `option1AvgFace` to `ReportModel`. Results-gated values show "—" pre-run.
**Excluded per operator:** the two buy-sell lines ("Includes $467,000 … buy-sell arrangement" and "SERP participants includes 2 Buy-Sell participants") — sample errors; also dropped the associated `**` marker.
Gaps:
- ☑ **Option 2 / 3 / 4 premiums** — RESOLVED (2026-07-18). Bound to `ReportModel.fundingOptions` (per-option totals from `Results.aggregate.byOption`).
- ☑ **Option 2 & 3 / Option 4 average face** — RESOLVED. Shown per option (that option's total face ÷ its policy count), no longer grouped as "2 & 3".
- Note: options can cover **different numbers of policies** (COLI-only lives get Option 1 only), so the page prints a footnote disclosing the per-option counts rather than implying a like-for-like comparison. See the mixed-membership backlog item in [HANDOFF.md](./HANDOFF.md) §5.
- Note: an option with any **infeasible solve** prints "—" plus a "Not shown" line instead of a figure. An infeasible solve still returns 200 with a best-effort number that can be wildly out of range (live: an engine overflow of ~1.8e22), so averaging it in would print a plausible-looking figure that is not a buyable design.
- Notes: "Projected Annual COLI Premium **Range**" low/high endpoints from the source were not rendered — ambiguous derivation; the four Option rows carry the premiums. Premium payment period shown as static "ten years" (source); ideally sourced from the illustration later. Tax-rate label uses whole-percent ("20%") vs source "21.0%".

### 15. Cash Flow Summary — Life of Plan — `pages/LegacyCashFlowSummaryPage.svelte` (section page 4.5)
Source: `D5 CF Summary.pdf`
Operator mapping (Option 1 only; Options 2–4 TBD — same as page 4.3):
- Net Benefits Paid from Company Cash Flow = SERP Benefits − COLI Distributions → for Opt 1 = `afterTaxCost` (outflow) ✅
- Net Benefits Paid from COLI Assets = total COLI distributions = 0 for Opt 1 ✅
- COLI Premiums = total COLI premiums → **gap** (only first-year premium is available; needs life-of-plan premium stream)
- COLI Death Benefits = total death benefits at LE = `totalDeathBenefit` ✅
- COLI Loans and Withdrawals = **gap** (operator: projection API doesn't return withdrawals)
- Net Program Aggregate Cash Flow = Net benefits paid + net COLI gain/(loss) → **gap** (needs total premiums → net gain/loss)
- COLI Cost Recovery = −Net benefits paid / net COLI gain/(loss) → **gap**
**Excluded per operator:** the entire **Earnings Summary** section (redundant to the cash-flow rows).
Resolved (2026-07-17): illustration streams are now persisted (`ParticipantResult.illustrationYears`), and Option 1 is derived in `report-data.ts` (`cashFlowOption1`) → `ReportModel.cashFlow`:
- ☑ Total COLI premiums — summed over the premium-payment period (`ModelSettings.premiumYears`, default 10).
- ☑ COLI death benefits — taken at each participant's life-expectancy age from the stream.
- ☑ Net COLI gain/(loss) = death benefits − premiums; Net program aggregate cash flow = net benefits paid + net gain/loss; COLI cost recovery = −net benefits paid / net gain/loss.
Remaining gaps:
- ☑ **COLI policy loans & withdrawals** — RESOLVED (2026-07-18). lifeproj v1 returns `loans[]`; the adapter folds it into the year rows as `withdrawal` / `loan` / `loanBalance`. Still 0 for Option 1; the data is there for Options 2/4.
- ☑ **`premiumYears` → illustration API** — RESOLVED (2026-07-18). Sent as a `premium_periods` window (`{1..premiumYears, kind:"solve"}`), so the engine's stream now stops premiums after N years and our summation matches the returned cash values.
- ☑ **Options 2 / 3 / 4** — RESOLVED (2026-07-18). All four columns derive from their own persisted illustration streams via `ReportModel.cashFlowByOption`. The benefits total is constant across options (they differ in *where* the money comes from), split between company cash flow and COLI assets by however much the policies distributed. A column whose option had any infeasible solve is suppressed entirely, with a "Not shown" note.
- Note: face sizing (cost-recovery) targets after-tax benefits only, not benefits + premiums, so Option 1 aggregate/cost-recovery won't hit exactly 0 / 100% (a face-sizing calibration item). "Net Benefits Paid" uses `afterTaxCost` as an approximation of actual net cash flow.

### 16. Earnings Impact — `pages/LegacyEarningsImpactPage.svelte` (section page 5.1)
Source: `E1 Earnings Imp Desc.pdf`
Operator notes: "Earnings impact. static text only page."
Bindings: footer date → `shortDate(report.asOf)`. Title + five paragraphs are fixed boilerplate (uses `LegacyProsePage`).
Gaps:
- ☑ _None._

### 17. Annual Impact on Earnings — Summary (4 sheets) — `pages/LegacyEarningsLedgerOption{1,2,3,4}Page.svelte`
Source: `E3 Earnings Imp Ledger.pdf` (section pages 5.2-1 … 5.2-4, one per funding option)
Operator notes: "dependent on accounting calcs we haven't built yet, so just put in the placeholder
for the page, and note each of the columns as a data gap for us to build."

**Status: placeholder page — every figure renders "—".** Shared layout in
`pages/EarningsLedgerSheet.svelte`; the four option pages are thin wrappers differing only in
title, page number, and closing note. Structure, column headers, totals row and footnotes are
reproduced from the source so only the numbers need wiring.

The **only** column that resolves today is the calendar year (30 years from the valuation year).

**Columns to build — each needs a GAAP accounting derivation the app does not have:**
- ☐ **[1] Pre-Tax SERP Earnings Impact** — annual accrual of SERP benefit expense under GAAP.
  Needs the accounting liability roll-forward (service cost + interest cost on the projected
  benefit obligation), which is distinct from the cash benefit stream the engine already
  produces. Sign convention in the source is negative (an expense).
- ☐ **[2] Benefit Tax Deduction** — the tax effect of column [1] at the corporate rate.
  `corporateTaxRate` exists; the base ([1]) does not. Source shows a flat ~21% of [1].
- ☐ **[3] Net SERP Earnings Impact** — `[1] + [2]`. Falls out once [1] and [2] exist, but note
  the source marks it `**`: it "reflects impact of actuarial mortality projections required under
  GAAP", i.e. it is mortality-weighted, not a plain sum of the two columns for a single life.
- ☐ **[4] Hypothetical COLI Earnings Impact** — annual earnings from the policy: cash-value
  growth less premium expense, plus death-benefit gains, per option. The per-year illustration
  stream needed for this **is already persisted** (`ParticipantResult.designs[].illustrationYears`,
  carrying account value, CSV, death benefit, premium, withdrawals and loans), so this is the
  closest column to buildable — it needs the accounting treatment defined, not new engine data.
- ☐ **[5] Combined Earnings Impact** — `[3] + [4]`. Falls out once both exist.
- ☐ **Totals row (`^`)** — totals over the **life of the program**, explicitly *not* the sum of
  the 30 displayed years. Needs the full-horizon projection, not just the displayed window.
- ☐ **Mortality-survival percentage** (footnote `**`) — the source states "64.3% of plan
  participants are projected to be living at the beginning of the year of average life
  expectancy". Needs a survival calculation from the mortality table. The page currently prints a
  neutral wording instead of a number.
- ☐ **Option 2's `~` note figures** — total premiums paid, net benefits paid from Company cash
  flow, and COLI mortality gains in excess of those expenses. All three are per-option totals;
  the first two are close to values already derived for page 4.5 (`cashFlowByOption`), the third
  is new. The page currently prints the sentence without figures.

Notes / decisions:
- ☑ **Year range keys off the plan effective date** (operator-confirmed 2026-07-18), falling back
  to the valuation date when none is set — the same `legacyRefDate` reference pages 3.1/3.2 use,
  so the ledger lines up with the census and projections. 30 calendar years (source: 2026–2055).
- The source's "SERP-PLUS Program" wording is reproduced verbatim in the closing note.
- Option 1's note says COLI generates credits "in the second year"; Options 3 and 4 say "first
  year". Reproduced per option. The source also asserts the combined impact "turns positive by
  2056" — that is a **sample-specific claim**, so it is omitted rather than hardcoded.

### 18. Accounting worksheets (6 sheets) — `pages/Legacy{SerpEntries,SerpReconciliation,SerpNotes,ColiEntries,AuditTrail,CostAllocation}Page.svelte`
Source: `F1 SERP Summary.pdf` (6.1–6.3), `F2 COLI Summary.pdf` (6.4), `F3 Audit Trail.pdf` (6.5),
`F4 Cost Allocation.pdf` (6.6)
Operator notes: "4 accounting heavy pages in a row… I want the accounting pages roughed-in, but
don't overbuild until we have a chance to build the GAAP layer."

**Status: placeholder pages — every figure renders "—".** All six share one config-driven
component, `pages/LegacyAccountingSheet.svelte` (label column + N numeric columns, optional
period group headers, notes). Six near-identical tables would have been the wrong trade while
the contents are all placeholders.

**What is real today** (so it does not get rebuilt later):
- **Period columns** on 6.1–6.4 — First Month / first Calendar Year / next Calendar Year, derived
  from the plan effective date via `accounting-periods.ts`.
- **Calendar years** on 6.5 — 30 from the same reference date, matching the 5.2 ledger.
- **Participant names and the year** on 6.6 — from `legacyCensus` (SERP participants only; a
  COLI-only life carries no pension expense to allocate).
- **Option labels** on 6.4 — from the funding registry, so they track the options the app designs.
- **Row labels, entry descriptions and the ASC 325-30 note** — reproduced from the source.

**All figures** → see the GAAP accounting engine table at the top of this file.

Open questions:
- ☐ **Does the COLI worksheet need continuation sheets for Options 3 and 4?** The source sheet
  (6.4) shows **only Options 1 and 2**, so only those are rendered. Rendering all four overflows
  the page, which suggests the source splits them onto sheets we have not been given.
- ☐ **Note 1 / Note 2 references** on 6.1 point at notes not present in the supplied page —
  confirm whether they live on a sheet we have not seen.

### 19. Summary of Benefits (sample statement) — `pages/LegacyBenefitStatementPage.svelte`
Source: `G1 Ben Statement.pdf` (Appendix A)
Operator notes: "This page is a sample benefit statement. Produce for the first person in the
census. Many values can be pulled from input page or existing calcs." — plus: survivor benefits
are not wired up, but the inputs exist and the calc comes after the report pages are loaded.

Rendered for **`census[0]`**, via `ReportModel.benefitStatement`. Nearly everything resolves:

| Statement line | Source |
|---|---|
| Name, date of birth, recognized salary | `Insured` inputs |
| Statement date | `legacyRefDate` (plan effective date) — matches the accounting sheets' plan start date |
| Current age (nearest birthday) | computed at the statement date |
| Normal retirement age, salary growth | `Insured` inputs |
| Defined benefit % / averaging period | `benefitPercentage`, `fasAveragingPeriod` |
| Annual SERP benefit, projected FAS | `ParticipantResult` (post-run; "—" before) |
| Guaranteed / projected totals | annual benefit × `minBenefitYears` / `maxBenefitYears` |
| Survivor schedule (tier %s and years) | `survivorTier1Pct/Years`, `survivorTier2Pct/Years` |

Gaps:
- ☐ **Survivor benefit totals** (both lines) — render "— not yet calculated —". The calculation is
  not written; **all inputs exist**. From the sample, the arithmetic appears to be:
  - *death this year* = current salary × (tier1Pct × tier1Years + tier2Pct × tier2Years)
    — sample: 201,760 × (1.0×1 + 0.5×2) = 403,520 ✓
  - *death in the year prior to retirement* = the same multiple applied to **salary projected to
    age `retirementAge − 1`** — sample: 201,760 × 1.03^10 × 2 = 542,297 ✓
  This is unverified inference from one sample, so confirm before implementing. It also needs
  **projected salary at an arbitrary age**, which is the same missing derivation as "Salary at
  retirement" on page 3.2 — build once, use twice.

Notes / deviations:
- Year counts render numerically ("5-year average", "for 5 years") where the source spells them
  out ("five-year", "for five years") — consistent with pages 2.2 / 3.2.
- Percentages use the shared `formatPercent` ("60%") vs the source's "20.00%" / "100.0%".
- `LegacyPageShell` gained a `numbered` prop so this sheet's footer reads "Appendix A" rather
  than "Page Appendix A"; every other page is unchanged.
- Statement covers `census[0]` regardless of membership. If the first member were COLI-only they
  would have no SERP benefit and the post-run figures would be zero — worth revisiting if
  statements are ever generated for the whole census rather than as a sample.

<!-- template — copied per page as sections arrive
### <n>. <Page title>  — `pages/<Component>.svelte`
Source: <pdf name>
Operator notes: <verbatim notes provided with the page>
Gaps:
- ☐ <data point> — needs: <input | calc | model field>. Notes: <…>
-->

