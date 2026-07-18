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

## 2. Progress — 18 pages built (~half the report)

Source sections A1 → E1. Registered in [legacy-registry.ts](./legacy-registry.ts) in this order:

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

**Next up:** remaining sections per the TOC — accounting entry worksheets (A/B/C), and the
Appendix set (D–H: participant summaries, survivor indemnification, cash-flow options, accounting
for SERP programs, informational overviews, hypothetical COLI value, mortality comparison, glossary).

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

## 5. ⚠ API contract — what the report needs from the calculator

Current wire contract lives in `src/lib/server/lifeproj/wire-schemas.ts` (POST `/api/v1/project`):

- **Request:** `issue_age, gender(M|F), health, face_amount, product_type?, db_option?,
  annual_premium?, premium_mode?, credited_rate?, qualification_test?, maturity_age?, solve{value,when,basis?}`
- **Response:** `report[]{policy_year, age, premium, account_value, death_benefit}`,
  `summary{initial_annual_premium, guideline_single_premium, guideline_level_premium_a, guideline_level_premium_b}`,
  `gpt_adjusted`, `mec_adjusted`

**Requested additions (these block report pages):**

1. **Premium payment period** *(request field)* — e.g. `premium_years`. We have the operator input
   (`ModelSettings.premiumYears`) but no way to send it, so the engine currently charges premiums
   **every year** of the stream. We bound the premium *summation* ourselves, which makes cash
   values slightly inconsistent with a bounded premium period. Once the API accepts it, send it
   from `run.ts` → `buildCostRecoveryDesignRequest` and drop the local workaround note.
2. **Loans / withdrawals** *(response, per policy year)* — needed for the "COLI Policy Loans and
   Withdrawals" row and for funding Options 2 & 4. Not currently returned at all.
3. **Cash surrender value** *(response, per policy year)* — the wire report has no CSV field, so
   the adapter currently **uses `account_value` as CSV** (see the comment in
   `src/lib/server/lifeproj/adapter.ts`). A real CSV field would remove that approximation.
4. **Funding strategies 2 / 3 / 4** — Options 2–4 on pages 4.3 and 4.5 need additional
   illustrations with different premium/withdrawal patterns. Only Option 1 (Cost Recovery) exists.

**Our-side calc item (not API):** the cost-recovery funding strategy sizes face = *after-tax
benefits only*, not benefits + premiums. So Option 1's aggregate cash flow doesn't land at 0 and
cost recovery doesn't land at 100% (currently ~112%). Calibration decision pending.

---

## 6. How to resume

```bash
# dev server (do NOT use bash for this; use the preview tooling)
#   .claude/launch.json has: dev (5173), dev-alt (5199), dev-verify (5251)
npm run check      # svelte-check — must be 0 errors
npm test           # vitest — currently 167 passing
```

**Verification pattern used throughout** (screenshots time out in this environment):
1. Start the dev server via the preview tool, open `/report/legacy`.
2. Inspect via `javascript_tool` DOM queries — assert on rendered values, and check each page's
   height ≤ **960px** (10in) so it fits one printed sheet. Tighten spacing if it overflows.
3. Console errors must be clean.

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
