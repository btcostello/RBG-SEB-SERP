---
stepsCompleted: ['step-01-validate-prerequisites', 'step-01-confirmed', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
workflowStatus: 'complete'
completedDate: '2026-06-28'
epicCount: 4
storyCount: 23
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
---

# Schiff SERP - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Schiff SERP, decomposing the requirements from the PRD and Architecture into implementable stories. (No UX Design document exists — the PRD intentionally de-scopes accessibility, responsive design, and multi-device support for a single internal desktop user.)

## Requirements Inventory

### Functional Requirements

**Company & Plan Configuration**
- FR1: The operator can create a quote for a named prospect company and set its corporate tax rate.
- FR2: The operator can configure model settings for a quote: retirement age, assumed death-benefit age, benefit waiting period, salary growth rate, NPV discount rate, and FAS averaging period.
- FR3: The operator can rely on documented default model settings (salary growth 3%, discount rate 0%, assumed death age 84) and override any of them per quote.
- FR4: The operator can configure the illustration-engine API credential as a local setting.

**Census Management**
- FR5: The operator can add, edit, and remove executives in a quote's census.
- FR6: The operator can record each insured's first name, last name, gender, date of birth, date of hire, and current salary.
- FR7: The operator can specify each insured's retirement benefit as a percentage of final average salary.
- FR8: The operator can assign each insured a life-insurance risk class from the set accepted by the illustration engine.
- FR9: The operator can indicate each insured's plan membership (COLI, SERP, or both).
- FR10: The operator can review the complete census before running the model.

**SERP Liability Calculation**
- FR11: The system can project each insured's salary from current salary to retirement using the salary growth rate.
- FR12: The system can compute each insured's final average salary over the configured averaging period.
- FR13: The system can compute each insured's annual retirement benefit using the Factor × Final Average Salary formula.
- FR14: The system can generate each insured's year-by-year benefit payment stream from retirement age through the assumed death-benefit age.
- FR15: The system can compute total plan benefit cost (undiscounted) and its net present value at the configured discount rate.
- FR16: The system can present liability results both per participant and in aggregate.

**COLI Asset Design (Cost Recovery / Option 1)**
- FR17: The system can compute the total required COLI death benefit as the total benefit cost adjusted by the corporate tax rate (`× (1 − tax rate)`).
- FR18: The system can allocate the total death benefit across COLI participants by equal split to derive each insured's individual face amount.
- FR19: The system can algorithmically design and retrieve each insured's COLI policy via the external illustration engine, supplying only actuarial inputs (age nearest birthday, gender, risk class, face amount, design parameters) and no client-identifying data.
- FR20: The system can obtain each insured's yearly premium, account value, cash surrender value, and death benefit from the illustration results.
- FR21: The system can surface illustration compliance indicators (GPT-adjusted, MEC-adjusted) and returned guideline premiums to the operator.
- FR22: The system can discover the illustration engine's accepted field values and defaults from its published schema rather than relying solely on hardcoded values.

**Run Orchestration & Error Handling**
- FR23: The operator can run the full model (liability + asset design) for a quote in a single action.
- FR24: The system can validate census and settings inputs against the illustration engine's contract and report specific, field-level issues.
- FR25: The system can fail an entire run with a clear, specific reason when the engine rejects input, cannot solve, or is unreachable — without producing partial or ambiguous results.
- FR26: The operator can correct inputs and re-run the model from scratch after a failure, with all previously entered data preserved.
- FR27: The system can indicate run progress when designing COLI policies across multiple census members.

**Proposal Reporting & Export**
- FR28: The system can generate a Cover page for the SERP-financed-with-COLI proposal, personalized with the prospect company name.
- FR29: The system can generate a Census Summary page listing the plan participants.
- FR30: The system can generate a COLI Summary page showing total death benefit and total first-year premium.
- FR31: The system can render proposal output as discrete report pages so additional sections can be added over time.
- FR32: The operator can print or export the proposal to PDF with presentation-grade layout.

**Quote Persistence**
- FR33: The operator can save a quote and reopen it later with identical inputs and computed results.
- FR34: The operator can maintain and select among multiple saved quotes (one per prospect company).
- FR35: The operator can delete a saved quote.

### NonFunctional Requirements

**Accuracy & Correctness (dominant quality attribute)**
- NFR1: Liability calculations are deterministic — identical inputs always produce identical outputs.
- NFR2: SERP benefit-stream and total/NPV figures match a known-good benchmark client exactly to the cent; COLI asset figures match the illustration engine's returned values by construction.
- NFR3: Monetary values are handled with decimal precision (no binary-float drift) throughout the calc engine.
- NFR4: Age and date logic uses age nearest birthday consistently; boundary birthdays produce correct results.
- NFR5: No calculation depends on an undocumented hardcoded constant — every figure traces to an input or a named, documented formula.

**Performance**
- NFR6: Liability recalculation for a typical census completes in under ~5 seconds (target sub-second).
- NFR7: A full asset-design run scales linearly with census size (bounded by one illustration call per COLI participant); the operator sees progress feedback for runs that take more than a moment.

**Integration & Reliability**
- NFR8: The illustration API is accessed through a single adapter that isolates its contract from the rest of the system.
- NFR9: API responses 400 (validation), 401 (auth), and 422 (projection failed) are handled distinctly, surfacing the engine's own field-level messages where provided.
- NFR10: API calls apply a reasonable timeout; on timeout or unreachability the run fails whole with a clear message (no partial output, no silent hang).
- NFR11: A saved quote reopens with identical inputs and identical recomputed results.

**Security & Privacy**
- NFR12: Only actuarial fields are transmitted to the illustration API; no names, dates of birth, or other client-identifying data leave the application.
- NFR13: The API credential is stored as a local setting (MVP); the design must permit later relocation to a server-side environment variable without changing calling code. *(Architecture exceeds this: key is server-side from day one via `$env/static/private`.)*

**Maintainability & Extensibility**
- NFR14: The funding-strategy, persistence, and report-page mechanisms are seamed behind interfaces so Options 2–4, a database backend, and additional report pages can be added without modifying the calc engine or existing pages.
- NFR15: Tax rate and discount rate are parameters, not embedded constants, so enabling a non-zero discount (or different tax treatment) is a data change, not a code change.

### Additional Requirements

*(Technical requirements extracted from the Architecture document that impact epic/story creation.)*

**Starter Template / Project Initialization (impacts Epic 1, Story 1):**
- AR1: **The first implementation story MUST be project scaffolding** via the official Svelte CLI: `npx sv create schiff-serp` (TypeScript, Vitest, ESLint, Prettier; Tailwind optional), then switch the adapter to `@sveltejs/adapter-node`. Establish the `src/lib` module folder structure (`domain/`, `money/`, `dates/`, `engine/`, `funding/`, `orchestrator/`, `api/`, `persistence/`, `report/`, `stores/`, `components/`, `server/`).

**Foundational technical decisions (cross-cutting, must precede dependent work):**
- AR2: Money handled via **big.js (7.0.1)** with a single centralized rounding policy (default half-up); money serialized as **decimal strings** outside the engine; never a JS `number`, never round mid-calculation.
- AR3: A single **date/age utility** implementing **age nearest birthday** is the only place age/duration math occurs; dates stored as ISO `YYYY-MM-DD` strings.
- AR4: Validation via **Valibot (1.4.1)**; shared schemas in `src/lib/domain/`, server-only wire schemas in `src/lib/server/lifeproj/`; types derived via `v.InferOutput` (schema is the source of truth).
- AR5: The **Quote aggregate** is one serializable JSON document (Company + ModelSettings + Census[] + Results), with `schemaVersion` for forward migration; per-individual data modeled from day one.

**Integration & infrastructure:**
- AR6: All `lifeproj` access flows through a **server-side anti-corruption adapter** (`src/lib/server/lifeproj/`) — the only holder of `X-API-Key` and the only place `snake_case` wire naming appears. Browser never calls `lifeproj` directly and never sees the key.
- AR7: A **Backend-for-frontend (BFF)** exposes `GET /api/schema` (proxy + per-session cache) and `POST /api/illustration` (single keyed projection); browser reaches these via `src/lib/api/*-client.ts`.
- AR8: **Typed, discriminated error model** mapped from the API: `ValidationError(details[])` (400), `AuthError` (401), `ProjectionError(message)` (422), `ConnectivityError` (timeout/unreachable); per-call timeout via `AbortController`.
- AR9: **Client-side run orchestration** — pure engine computes liability + per-person face in-browser; client issues N sequential POSTs to `/api/illustration` (one per COLI participant), updates progress, and aborts remaining calls on first error (whole-run fail-fast, no retry/resume).
- AR10: **Schema discovery & caching** — `/schema` fetched once per session and cached; feeds enums/defaults into both Valibot validation and the census UI; fallback to six seeded risk-class strings + documented defaults if `/schema` is unreachable (M-1).
- AR11: **Environment config** — `LIFEPROJ_API_KEY` + `LIFEPROJ_BASE_URL` in gitignored `.env`; committed `.env.example`. Optional CI (GitHub Actions) running `vitest`, `svelte-check`, build.

**State, reporting & purity:**
- AR12: App state via **Svelte 5 runes** only (`$state`, `$derived`, `$effect`); a single quote store with typed update functions; one `runState` rune (`idle|computing|designing|done|failed` + progress + error); immutable-style updates.
- AR13: Report output rendered from a **data-driven page registry** (`[{ id, title, component }]`); MVP registers Cover, Census Summary, COLI Summary; new pages are purely additive.
- AR14: **Print/PDF via browser print** (`window.print()`) with dedicated print CSS (`@page`, page-break control) for page-accurate output; programmatic PDF deferred.
- AR15: **Purity boundary** — `engine/`, `funding/`, `money/`, `dates/` import no Svelte and perform no I/O; co-located `*.test.ts`; the benchmark-client Vitest test is the standing **correctness gate**.

**Architecture-flagged gaps to resolve during early implementation:**
- AR16 (I-1): A **known-good benchmark fixture** computed under MVP rules (0% discount, no mortality, pay-to-84) must be supplied/signed off by the operator; it becomes `benchmark-client.fixture.ts` and the rounding policy is calibrated to it. (The Sample Report.pdf's 5.75% discount + FASB mortality cannot serve directly.)
- AR17 (I-2): **`solve` support pulled into the MVP `lifeproj` adapter** to derive the Cost-Recovery premium (solved level premium over a pay window); exact target (e.g., level premium to endow / target net surrender value, pay-period length) confirmed with the operator. Refines the PRD's "solve = Phase 2."
- AR18 (M-2): Explicit money **round-trip serialization test** asserting `Big → string → Big` equality (guards NFR11 on reopen).
- AR19 (M-3): Explicit **boundary-birthday date tests** (issue_age vs benefit-timing age-nearest-birthday cases) as a standing test.

### UX Design Requirements

_Not applicable — no UX Design document exists. The PRD explicitly excludes WCAG/accessibility, responsive/mobile design, and multi-device support (single internal desktop user, Chrome-only). UI is delivered as functional data-entry and report screens under the FRs above (FR5–FR10 census editor, FR28–FR32 report) rather than a separate UX requirement set._

### FR Coverage Map

- FR1: Epic 1 — Create a named quote + corporate tax rate
- FR2: Epic 1 — Configure per-quote model settings
- FR3: Epic 1 — Documented default settings with per-quote override
- FR4: Epic 3 — Illustration-engine API credential configuration
- FR5: Epic 1 — Add/edit/remove census executives
- FR6: Epic 1 — Record per-insured identity + actuarial fields
- FR7: Epic 1 — Specify benefit as % of final average salary
- FR8: Epic 1 — Assign risk class (seeded enum; reconciled w/ /schema in Epic 3)
- FR9: Epic 1 — Indicate plan membership (COLI/SERP/both)
- FR10: Epic 1 — Review complete census before run
- FR11: Epic 2 — Salary projection to retirement
- FR12: Epic 2 — Final average salary computation
- FR13: Epic 2 — Annual benefit = Factor × FAS
- FR14: Epic 2 — Year-by-year benefit payment stream
- FR15: Epic 2 — Total benefit cost + NPV
- FR16: Epic 2 — Per-participant and aggregate liability views
- FR17: Epic 3 — Total COLI death benefit = cost × (1 − tax rate)
- FR18: Epic 3 — Equal-split allocation to per-insured face amount
- FR19: Epic 3 — Algorithmic per-person COLI design via engine (actuarial-only inputs)
- FR20: Epic 3 — Retrieve premium / account value / CSV / death benefit
- FR21: Epic 3 — Surface GPT/MEC flags + guideline premiums
- FR22: Epic 3 — Schema discovery of accepted field values/defaults
- FR23: Epic 3 — Single-action full model run (liability + asset design)
- FR24: Epic 3 — Contract-mirroring field-level input validation
- FR25: Epic 3 — Whole-run fail-fast with clear reason
- FR26: Epic 3 — Correct-and-rerun with inputs preserved
- FR27: Epic 3 — Multi-member run progress indication
- FR28: Epic 4 — Cover page personalized with company name
- FR29: Epic 4 — Census Summary page
- FR30: Epic 4 — COLI Summary page (total DB + total first-year premium)
- FR31: Epic 4 — Discrete data-driven report pages (additive)
- FR32: Epic 4 — Print/export to PDF, presentation-grade layout
- FR33: Epic 1 — Save/reopen quote with identical inputs + results
- FR34: Epic 1 — Maintain/select among multiple saved quotes
- FR35: Epic 1 — Delete a saved quote

## Epic List

### Epic 1: Quote Setup, Census & Persistence
The operator can create, open, save, and delete named quotes; set company and model settings (documented defaults with per-quote overrides); and build, edit, and review a full executive census — a complete, persistent data-entry workspace. Folds in project scaffolding (AR1) and the foundational money (AR2), date/age (AR3), Valibot (AR4), Quote-aggregate (AR5), and runes-state (AR12) decisions, plus the persistence interface and money round-trip test (AR18). Risk class (FR8) uses the seeded enum here, reconciled with `/schema` in Epic 3.
**FRs covered:** FR1, FR2, FR3, FR5, FR6, FR7, FR8, FR9, FR10, FR33, FR34, FR35

### Epic 2: SERP Liability Calculation
From a census, the operator gets a defensible, deterministic, exact-to-the-cent liability — salary projection → final average salary → annual benefit (Factor × FAS) → year-by-year stream → total cost + NPV — presented per-participant and in aggregate. Establishes the pure-engine purity boundary (AR15), the benchmark correctness gate and fixture (AR16/I-1), and boundary-birthday tests (AR19); satisfies NFR1–5 (accuracy) and NFR6 (instant `$derived` recalc).
**FRs covered:** FR11, FR12, FR13, FR14, FR15, FR16

### Epic 3: COLI Asset Design via Illustration Engine (Cost Recovery / Option 1)
The operator runs the full model in a single action: the system computes the tax-adjusted total death benefit, allocates per-person face amounts, and algorithmically designs and retrieves each COLI policy via the external `lifeproj` engine — surfacing GPT/MEC flags and guideline premiums — with whole-run fail-fast and progress feedback. Folds in the server adapter (AR6), BFF (AR7), typed error model (AR8), client orchestration (AR9), schema discovery + fallback (AR10), env config (AR11), and `solve` in MVP (AR17/I-2); satisfies NFR7–13.
**FRs covered:** FR4, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27

### Epic 4: Proposal Report Generation & Export
The operator generates the client-ready proposal — Cover, Census Summary, and COLI Summary as discrete, data-driven pages personalized with the prospect company name — and prints or exports to PDF with presentation-grade layout. Folds in the report page registry (AR13) and browser-print + print CSS (AR14); the registry keeps the future ~52-page report purely additive (FR31).
**FRs covered:** FR28, FR29, FR30, FR31, FR32

---

## Epic 1: Quote Setup, Census & Persistence

The operator can create, open, save, and delete named quotes; set company and model settings (documented defaults with per-quote overrides); and build, edit, and review a full executive census — a complete, persistent data-entry workspace. This epic establishes the project foundation and all input-side capabilities, so the operator can capture and manage everything a proposal needs even before the calculation engine exists.

### Story 1.1: Initialize the SvelteKit project and module structure

As a developer building Schiff SERP,
I want the project scaffolded with the official Svelte CLI and the agreed module structure, tooling, and server boundary in place,
So that all subsequent feature work builds on a consistent, type-safe, tested foundation with the API-key boundary enforced from day one.

**Acceptance Criteria:**

**Given** a clean workspace
**When** the project is scaffolded with `npx sv create schiff-serp` (TypeScript, Vitest, ESLint, Prettier)
**Then** the app builds and `npm run dev` serves at `http://localhost:5173`
**And** `@sveltejs/adapter-node` is installed and configured in `svelte.config.js` so `node build` produces a runnable Node server (AR1)

**Given** the scaffolded project
**When** the `src/lib` structure is created
**Then** the module folders exist per the architecture (`domain/`, `money/`, `dates/`, `engine/`, `funding/`, `orchestrator/`, `api/`, `persistence/`, `report/`, `stores/`, `components/`, `server/`)
**And** ESLint flat config enforces the `$lib/server` boundary so server-only code cannot be imported into client code

**Given** environment configuration
**When** the repo is initialized
**Then** `.env` is gitignored and `.env.example` is committed with `LIFEPROJ_API_KEY` and `LIFEPROJ_BASE_URL` placeholders (AR11)
**And** `vitest` and `svelte-check` run green on a placeholder test (optional CI workflow runs vitest + svelte-check + build)

### Story 1.2: Establish money, date/age, and domain-model foundations

As a developer,
I want centralized money (big.js), age-nearest-birthday date utilities, and Valibot domain schemas with the Quote aggregate types,
So that every downstream calculation and form draws on one source of truth for precision, dates, and validation — eliminating float drift and inconsistent age math.

**Acceptance Criteria:**

**Given** the money module
**When** any monetary value is created or operated on
**Then** it uses big.js with a single documented rounding policy (half-up) and serializes as a decimal string (NFR3, AR2)
**And** a `Big → string → Big` round-trip test asserts exact equality (AR18)

**Given** the date utility
**When** an age or duration is computed
**Then** it uses age nearest birthday with dates as ISO `YYYY-MM-DD` (NFR4, AR3)
**And** boundary-birthday cases are covered by explicit tests (AR19)

**Given** the domain layer
**When** `Company`, `ModelSettings`, `Insured`, and the `Quote` aggregate are defined
**Then** they are Valibot schemas with types derived via `v.InferOutput` (no hand-written parallel interfaces) (AR4)
**And** the `Quote` is a single serializable JSON object (Company + ModelSettings + Census[] + Results) carrying a `schemaVersion` (AR5)
**And** money is never a JS `number` outside the engine and `snake_case` appears in no domain type

### Story 1.3: Create and configure a quote (company + model settings)

As the proposal author,
I want to create a named quote for a prospect company, set its corporate tax rate, and configure model settings with documented defaults I can override,
So that I can capture the company-level and plan-level parameters for a proposal.

**Acceptance Criteria:**

**Given** the app
**When** I create a new quote
**Then** I can enter the prospect company name and corporate tax rate, and the quote is held in the active quote store (Svelte 5 runes) (FR1, AR12)

**Given** a new quote
**When** I open model settings
**Then** retirement age, assumed death-benefit age, benefit waiting period, salary growth rate, NPV discount rate, and FAS averaging period are all editable (FR2)

**Given** model settings I have not changed
**When** the quote is created
**Then** documented defaults are pre-populated (salary growth 3%, discount 0%, assumed death age 84) (FR3)

**Given** any default
**When** I override it for this quote
**Then** the override persists on this quote and the default is unaffected for other quotes (FR3)

**Given** an invalid entry (e.g., tax rate outside 0–1, non-numeric setting)
**When** I attempt to set it
**Then** a field-level validation error surfaces via Valibot (AR4)

### Story 1.4: Build and review the executive census

As the proposal author,
I want to add, edit, remove, and review executives with all their identity, actuarial, benefit, risk-class, and plan-membership fields,
So that I have a complete, validated census ready to run the model.

**Acceptance Criteria:**

**Given** a quote
**When** I add an executive
**Then** I can record first name, last name, gender, date of birth, date of hire, and current salary (FR5, FR6)
**And** salary is handled as money (decimal string) and DOB/date of hire as ISO dates per the foundations (AR2, AR3)

**Given** an insured
**When** I set their retirement benefit
**Then** I can specify it as a percentage of final average salary (FR7)

**Given** an insured
**When** I assign a risk class
**Then** I choose from the engine's accepted set (seeded enum now; reconciled with `/schema` in Epic 3) (FR8, AR10)

**Given** an insured
**When** I set plan membership
**Then** I can mark them COLI, SERP, or both (FR9)

**Given** a census with multiple insured
**When** I edit or remove an entry
**Then** the change is reflected immediately in the active quote via an immutable-style update (FR5, AR12)

**Given** a completed census
**When** I review it before running
**Then** a census table shows all participants and their key fields (FR10)

### Story 1.5: Save, reopen, list, and delete quotes

As the proposal author,
I want to save a quote and later reopen, switch between, or delete saved quotes,
So that I can manage one proposal per prospect company and trust that a reopened quote is identical to what I saved.

**Acceptance Criteria:**

**Given** a quote with company, settings, and census entered
**When** I save it
**Then** it is persisted via the `QuoteRepository` interface backed by localStorage (FR33)
**And** the repository is accessed only through that interface, so a future DB swap touches no calc/UI code (NFR14)

**Given** a saved quote
**When** I reopen it
**Then** all inputs are identical to what was saved, with money round-tripping exactly via decimal strings (FR33, NFR11, AR18)

**Given** multiple saved quotes
**When** I view the quote list
**Then** I can select among them (one per prospect company) (FR34)

**Given** a saved quote
**When** I delete it
**Then** it is removed from storage and from the list (FR35)

---

## Epic 2: SERP Liability Calculation

From a census, the operator gets a defensible, deterministic, exact-to-the-cent liability — salary projection → final average salary → annual benefit (Factor × FAS) → year-by-year stream → total cost + NPV — presented per-participant and in aggregate. The engine is built as pure, side-effect-free functions (no Svelte, no I/O) so it is fully unit-testable, and a benchmark-client test stands as the permanent correctness gate.

### Story 2.1: Project salary to retirement and compute final average salary

As the proposal author,
I want the system to project each insured's salary to retirement and compute their final average salary,
So that the benefit calculation rests on correct, reproducible earnings figures.

**Acceptance Criteria:**

**Given** an insured with a current salary, date of hire, and the quote's salary growth rate
**When** the engine projects salary
**Then** it produces a year-by-year salary path from current age to retirement age using age-nearest-birthday timing (FR11, NFR4)
**And** all salary values use big.js money with no intermediate rounding (NFR3, NFR5)

**Given** a projected salary path and the configured FAS averaging period
**When** the engine computes final average salary
**Then** it averages the correct trailing years of salary up to retirement (FR12)

**Given** identical inputs
**When** the projection runs twice
**Then** it returns identical results, and the functions are pure (no Svelte/I-O imports) with co-located unit tests (NFR1, AR15)

### Story 2.2: Compute the annual benefit and year-by-year benefit stream

As the proposal author,
I want the system to derive each insured's annual retirement benefit and full payment stream,
So that the plan's promised payments are explicit and traceable.

**Acceptance Criteria:**

**Given** an insured's final average salary and benefit percentage
**When** the engine computes the annual benefit
**Then** it returns Factor × Final Average Salary as a documented, named function (FR13)

**Given** the annual benefit, retirement age, benefit waiting period, and assumed death-benefit age (default 84)
**When** the engine generates the benefit stream
**Then** it produces the correct year-by-year payments from retirement (after any waiting period) through the assumed death age (FR14)
**And** boundary timing (first and final payment years) is verified by tests (NFR4, AR19)

### Story 2.3: Compute total benefit cost and net present value

As the proposal author,
I want the system to total the plan's benefit cost and its NPV at the configured discount rate,
So that I have the single liability figure the funding calculation depends on.

**Acceptance Criteria:**

**Given** each insured's benefit stream
**When** the engine computes total benefit cost
**Then** it returns the correct undiscounted sum across all SERP participants (FR15)

**Given** the configured NPV discount rate (parameter, default 0%)
**When** the engine computes NPV
**Then** it discounts the streams correctly, and changing the rate is a data change requiring no code change (FR15, NFR15)

**Given** the engine modules
**When** the pure `compute-liability` orchestrator runs
**Then** it composes salary → FAS → benefit → stream → total/NPV with no hardcoded constants — every figure traces to an input or a named formula (NFR5)

### Story 2.4: Present per-participant and aggregate liability results live

As the proposal author,
I want liability results shown per participant and in aggregate, recalculating instantly as I change inputs,
So that I can see the impact of an assumption change immediately.

**Acceptance Criteria:**

**Given** a quote with a complete census
**When** liability is computed
**Then** results are available both per participant and in aggregate (FR16)

**Given** the quote store
**When** any liability-relevant input changes
**Then** liability `Results` are recomputed as `$derived` values and the view updates in well under ~5 seconds (target sub-second) (NFR6, AR12)

**Given** computed liability results
**When** the quote is serialized
**Then** the `Results` snapshot is carried on the Quote aggregate for persistence and reopen (supports NFR11)

### Story 2.5: Lock the benchmark correctness gate

As a developer,
I want a known-good benchmark client asserted exact-to-the-cent in CI,
So that no future change can silently break liability correctness.

**Acceptance Criteria:**

**Given** the operator-supplied (or signed-off) reference quote computed under MVP rules — 0% discount, no mortality, pay-to-84
**When** it is captured as `benchmark-client.fixture.ts`
**Then** the rounding policy is calibrated to it and `benchmark.test.ts` asserts the SERP benefit streams and total/NPV match exactly to the cent (FR-engine, NFR2, AR16/I-1)

**Given** the benchmark test
**When** CI runs
**Then** the benchmark assertion is part of the standing correctness gate and must stay green (NFR1, NFR2)

**Given** the absence of a signed-off reference
**When** engine work begins
**Then** obtaining the reference is an explicit blocking prerequisite, surfaced to the operator (AR16/I-1)

---

## Epic 3: COLI Asset Design via Illustration Engine (Cost Recovery / Option 1)

The operator runs the full model in a single action: the system computes the tax-adjusted total death benefit, allocates per-person face amounts, and algorithmically designs and retrieves each COLI policy via the external `lifeproj` engine — surfacing GPT/MEC flags and guideline premiums — with whole-run fail-fast and progress feedback. All `lifeproj` access is confined to one server-side adapter; the browser never sees the API key and only actuarial fields cross the boundary.

### Story 3.1: Build the lifeproj server adapter and credential boundary

As a developer,
I want a server-only anti-corruption adapter that is the sole caller of `lifeproj` and the sole holder of the API key,
So that the wire contract, credential, and PII boundary are enforced in one place.

**Acceptance Criteria:**

**Given** `LIFEPROJ_API_KEY` and `LIFEPROJ_BASE_URL` in server env (`$env/static/private`)
**When** the adapter calls `POST /api/v1/project`
**Then** it injects `X-API-Key` server-side and the key never reaches the browser bundle (FR4, NFR13)

**Given** a domain `DesignRequest` (camelCase, actuarial fields only — issue age, gender, risk class, face amount, design params)
**When** the adapter maps it to the wire request
**Then** `snake_case` and the wire shape appear only inside `src/lib/server/lifeproj/`, and no name/DOB/identifier is structurally present in the outbound type (NFR12, FR19)

**Given** a `lifeproj` response
**When** the adapter maps it to `IllustrationResult`
**Then** it returns per-insured yearly premium, account value, cash surrender value, and death benefit, plus `gpt_adjusted` / `mec_adjusted` and guideline premiums (FR20, NFR8)

**Given** API responses 400 / 401 / 422 / timeout
**When** the adapter handles them
**Then** each maps to a distinct typed error (`ValidationError(details[])`, `AuthError`, `ProjectionError`, `ConnectivityError`), surfacing field-level messages where provided (NFR9, AR8)

### Story 3.2: Expose the internal BFF endpoints

As a developer,
I want internal `/api/schema` and `/api/illustration` endpoints the browser calls,
So that the client never constructs a `lifeproj` URL and the proxy is the only network surface.

**Acceptance Criteria:**

**Given** the server adapter
**When** `GET /api/schema` is called
**Then** it proxies `lifeproj` `/schema` and returns it (cached per session) (AR7, AR10)

**Given** the server adapter
**When** `POST /api/illustration` is called with a design request
**Then** it returns a single projection result or a mapped error envelope `{ error: { kind, message, details? } }` with pass-through status codes (AR7, NFR9)

**Given** the browser
**When** it needs schema or an illustration
**Then** it calls only `src/lib/api/*-client.ts` against same-origin BFF routes, never `lifeproj` directly (AR6)

### Story 3.3: Discover, cache, and reconcile the engine schema

As the proposal author,
I want the app to learn the engine's accepted values from its published schema,
So that risk classes and defaults stay in lockstep with the engine instead of drifting from hardcoded values.

**Acceptance Criteria:**

**Given** app start
**When** `/api/schema` is fetched
**Then** enums and defaults are cached for the session and feed both Valibot validation and the census UI (FR22, AR10)

**Given** the discovered schema
**When** the census risk-class field is rendered
**Then** its options reconcile with the engine's risk-class set (replacing the Epic 1 seeded enum) (FR8, FR22)

**Given** `/schema` is unreachable at startup
**When** the app falls back
**Then** it uses the six seeded risk-class strings + documented defaults and shows a non-blocking notice (AR10/M-1)

### Story 3.4: Compute the tax-adjusted death benefit and allocate per-person face

As the proposal author,
I want the Cost-Recovery funding strategy to size the total death benefit and split it per participant,
So that each insured has a face amount the illustration can be designed around.

**Acceptance Criteria:**

**Given** the total benefit cost and the corporate tax rate
**When** the funding strategy computes the total COLI death benefit
**Then** it returns `Total DB = total cost × (1 − tax rate)` as a single named, tested function (FR17, risk-mitigation)

**Given** the total death benefit and the set of COLI participants
**When** the strategy allocates
**Then** it derives each insured's face amount by equal split (FR18)

**Given** the funding-strategy interface
**When** Cost Recovery (Option 1) is implemented
**Then** it is registered behind the strategy seam so Options 2–4 are additive without touching the engine (NFR14)

### Story 3.5: Algorithmically design each COLI policy via solve

As the proposal author,
I want the system to derive each insured's Cost-Recovery premium by solving against the illustration engine,
So that the COLI policy is designed automatically rather than hand-tuned.

**Acceptance Criteria:**

**Given** an insured's face amount and actuarial inputs
**When** the design loop runs
**Then** it uses `lifeproj` `solve` to derive the Cost-Recovery premium (solved level premium over the agreed pay window) and retrieves the resulting illustration (FR19, AR17/I-2)

**Given** the solve target is not yet confirmed
**When** design work begins
**Then** the exact target (e.g., level premium to endow / target net surrender value, and pay-period length) is confirmed with the operator as an explicit prerequisite (AR17/I-2)

**Given** the adapter's `solve` support
**When** it is exercised
**Then** it is covered by adapter tests against a mocked engine response

### Story 3.6: Orchestrate the single-action run with progress and results

As the proposal author,
I want one action that runs the whole model and shows progress,
So that I get a complete liability + asset result without manual steps.

**Acceptance Criteria:**

**Given** a complete quote
**When** I trigger Run
**Then** the pure engine computes liability and per-person face in-browser, then the client issues N sequential `POST /api/illustration` calls — one per COLI participant (FR23, AR9)

**Given** a multi-member run
**When** illustrations are being designed
**Then** `runState` transitions `computing → designing → done` and a progress indicator shows completed/total (FR27, NFR7, AR12)

**Given** completed asset design
**When** results populate
**Then** each insured's premium / account value / CSV / death benefit and the `gpt_adjusted` / `mec_adjusted` flags + guideline premiums are surfaced to the operator — never silently ignored (FR21, FR20)

### Story 3.7: Validate inputs against the engine contract before a run

As the proposal author,
I want my census and settings checked against the engine's contract before any call,
So that avoidable errors are caught up front with clear, field-level messages.

**Acceptance Criteria:**

**Given** a quote about to run
**When** pre-run validation executes
**Then** census and settings are validated against the `lifeproj` contract (via Valibot schemas informed by the discovered schema) (FR24, AR4)

**Given** a contract violation (e.g., missing/invalid risk class)
**When** validation fails
**Then** specific, field-level issues are reported to the operator and the run does not start (FR24)

### Story 3.8: Fail the whole run fast and preserve inputs for re-run

As the proposal author,
I want a failed run to stop cleanly with a clear reason and keep my inputs intact,
So that I never get partial or ambiguous output and can correct and re-run.

**Acceptance Criteria:**

**Given** any error during a run (validation / auth / projection / connectivity)
**When** it occurs
**Then** the orchestrator aborts remaining calls (AbortController), sets `runState = failed` with a specific reason, and produces no partial output (FR25, NFR10)

**Given** a per-call timeout
**When** the engine is slow or unreachable
**Then** the call fails as `ConnectivityError` and the whole run fails with a clear message (no silent hang) (NFR10)

**Given** a failed run
**When** I correct the offending input
**Then** all previously entered data is intact (a run never mutates inputs) and I can re-run from scratch — there is no partial retry/resume (FR26)

---

## Epic 4: Proposal Report Generation & Export

The operator generates the client-ready proposal — Cover, Census Summary, and COLI Summary as discrete, data-driven pages personalized with the prospect company name — and prints or exports to PDF with presentation-grade layout. A data-driven page registry keeps the future ~52-page report purely additive.

### Story 4.1: Build the data-driven report page registry and renderer

As a developer,
I want a report rendered from a page registry,
So that new report pages can be added later without touching existing pages.

**Acceptance Criteria:**

**Given** the report module
**When** the registry is defined
**Then** it is a list of `{ id, title, component }` entries and `ReportView` renders the registered pages in order on the `/report` route (FR31, AR13)

**Given** the run state
**When** results are not yet ready
**Then** the report renders only when `runState.status === 'done'` (otherwise prompts to run) (supports FR28–30)

**Given** a new page is added later
**When** it is registered
**Then** it appears in the report with no change to existing pages (FR31, NFR14)

### Story 4.2: Generate the Cover page

As the proposal author,
I want a cover page personalized with the prospect company name,
So that the proposal opens as a polished, client-specific document.

**Acceptance Criteria:**

**Given** a quote with a company name and a completed run
**When** the Cover page renders
**Then** it displays the SERP-financed-with-COLI proposal cover personalized with the prospect company name (FR28)
**And** it is registered in the report registry (FR31)

### Story 4.3: Generate the Census Summary page

As the proposal author,
I want a census summary page listing the plan participants,
So that the client sees who the plan covers.

**Acceptance Criteria:**

**Given** a quote with a census and a completed run
**When** the Census Summary page renders
**Then** it lists the plan participants with their key fields (FR29)
**And** it is registered in the report registry (FR31)

### Story 4.4: Generate the COLI Summary page

As the proposal author,
I want a COLI summary page showing the headline funding numbers,
So that the client sees what funding the plan with COLI costs.

**Acceptance Criteria:**

**Given** a completed run
**When** the COLI Summary page renders
**Then** it shows the total death benefit and total first-year premium (FR30)
**And** monetary values are formatted from decimal-string money (AR2)
**And** it is registered in the report registry (FR31)

### Story 4.5: Print and export the proposal to PDF with presentation-grade layout

As the proposal author,
I want to print or export the proposal to PDF with stable, presentation-grade pages,
So that I can bring the deliverable to a client meeting.

**Acceptance Criteria:**

**Given** a completed report
**When** I print/export
**Then** `window.print()` produces page-accurate output using dedicated print CSS (`@page`, page-break control) (FR32, AR14)

**Given** the three MVP pages
**When** exported to PDF
**Then** each renders as a clean, presentation-grade page with stable layout (no clipped or split content) (FR32)
