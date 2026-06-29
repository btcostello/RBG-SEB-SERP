---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
workflowStatus: 'complete'
completedDate: '2026-06-28'
classification:
  projectType: 'Web application (single-user, browser-based, architected toward hosted SaaS)'
  domain: 'Insurance / Actuarial — Executive Benefits (nonqualified SERP financed with COLI)'
  complexity: 'high'
  projectContext: 'greenfield'
  primaryUser: 'Single internal user (the proposal author at Schiff Executive Benefits)'
  productPurpose: 'Generate client-facing SERP/COLI proposals: educate the client on SERP plans, propose a plan structure, and quantify the cost to fund the SERP with COLI'
inputDocuments:
  - _bmad-output/brainstorming/brainstorming-session-2026-06-28.md
  - API.md
  - Sample Report.pdf
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  reference: 2
  projectDocs: 0
---

# Product Requirements Document - Schiff SERP

**Author:** BMad
**Date:** 2026-06-28

## Executive Summary

**Schiff SERP** is a single-operator, browser-based web application that generates client-ready proposals for **nonqualified Supplemental Executive Retirement Plans (SERPs) financed with Company-Owned Life Insurance (COLI)**. It replaces a complex, error-prone Excel model with a clean pipeline — **inputs → calculation engine → report** — that lets one expert produce a complete proposal in an afternoon instead of a week.

The product serves a single internal user: the proposal author at Schiff Executive Benefits. For each prospective client company, the system captures company and plan parameters plus an executive census, projects the year-by-year SERP benefit liability, derives the COLI death benefit required to fund it on a tax-adjusted basis, and **drives an external life-insurance illustration API algorithmically to design and retrieve the matching COLI asset**. The output is a multi-section client proposal addressed to a financially literate but non-actuarial audience — typically the **CFO, Head of HR, and CEO** — that (1) educates them on how SERP plans work, (2) proposes a specific plan structure, and (3) quantifies exactly what it costs to fund that plan with COLI.

The MVP delivers the **Cost Recovery funding approach (Option 1)** end-to-end with three report pages (Cover, Census Summary, COLI Summary), persisted locally. The architecture is deliberately seamed — pluggable funding strategy, an API integration layer, parameterized tax/discount inputs, and a data-driven report registry — so the three remaining funding options and the full ~52-page report can be added incrementally without rework.

### What Makes This Special

The differentiator is **automation of the asset-design process**. Today's slowest, most error-prone step is the manual, iterative work of pulling COLI illustration data into Excel and tuning the policy design by hand. Schiff SERP replaces that with an **engine that interacts with the illustration API and takes an algorithmic approach to finding the optimal COLI design** — sizing premiums, face amounts, and (for later options) distributions to best match the SERP liability, by programmatically calling and converging on the external illustration engine rather than re-keying values.

Because the illustration engine is external, the asset-side numbers are taken as authoritative outputs rather than independently audited. **Auditability lives on the liability side**: the SERP benefit projection and tax-adjusted funding target are fully traceable to inputs and documented calculations, with no hidden hardcoded cells — the opposite of the legacy spreadsheet.

**Core insight:** The math on the liability side isn't excessively complicated — it was simply *tangled together* in Excel. The real leverage is an engine that automates the asset-side design loop against the API. Together, untangling the liability math and automating the asset design is what unlocks speed, repeatability, and a clean path to the more sophisticated funding options.

## Project Classification

- **Project Type:** Web application — single-user today, architected toward an online-hosted deployment.
- **Domain:** Insurance / Actuarial — Executive Benefits (nonqualified defined-benefit SERP financed with COLI).
- **Complexity:** High — financial/actuarial projections, corporate-tax interplay, an external illustration API dependency with algorithmic design optimization, and a compliance-grade multi-page report.
- **Project Context:** Greenfield — no existing codebase; the prior Excel model is reference-only and intentionally not carried forward.

## Success Criteria

### User Success
- The operator produces a complete, client-ready **Option 1 (Cost Recovery)** proposal for a real prospect end-to-end within the tool — no Excel, no manual re-keying of illustration data.
- The operator **trusts the output enough to send it** to a CFO/CEO without hand-recomputing the liability or manually verifying each COLI illustration.
- Changing a key assumption (retirement age, salary growth, tax rate, etc.) and **re-running takes seconds**, not a spreadsheet rebuild.
- The "aha" moment: entering a census and getting a defensible funding number plus proposal pages back in one pass.

### Business Success
- **Time-to-proposal** drops from ~1 week to **< 1 day** (target: < 30 minutes hands-on after census entry).
- Capacity to pursue **more prospects per quarter** without added headcount.
- Proposals are polished enough to **stand as the primary sales artifact** in client meetings.

### Technical Success
- **Calculation correctness:** the liability engine reproduces a known-good benchmark client within a defined tolerance (target: exact to the cent on SERP benefit streams; asset values match the API's returned figures by construction).
- **Algorithmic asset design:** the engine converges on a valid COLI design via the illustration API for every census member, with explicit handling when the API errors or cannot solve.
- **No hidden state:** every liability-side number is traceable to an input or a documented formula — zero hardcoded constants masquerading as data.
- **Persistence reliability:** a saved quote reopens with identical inputs and results.

### Measurable Outcomes
- Benchmark client: liability total and Option-1 COLI summary match reference within tolerance.
- End-to-end run (census → report) completes in a single session without manual external data entry.
- Assumption change → recalculated report in under ~5 seconds.

## Product Scope

### MVP - Minimum Viable Product
- Single funding approach: **Option 1 (Cost Recovery)**.
- One benefit formula: **Factor × Final Average Salary**.
- Inputs: company (name, corporate tax rate); model settings (retirement age, assumed death-benefit age 84, benefit waiting period, salary growth 3%, discount rate 0%, FAS averaging period); census with per-insured fields including risk class.
- Calc engine: liability projection → tax-adjusted Total DB → per-person DB → API-driven illustration retrieval.
- Three report pages: Cover, Census Summary, COLI Summary. Lightweight local persistence.

### Growth Features (Post-MVP)
- Funding **Options 2–4** (distributions, overfunding, wherewithal) via the pluggable strategy and API `solve`.
- Full ~52-page report (financial overview, earnings impact, FASB accounting worksheets, per-participant pages, glossaries).
- Additional benefit formulas, COLA, certain period, min/max.

### Vision (Future)
- Hosted, multi-user SaaS with authentication and saved client portfolios. _(Directional only — not a driver of current design beyond the architecture seams already identified.)_

## User Journeys

This is a **single-user system by design** — no admins, moderators, or support roles, and the only "API consumer" is the system itself calling the external illustration engine. Journeys below cover the one operator; no additional personas are invented.

**The one user — "Brendan, the proposal author."** Subject-matter expert at Schiff Executive Benefits. Today he wins new SERP business by hand-building proposals in a fragile Excel model and manually fetching COLI illustration data. He wants a defensible, polished proposal fast, and to trust the numbers without re-checking every cell.

### Journey 1 — New proposal, happy path (core experience)
**Opening:** A prospect company is interested in a SERP. Brendan opens the tool to a clean workspace.
**Rising action:** He enters the company (name, corporate tax rate) and confirms model settings (retirement age, death-benefit age 84, waiting period, salary growth 3%, discount 0%, FAS averaging). He builds the census — for each executive: name, gender, DOB, hire date, salary, benefit % of FAS, risk class, plan membership.
**Climax:** He runs the model. The engine projects each person's SERP benefit stream, totals the liability, computes the tax-adjusted Total DB, splits it per participant, and **algorithmically drives the illustration API** to design and retrieve each COLI policy. Within seconds he sees the Cover, Census Summary, and COLI Summary (Total Death Benefit, Total First-Year Premium).
**Resolution:** He reviews, exports/prints the proposal pages, and brings them to the client meeting — no Excel, no manual illustration entry.
→ *Reveals:* company/settings input UI, census editor, calc engine, API design loop, report rendering, export.

### Journey 2 — The API stumbles (fail fast, re-run)
**Opening:** Mid-run, the illustration API rejects an input (e.g., missing/invalid risk class), cannot solve a design, or times out.
**Rising action:** The system **fails the entire run** with a clear, specific reason (validation detail vs. projection failure vs. connectivity) rather than producing partial/ambiguous output. Entered inputs (company, settings, census) are preserved.
**Climax:** Brendan corrects the offending input and **re-runs from scratch** — there is intentionally no partial-retry/resume logic, keeping the implementation simple.
**Resolution:** He gets a complete, trustworthy result and is never left wondering whether a silent error skewed the numbers.
→ *Reveals:* API anti-corruption layer, input validation mirroring the API contract, whole-run failure with clear messaging, preserved inputs across a re-run.

> **Explicitly out of scope:** Interactive "what-if" / live assumption-change-and-recompute during a meeting. What-if scenarios will be delivered later as **canned report pages**, not as an interactive recompute feature. Do not build live what-if.

### Journey Requirements Summary
- **Input & census management:** structured company/settings entry; census CRUD with per-insured fields including the API-required risk class.
- **Calculation engine:** deterministic liability projection; tax-adjusted funding target; per-participant DB allocation.
- **Asset-design integration:** algorithmic API loop, validation mirroring the API contract, **whole-run fail-fast** error handling (no partial retry).
- **Reporting:** Cover, Census Summary, COLI Summary as data-driven pages; export/print.
- **Persistence:** lightweight local save/reopen with identical inputs and results (edit a saved quote and re-run; not interactive what-if).

## Domain-Specific Requirements

### Regulatory & Representational
- The generated proposal is an **illustration / sales proposal — not tax, legal, or accounting advice.** Reports must carry **disclosure language** (the sample report leads with a Disclosure page). _Disclosure boilerplate will be provided by the operator during the future report-building phases; it is not authored in the MVP._
- **7702 / MEC compliance is owned by the external illustration engine**, not this app. The API returns `gpt_adjusted` and `mec_adjusted` flags plus guideline premiums. Requirement: **surface these flags** in results (do not silently ignore a MEC-adjusted or GPT-capped design); do not re-implement tax-qualification math.

### Calculation Integrity (the core domain risk)
- **Deterministic & documented:** every liability formula (salary projection, FAS, benefit stream, tax adjustment, NPV) must be explicit and reproducible — no hidden constants. This is the anti-Excel requirement.
- **Benchmark tolerance:** validated against a known-good reference client (target: exact-to-the-cent SERP benefit streams).
- **Age convention:** the engine uses **age nearest birthday**. The illustration API expects `issue_age` as **age nearest birthday**; benefit/timing logic uses the same convention. Centralize and test boundary birthdays.
- **Rounding:** money handled in decimal/cents end-to-end; API returns are already rounded to cents and consumed as authoritative.

### Data Sensitivity & Privacy
- The census holds **executive PII** — names, dates of birth, salaries. The app is **single-user with local storage**, so exposure is inherently limited.
- **No retention or confidentiality requirements** beyond local storage — no mandated deletion, encryption-at-rest, or audit-log obligations for the MVP.
- **Data minimization to the API:** the illustration API needs only `issue_age`, `gender`, `health`, `face_amount` (+ design params). **No names, DOB, or other identifying data are transmitted** — the adapter sends actuarial fields only.

### Integration Constraints
- **Single hard dependency:** the `lifeproj` illustration API. Handle 401 (key), 400 (validation — surface field-level `details[]`), and 422 (projection failed) distinctly.
- **Discover, don't hardcode:** pull enums/defaults from `GET /api/v1/schema` where practical so the app stays in lockstep with the engine (risk-class strings and product enums especially).

### Risk Mitigations
- **Wrong tax-adjustment direction** → encode `Total DB = Total Benefit Cost × (1 − corporate tax rate)` as a single named, tested function.
- **Silent compliance adjustment** → always display `gpt_adjusted` / `mec_adjusted` and guideline premiums in results.
- **API drift** → adapter + schema-driven validation; fail the whole run with a clear message (per Journey 2).
- **Actuarial date errors** → centralize age-nearest-birthday / date logic; test boundary cases.

## Web Application Specific Requirements

### Project-Type Overview
A single-page web application (SPA) run by one operator in a desktop browser. Not a public site: **no SEO, no marketing pages, no multi-device matrix, no real-time/collaboration.** The richness is in the calculation workflow and the generated proposal output, not in broad web-platform concerns.

### Technical Architecture Considerations
- **SPA**, not MPA — a stateful workflow (setup → census → run → report) with instant local recalculation.
- **Browser support:** **Chrome only** (current desktop). No compatibility matrix is built or tested.
- **No SEO, no analytics, no real-time.** Explicitly out of scope.
- **Persistence (MVP):** browser **localStorage**, accessed behind a thin persistence interface. Planned migration to **Postgres (or another DB)** later — the interface exists so that swap doesn't touch calc or UI.
- **External integration:** the `lifeproj` illustration API over HTTPS with `X-API-Key`.
- **API key (MVP):** stored as a **local app setting**. Planned migration to an **environment variable** (with a server-side proxy) later.
- **Known MVP caveat (verify in architecture):** a pure browser SPA exposes the API key client-side and depends on the illustration API permitting browser-origin **CORS**. Acceptable for a single-user local MVP; the later server move (env-var key + DB) resolves both concerns.

### Report Output
- The proposal must be **printable / exportable to PDF** with stable, presentation-grade layout — this is the client deliverable, so page-accurate print styling is a real requirement, not an afterthought.

### Implementation Considerations
- **Accessibility:** WCAG conformance is **not a requirement** (single internal user).
- **Responsive design:** **desktop-first; mobile/tablet not required.** Data-entry density favors a wide screen.
- **Performance targets:** liability recalculation effectively instant (< ~5s, ideally sub-second); asset-design run bounded by N illustration API calls (one per census member) — surface progress for larger censuses.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy
**MVP Approach:** *Problem-solving MVP* — automate the single most painful, manual workflow (producing an Option 1 Cost Recovery proposal) end-to-end, for one user, proving the inputs → calc engine → API → report pipeline works and is trustworthy. Validated learning = "I can produce a real client proposal from this without falling back to Excel."

**Resource Requirements:** Single developer, building incrementally, **seeking the operator's guidance at each step** (especially on actuarial and report specifics). No team, no infrastructure beyond local storage + the external illustration API.

### MVP Feature Set (Phase 1)
**Core journeys supported:** Journey 1 (new proposal, happy path) + Journey 2 (fail-fast on API error, re-run).

**Must-have capabilities:**
1. Company inputs (name, corporate tax rate) + model settings (retirement age, assumed death age 84, benefit waiting period, salary growth 3%, discount 0%, FAS averaging period).
2. Census management (CRUD) with per-insured fields including **risk class** and plan membership.
3. Liability calc engine: salary projection → FAS → benefit stream (Factor × FAS, paid retirement → 84) → Total Cost → NPV (0%) → tax-adjusted Total DB → per-person DB.
4. Illustration API adapter: algorithmic per-person COLI design + retrieval; **whole-run fail-fast** with clear errors; surface `gpt_adjusted` / `mec_adjusted`.
5. Three report pages — Cover, Census Summary, COLI Summary — printable / exportable to PDF.
6. Lightweight **localStorage** persistence (save / reopen identical state).

### Post-MVP Features
**Phase 2 (Growth):**
- Funding Options 2–4 (distributions, overfunding, wherewithal) via pluggable strategy + API `solve`.
- Expand toward the full ~52-page report, section by section (operator supplies exact formats + disclosure boilerplate).
- Additional benefit formulas, COLA, certain period, min/max.

**Phase 3 (Expansion):**
- Hosted multi-user SaaS: Postgres persistence, server-side API key (env var + proxy), authentication, saved client portfolios.
- Canned what-if report pages.

### Risk Mitigation Strategy
- **Technical (calc correctness):** isolate the calc engine as pure, unit-tested functions; validate against a known-good benchmark client.
- **Technical (API dependency):** anti-corruption adapter, schema-driven validation, fail-fast; the API's imperfection is contained at one seam.
- **Scope creep:** the six architecture seams (pluggable strategy, persistence interface, parameterized tax/discount, report registry, API adapter, per-individual data) keep Phase 2/3 additive — so Phase 1 can ship narrow without regret. Interactive what-if explicitly excluded.
- **Resource (solo dev):** build in dependency order (data model → engine → adapter → reports → UI); each layer is independently testable, so progress is verifiable at every step.

## Functional Requirements

> This is the binding capability contract. Any capability not listed here will not be designed, architected, or built unless explicitly added.

### Company & Plan Configuration
- **FR1:** The operator can create a quote for a named prospect company and set its corporate tax rate.
- **FR2:** The operator can configure model settings for a quote: retirement age, assumed death-benefit age, benefit waiting period, salary growth rate, NPV discount rate, and FAS averaging period.
- **FR3:** The operator can rely on documented default model settings (salary growth 3%, discount rate 0%, assumed death age 84) and override any of them per quote.
- **FR4:** The operator can configure the illustration-engine API credential as a local setting.

### Census Management
- **FR5:** The operator can add, edit, and remove executives in a quote's census.
- **FR6:** The operator can record each insured's first name, last name, gender, date of birth, date of hire, and current salary.
- **FR7:** The operator can specify each insured's retirement benefit as a percentage of final average salary.
- **FR8:** The operator can assign each insured a life-insurance risk class from the set accepted by the illustration engine.
- **FR9:** The operator can indicate each insured's plan membership (COLI, SERP, or both).
- **FR10:** The operator can review the complete census before running the model.

### SERP Liability Calculation
- **FR11:** The system can project each insured's salary from current salary to retirement using the salary growth rate.
- **FR12:** The system can compute each insured's final average salary over the configured averaging period.
- **FR13:** The system can compute each insured's annual retirement benefit using the Factor × Final Average Salary formula.
- **FR14:** The system can generate each insured's year-by-year benefit payment stream from retirement age through the assumed death-benefit age.
- **FR15:** The system can compute total plan benefit cost (undiscounted) and its net present value at the configured discount rate.
- **FR16:** The system can present liability results both per participant and in aggregate.

### COLI Asset Design (Cost Recovery / Option 1)
- **FR17:** The system can compute the total required COLI death benefit as the total benefit cost adjusted by the corporate tax rate (`× (1 − tax rate)`).
- **FR18:** The system can allocate the total death benefit across COLI participants by equal split to derive each insured's individual face amount.
- **FR19:** The system can algorithmically design and retrieve each insured's COLI policy via the external illustration engine, supplying only actuarial inputs (age nearest birthday, gender, risk class, face amount, design parameters) and no client-identifying data.
- **FR20:** The system can obtain each insured's yearly premium, account value, cash surrender value, and death benefit from the illustration results.
- **FR21:** The system can surface illustration compliance indicators (GPT-adjusted, MEC-adjusted) and returned guideline premiums to the operator.
- **FR22:** The system can discover the illustration engine's accepted field values and defaults from its published schema rather than relying solely on hardcoded values.

### Run Orchestration & Error Handling
- **FR23:** The operator can run the full model (liability + asset design) for a quote in a single action.
- **FR24:** The system can validate census and settings inputs against the illustration engine's contract and report specific, field-level issues.
- **FR25:** The system can fail an entire run with a clear, specific reason when the engine rejects input, cannot solve, or is unreachable — without producing partial or ambiguous results.
- **FR26:** The operator can correct inputs and re-run the model from scratch after a failure, with all previously entered data preserved.
- **FR27:** The system can indicate run progress when designing COLI policies across multiple census members.

### Proposal Reporting & Export
- **FR28:** The system can generate a Cover page for the SERP-financed-with-COLI proposal, personalized with the prospect company name.
- **FR29:** The system can generate a Census Summary page listing the plan participants.
- **FR30:** The system can generate a COLI Summary page showing total death benefit and total first-year premium.
- **FR31:** The system can render proposal output as discrete report pages so additional sections can be added over time.
- **FR32:** The operator can print or export the proposal to PDF with presentation-grade layout.

### Quote Persistence
- **FR33:** The operator can save a quote and reopen it later with identical inputs and computed results.
- **FR34:** The operator can maintain and select among multiple saved quotes (one per prospect company).
- **FR35:** The operator can delete a saved quote.

## Non-Functional Requirements

_Only categories relevant to this single-user local tool are documented. **Scalability and Accessibility are deliberately excluded.**_

### Accuracy & Correctness (the dominant quality attribute)
- **NFR1:** Liability calculations are **deterministic** — identical inputs always produce identical outputs.
- **NFR2:** SERP benefit-stream and total/NPV figures match a **known-good benchmark client exactly to the cent**; COLI asset figures match the illustration engine's returned values by construction.
- **NFR3:** Monetary values are handled with **decimal precision (no binary-float drift)** throughout the calc engine.
- **NFR4:** Age and date logic uses **age nearest birthday** consistently; boundary birthdays produce correct results.
- **NFR5:** No calculation depends on an undocumented hardcoded constant — every figure traces to an input or a named, documented formula.

### Performance
- **NFR6:** Liability recalculation for a typical census completes in **under ~5 seconds (target sub-second)**.
- **NFR7:** A full asset-design run scales linearly with census size (bounded by one illustration call per COLI participant); the operator sees **progress feedback** for runs that take more than a moment.

### Integration & Reliability
- **NFR8:** The illustration API is accessed through a single **adapter** that isolates its contract from the rest of the system.
- **NFR9:** API responses **400 (validation)**, **401 (auth)**, and **422 (projection failed)** are handled distinctly, surfacing the engine's own field-level messages where provided.
- **NFR10:** API calls apply a **reasonable timeout**; on timeout or unreachability the run **fails whole** with a clear message (no partial output, no silent hang).
- **NFR11:** A saved quote **reopens with identical inputs and identical recomputed results**.

### Security & Privacy
- **NFR12:** Only actuarial fields are transmitted to the illustration API; **no names, dates of birth, or other client-identifying data leave the application**.
- **NFR13:** The API credential is stored as a local setting (MVP); the design must permit later relocation to a server-side environment variable **without changing calling code**.

### Maintainability & Extensibility
- **NFR14:** The funding-strategy, persistence, and report-page mechanisms are **seamed behind interfaces** so Options 2–4, a database backend, and additional report pages can be added without modifying the calc engine or existing pages.
- **NFR15:** Tax rate and discount rate are **parameters**, not embedded constants, so enabling a non-zero discount (or different tax treatment) is a data change, not a code change.
