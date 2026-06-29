---
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
documentsAssessed:
  - prd.md
  - architecture.md
  - epics.md
overallReadiness: READY (with operator prerequisites)
mode: validate
assessor: Winston (Architect)
---

# Implementation Readiness Assessment Report

**Date:** 2026-06-28
**Project:** Schiff SERP

## Document Inventory

| Type | File | Size | Last Modified | Status |
|------|------|------|---------------|--------|
| PRD | `prd.md` | 26.4 KB | 2026-06-28 20:14 | ✅ Found (whole) |
| Architecture | `architecture.md` | 44.5 KB | 2026-06-28 20:49 | ✅ Found (whole) |
| Epics & Stories | `epics.md` | 40.2 KB | 2026-06-28 21:07 | ✅ Found (whole) |
| UX Design | — | — | — | ⚠️ Not found |

**Duplicates:** None — each document exists in a single whole-file format.
**Missing:** UX design document (noted; assessment proceeds without it).
**Supplementary context:** `_bmad-output/brainstorming/brainstorming-session-2026-06-28.md`

## PRD Analysis

### Functional Requirements (35 total)

**Company & Plan Configuration**
- FR1: Create a quote for a named prospect company and set its corporate tax rate.
- FR2: Configure model settings for a quote (retirement age, assumed death-benefit age, benefit waiting period, salary growth rate, NPV discount rate, FAS averaging period).
- FR3: Rely on documented default model settings and override any per quote.
- FR4: Configure the illustration-engine API credential as a local setting.

**Census Management**
- FR5: Add, edit, and remove executives in a quote's census.
- FR6: Record each insured's first/last name, gender, DOB, date of hire, current salary.
- FR7: Specify each insured's retirement benefit as a percentage of FAS.
- FR8: Assign each insured a life-insurance risk class from the set accepted by the engine.
- FR9: Indicate each insured's plan membership (COLI, SERP, or both).
- FR10: Review the complete census before running the model.

**SERP Liability Calculation**
- FR11: Project each insured's salary to retirement using the salary growth rate.
- FR12: Compute each insured's final average salary over the configured averaging period.
- FR13: Compute annual retirement benefit using Factor × FAS.
- FR14: Generate year-by-year benefit payment stream from retirement age through assumed death-benefit age.
- FR15: Compute total plan benefit cost (undiscounted) and its NPV at the configured discount rate.
- FR16: Present liability results per participant and in aggregate.

**COLI Asset Design (Cost Recovery / Option 1)**
- FR17: Compute total required COLI death benefit as total benefit cost × (1 − tax rate).
- FR18: Allocate total death benefit across COLI participants by equal split → individual face amount.
- FR19: Algorithmically design and retrieve each insured's COLI policy via the external engine, supplying only actuarial inputs (no client-identifying data).
- FR20: Obtain each insured's yearly premium, account value, cash surrender value, and death benefit from illustration results.
- FR21: Surface illustration compliance indicators (GPT-adjusted, MEC-adjusted) and returned guideline premiums.
- FR22: Discover the engine's accepted field values/defaults from its published schema rather than hardcoding.

**Run Orchestration & Error Handling**
- FR23: Run the full model (liability + asset design) for a quote in a single action.
- FR24: Validate census/settings inputs against the engine's contract and report field-level issues.
- FR25: Fail an entire run with a clear, specific reason when the engine rejects input, cannot solve, or is unreachable — no partial/ambiguous results.
- FR26: Correct inputs and re-run from scratch after a failure, with all previously entered data preserved.
- FR27: Indicate run progress when designing COLI policies across multiple members.

**Proposal Reporting & Export**
- FR28: Generate a Cover page personalized with the prospect company name.
- FR29: Generate a Census Summary page listing plan participants.
- FR30: Generate a COLI Summary page showing total death benefit and total first-year premium.
- FR31: Render proposal output as discrete report pages so sections can be added over time.
- FR32: Print or export the proposal to PDF with presentation-grade layout.

**Quote Persistence**
- FR33: Save a quote and reopen later with identical inputs and computed results.
- FR34: Maintain and select among multiple saved quotes (one per prospect company).
- FR35: Delete a saved quote.

### Non-Functional Requirements (15 total)

**Accuracy & Correctness (dominant quality attribute)**
- NFR1: Liability calculations are deterministic.
- NFR2: SERP benefit-stream and total/NPV figures match a known-good benchmark client exactly to the cent; COLI figures match engine returns by construction.
- NFR3: Monetary values handled with decimal precision (no binary-float drift).
- NFR4: Age/date logic uses age nearest birthday consistently; boundary birthdays correct.
- NFR5: No calculation depends on an undocumented hardcoded constant.

**Performance**
- NFR6: Liability recalculation completes in under ~5s (target sub-second).
- NFR7: Asset-design run scales linearly with census size; progress feedback for longer runs.

**Integration & Reliability**
- NFR8: Illustration API accessed through a single adapter isolating its contract.
- NFR9: API 400/401/422 handled distinctly, surfacing field-level messages.
- NFR10: API calls apply a reasonable timeout; on timeout/unreachability the run fails whole.
- NFR11: A saved quote reopens with identical inputs and recomputed results.

**Security & Privacy**
- NFR12: Only actuarial fields transmitted to API; no client-identifying data leaves the app.
- NFR13: API credential stored as a local setting (MVP); relocatable to server-side env var without changing calling code.

**Maintainability & Extensibility**
- NFR14: Funding-strategy, persistence, and report-page mechanisms seamed behind interfaces.
- NFR15: Tax rate and discount rate are parameters, not embedded constants.

### Additional Requirements & Constraints
- **Domain/Regulatory:** Proposal is a sales illustration, not advice; disclosure language required (boilerplate deferred to later phases). 7702/MEC compliance owned by the external engine — surface flags, don't re-implement.
- **Calculation integrity:** deterministic & documented, benchmark tolerance exact-to-cent, age nearest birthday, decimal/cents money handling.
- **Data sensitivity:** executive PII held locally; data minimization to API (actuarial fields only); no retention/encryption obligations for MVP.
- **Integration:** single hard dependency on `lifeproj` API; discover enums/defaults from `GET /api/v1/schema`.
- **Web/platform:** SPA, Chrome-only, no SEO/analytics/real-time, localStorage persistence, desktop-first, printable PDF output. WCAG not required.

### PRD Completeness Assessment
The PRD is **mature and implementation-grade**: workflow status `complete`, all 12 authoring steps done. Requirements are atomic, numbered, and testable. Scope boundaries are explicit (MVP = Option 1 only; what-if explicitly excluded; scalability/accessibility deliberately out). The six architecture seams are named, supporting traceability into the architecture and epics. No ambiguous "TBD" requirements detected. The only structural gap relative to the readiness checklist is the **absence of a standalone UX document** — UX intent is embedded in the PRD's journeys and web-application section instead.

## Epic Coverage Validation

### Coverage Matrix

| FR | PRD Requirement (abbreviated) | Epic Coverage | Status |
|----|-------------------------------|---------------|--------|
| FR1 | Create named quote + corporate tax rate | Epic 1 / Story 1.3 | ✅ Covered |
| FR2 | Configure per-quote model settings | Epic 1 / Story 1.3 | ✅ Covered |
| FR3 | Documented defaults + per-quote override | Epic 1 / Story 1.3 | ✅ Covered |
| FR4 | API credential as local/server setting | Epic 3 / Story 3.1 | ✅ Covered |
| FR5 | Add/edit/remove census executives | Epic 1 / Story 1.4 | ✅ Covered |
| FR6 | Record identity + actuarial fields | Epic 1 / Story 1.4 | ✅ Covered |
| FR7 | Benefit as % of FAS | Epic 1 / Story 1.4 | ✅ Covered |
| FR8 | Assign risk class (engine set) | Epic 1 / Story 1.4 (reconciled Epic 3 / 3.3) | ✅ Covered |
| FR9 | Plan membership (COLI/SERP/both) | Epic 1 / Story 1.4 | ✅ Covered |
| FR10 | Review census before run | Epic 1 / Story 1.4 | ✅ Covered |
| FR11 | Salary projection to retirement | Epic 2 / Story 2.1 | ✅ Covered |
| FR12 | Final average salary | Epic 2 / Story 2.1 | ✅ Covered |
| FR13 | Annual benefit = Factor × FAS | Epic 2 / Story 2.2 | ✅ Covered |
| FR14 | Year-by-year benefit stream | Epic 2 / Story 2.2 | ✅ Covered |
| FR15 | Total cost + NPV | Epic 2 / Story 2.3 | ✅ Covered |
| FR16 | Per-participant + aggregate views | Epic 2 / Story 2.4 | ✅ Covered |
| FR17 | Total DB = cost × (1 − tax rate) | Epic 3 / Story 3.4 | ✅ Covered |
| FR18 | Equal-split face allocation | Epic 3 / Story 3.4 | ✅ Covered |
| FR19 | Algorithmic per-person COLI design | Epic 3 / Stories 3.1, 3.5 | ✅ Covered |
| FR20 | Retrieve premium/AV/CSV/DB | Epic 3 / Stories 3.1, 3.6 | ✅ Covered |
| FR21 | Surface GPT/MEC flags + guideline premiums | Epic 3 / Story 3.6 | ✅ Covered |
| FR22 | Schema discovery of values/defaults | Epic 3 / Story 3.3 | ✅ Covered |
| FR23 | Single-action full run | Epic 3 / Story 3.6 | ✅ Covered |
| FR24 | Contract-mirroring field-level validation | Epic 3 / Story 3.7 | ✅ Covered |
| FR25 | Whole-run fail-fast with clear reason | Epic 3 / Story 3.8 | ✅ Covered |
| FR26 | Correct-and-rerun, inputs preserved | Epic 3 / Story 3.8 | ✅ Covered |
| FR27 | Multi-member run progress | Epic 3 / Story 3.6 | ✅ Covered |
| FR28 | Cover page personalized w/ company | Epic 4 / Story 4.2 | ✅ Covered |
| FR29 | Census Summary page | Epic 4 / Story 4.3 | ✅ Covered |
| FR30 | COLI Summary page (DB + 1st-yr premium) | Epic 4 / Story 4.4 | ✅ Covered |
| FR31 | Discrete data-driven report pages | Epic 4 / Story 4.1 | ✅ Covered |
| FR32 | Print/export to PDF | Epic 4 / Story 4.5 | ✅ Covered |
| FR33 | Save/reopen quote identically | Epic 1 / Story 1.5 | ✅ Covered |
| FR34 | Maintain/select multiple quotes | Epic 1 / Story 1.5 | ✅ Covered |
| FR35 | Delete a saved quote | Epic 1 / Story 1.5 | ✅ Covered |

### Missing Requirements

**None.** All 35 PRD Functional Requirements trace to at least one epic and story. No orphan FRs (requirements in epics with no PRD origin) were detected — the epics document mirrors the PRD's FR inventory exactly and additionally folds in 19 Architecture-derived requirements (AR1–AR19) as cross-cutting/foundational work distributed across the epics.

### Coverage Statistics

- **Total PRD FRs:** 35
- **FRs covered in epics:** 35
- **Coverage percentage:** 100%
- **NFR traceability:** All 15 NFRs are referenced within story acceptance criteria (e.g., NFR1–5 in Epic 2, NFR7–13 in Epic 3, NFR11/NFR14 in Epic 1, NFR14 in Epic 4).
- **Architecture requirements (AR1–AR19):** all assigned to epics/stories (AR1 → Story 1.1; AR2–AR5, AR12, AR18 → Epic 1; AR15, AR16, AR19 → Epic 2; AR6–AR11, AR17 → Epic 3; AR13, AR14 → Epic 4).

## UX Alignment Assessment

### UX Document Status

**Not Found** — no `*ux*.md` exists in the planning artifacts.

**Is UX implied?** Partially. This *is* a user-facing application (an SPA with a multi-step data-entry workflow and a printable proposal output), so some UI/UX surface is unavoidable. However, the PRD **deliberately and explicitly de-scopes the broad UX concern set**:
- WCAG / accessibility — explicitly *not a requirement* (single internal user).
- Responsive / mobile / tablet — explicitly *not required* (desktop-first, wide-screen, Chrome-only).
- No SEO, no marketing pages, no multi-device matrix, no real-time/collaboration.

The absence of a standalone UX document is therefore an **intentional, documented decision**, not an oversight. UX intent is carried in two places instead:
1. **PRD** — the User Journeys section (Journey 1 happy path, Journey 2 fail-fast) and the Web Application Specific Requirements section define the interaction flow, print-grade output requirement, and platform constraints.
2. **Epics** — FR5–FR10 (census editor), FR23/FR27 (run trigger + progress), FR28–FR32 (report pages + print), with story-level acceptance criteria describing the screens.

### Alignment Issues

- **UX ↔ PRD:** Consistent. No UX requirements exist that are absent from the PRD, because the UX scope lives inside the PRD. The epics file restates this de-scoping verbatim.
- **UX ↔ Architecture:** The architecture supports the implied UI needs — Svelte 5 runes for reactive state (AR12), `$derived` for instant recalculation (NFR6), a data-driven report page registry (AR13), and browser-print + print CSS for presentation-grade PDF output (AR14). The interaction-heavy surfaces (census CRUD, run progress, report) all have architectural homes.

### Warnings

- ⚠️ **No dedicated UX artifact** — acceptable for this single-user internal tool per explicit PRD scoping. Risk is low. The one residual risk is that UI/visual-polish detail for the **client-facing printed proposal** (the actual sales deliverable) is specified only at "presentation-grade" granularity. Since the proposal is the primary sales artifact, the operator should expect to iterate on exact report page layout/styling during Epic 4, and the deferred ~52-page report (Phase 2) will need format/disclosure-boilerplate input from the operator (already flagged in PRD/epics).

## Epic Quality Review

Reviewed all 4 epics / 23 stories against create-epics-and-stories best practices: user value, epic independence, forward-dependency prohibition, story sizing, AC quality, and database/entity timing.

### Best-Practices Compliance Checklist

| Epic | Delivers user value | Independent (no fwd dep) | Stories sized | No forward deps | Entities created when needed | Clear ACs | FR traceability |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Epic 1 — Quote Setup, Census & Persistence | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Epic 2 — SERP Liability Calculation | ✅ | ✅ (uses Epic 1 only) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Epic 3 — COLI Asset Design via Engine | ✅ | ✅ (uses Epic 1+2) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Epic 4 — Proposal Report & Export | ✅ | ✅ (uses Epic 3 results) | ✅ | ✅ | ✅ | ✅ | ✅ |

### Epic Independence & Dependency Analysis

- **No forward dependencies detected.** Each epic consumes only the outputs of earlier epics: Epic 1 stands alone (data entry + persistence); Epic 2 consumes the census; Epic 3 consumes liability results + census; Epic 4 consumes the run results. Build order = dependency order.
- **FR8 risk-class handling is correctly seamed, not a forward dependency.** Story 1.4 uses a *seeded enum* that functions standalone; Story 3.3 later *reconciles* it with the engine schema. Epic 1 does not require Epic 3 to function — the seed degrades gracefully. This is good practice, not a violation.
- **Database/entity timing:** Appropriate. There is no upfront "create all tables" anti-pattern. Persistence is a single serializable `Quote` JSON aggregate defined in foundational Story 1.2 and accessed only through the `QuoteRepository` interface (localStorage now, DB-swappable later).

### Starter Template / Greenfield Check

- ✅ Architecture mandates a starter template (AR1), and **Story 1.1 is correctly the project-scaffolding story** (`npx sv create`, adapter-node, module structure, server boundary, env config, optional CI). Compliant with the special implementation rule.
- ✅ Greenfield indicators present: initial setup, dev environment, env-var config, optional CI early.

### Acceptance-Criteria Quality

- ACs consistently use **Given/When/Then** BDD structure and are testable.
- **Error and edge paths are covered**, not just happy paths: Story 1.3 (field-level validation), Story 3.3 (schema-unreachable fallback), Story 3.7 (pre-run contract validation), Story 3.8 (whole-run fail-fast, timeout → ConnectivityError, inputs preserved on re-run), Story 2.5 (benchmark gate + blocking-prerequisite path).
- NFR and AR references are embedded in ACs, preserving traceability into testable outcomes.

### Findings by Severity

#### 🔴 Critical Violations
**None.** No technical-milestone epics, no forward dependencies, no epic-sized stories.

#### 🟠 Major Issues
**None.**

#### 🟡 Minor Concerns
1. **Two developer-enabler stories open Epic 1 (1.1 scaffolding, 1.2 money/date/domain foundations) before user-facing value (1.3).** This is justified — both are mandated foundations (AR1–AR5) and a starter-template project legitimately front-loads setup — but it does mean the first *user-observable* outcome arrives at Story 1.3. Acceptable; noting for sprint expectations.
2. **Epic 3 carries 8 stories** vs. 5 / 5 / 5 elsewhere — it is the heaviest epic (server adapter, BFF, schema discovery, funding strategy, solve, orchestration, validation, fail-fast). Scope is coherent and each story is independently completable, but it is the epic most likely to need mid-flight re-sequencing; worth watching in sprint planning.
3. **Two open operator-input prerequisites are embedded as in-story blockers rather than resolved up front** (see Blocking Prerequisites below). The epics handle this correctly by surfacing them as explicit prerequisites, but they remain genuine pre-implementation gaps.

### Blocking Prerequisites (require operator input — flagged in epics, not yet resolved)
- **AR16 / I-1 (Story 2.5):** A known-good **benchmark client fixture** computed under MVP rules (0% discount, no mortality, pay-to-84) must be supplied/signed off by the operator. The Sample Report.pdf (5.75% discount + FASB mortality) cannot serve directly. This is the correctness gate for the entire liability engine — **engine work is blocked until it exists.**
- **AR17 / I-2 (Story 3.5):** The exact **`solve` target** for Cost-Recovery premium design (e.g., level premium to endow / target net surrender value, and pay-period length) must be confirmed with the operator before the COLI design loop is built.

Both are correctly identified in the epics as explicit prerequisites; they are the two items most likely to stall implementation if not resolved before the relevant epic begins.

## Summary and Recommendations

### Overall Readiness Status

**READY — with two operator-input prerequisites to resolve before the dependent epics begin.**

The planning artifacts are mature, internally consistent, and traceable end-to-end. PRD → Architecture → Epics → Stories form an unbroken chain: 100% FR coverage, all 15 NFRs referenced in acceptance criteria, all 19 architecture requirements assigned to stories, and no structural epic/story defects. This is a strong, implementation-grade plan. It is not blocked from starting — but two domain inputs gate specific epics and should be obtained before those epics begin.

### Critical Issues Requiring Immediate Action

There are **no critical defects in the artifacts themselves.** The two items below are **input gaps**, not planning errors — they require the operator (Brendan) to supply domain data:

1. **Benchmark client fixture (blocks Epic 2 — the liability correctness gate).** A known-good reference quote computed under MVP rules (0% discount, no mortality, pay-to-84) must be supplied/signed off. Without it, `benchmark.test.ts` (NFR2, the standing correctness gate) cannot be calibrated and the liability engine cannot be validated exact-to-the-cent. *Note: the existing Sample Report.pdf uses 5.75% discount + FASB mortality and cannot be used directly.*
2. **`solve` target definition (blocks Epic 3 — the COLI design loop).** The exact Cost-Recovery premium solve target — e.g., level premium to endow vs. target net surrender value, and the pay-period length — must be confirmed before Story 3.5 can be built.

### Recommended Next Steps

1. **Resolve the two prerequisites with the operator now**, in parallel with Epic 1 work: (a) produce/sign off the benchmark fixture, (b) pin down the `solve` target spec. Neither blocks Epic 1, so implementation can start immediately on scaffolding + data entry while these are nailed down.
2. **Begin implementation at Epic 1, Story 1.1** (project scaffolding via `npx sv create`). Build order = dependency order: Epic 1 → 2 → 3 → 4. Gate the start of Epic 2 on prerequisite (1) and Story 3.5 on prerequisite (2).
3. **Treat Epic 3 as the highest-risk epic in sprint planning** (8 stories, external API integration, fail-fast orchestration). Sequence the server adapter (3.1) and BFF (3.2) first so the credential/PII boundary and error model are locked before the design loop.
4. **Confirm the API contract assumptions early.** Stories 3.1–3.3 depend on `lifeproj` behavior (`POST /api/v1/project`, `GET /schema`, `solve`, 400/401/422 semantics, CORS/key handling resolved server-side). Validate these against the live `lifeproj` API (per API.md) at the start of Epic 3, not mid-epic.
5. **Set expectations on report polish.** The client-facing proposal is specified at "presentation-grade" granularity only; budget iteration time on Epic 4 page layout/print CSS, and plan for operator-supplied formats + disclosure boilerplate when the full ~52-page report (Phase 2) is tackled.

### Final Note

This assessment reviewed 3 artifacts (PRD, Architecture, Epics) across 5 analysis dimensions and found **0 critical defects, 0 major issues, and 3 minor concerns**, plus **2 operator-input prerequisites** and **1 intentional, documented gap** (no standalone UX document — acceptable for this single-user internal tool). The plan is **ready to enter Phase 4 implementation**. Address the two prerequisites before their dependent epics begin; the minor concerns are advisory. These findings can be used to refine the artifacts, or you may proceed as-is — the recommendation is to proceed, starting Epic 1 immediately.

---

*Assessed by Winston (Architect) · Mode: Validate · 2026-06-28*
