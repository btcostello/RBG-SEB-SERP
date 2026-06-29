---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/brainstorming/brainstorming-session-2026-06-28.md
  - API.md
  - Sample Report.pdf
workflowType: 'architecture'
project_name: 'Schiff SERP'
user_name: 'BMad'
date: '2026-06-28'
lastStep: 8
status: 'complete'
completedAt: '2026-06-28'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:** 35 FRs across 7 capability groups, which map almost
one-to-one onto architectural components:

- **Company & Plan Configuration (FR1–FR4):** quote creation, per-quote model
  settings with documented defaults + override, API credential as a local setting.
  → Data model + settings.
- **Census Management (FR5–FR10):** per-insured CRUD with actuarial + identity
  fields, benefit % of FAS, risk class constrained to the engine's enum, plan
  membership (COLI/SERP/both), pre-run review. → Data model + census editor UI +
  schema-driven validation.
- **SERP Liability Calculation (FR11–FR16):** salary projection → FAS → annual
  benefit (Factor × FAS) → year-by-year stream (retirement→84) → total cost + NPV →
  per-participant and aggregate views. → Pure calc engine (the core).
- **COLI Asset Design / Option 1 (FR17–FR22):** Total DB = total cost × (1 − tax),
  equal-split allocation to per-insured face, algorithmic per-person design via the
  illustration engine using actuarial-only inputs, retrieve premium/account value/
  CSV/death benefit, surface GPT/MEC flags + guideline premiums, discover enums
  from `/schema`. → Funding-strategy interface (Option 1 impl) + API adapter.
- **Run Orchestration & Error Handling (FR23–FR27):** single run action, contract-
  mirroring field-level validation, whole-run fail-fast, correct-and-rerun with
  inputs preserved, multi-member progress. → Run orchestrator.
- **Proposal Reporting & Export (FR28–FR32):** Cover, Census Summary, COLI Summary
  as discrete data-driven pages, presentation-grade print/PDF. → Report registry +
  renderer + export.
- **Quote Persistence (FR33–FR35):** save/reopen with identical inputs and results,
  multiple quotes, delete. → Persistence interface.

**Non-Functional Requirements:** 15 NFRs across 5 categories; the architecture is
shaped primarily by the first and last groups:

- **Accuracy & Correctness (NFR1–NFR5) — dominant driver:** deterministic engine,
  exact-to-the-cent benchmark match, decimal/cents money (no float drift),
  consistent age-nearest-birthday/date logic, no undocumented constants. Forces a
  pure, side-effect-free, fully unit-tested calc engine.
- **Performance (NFR6–NFR7):** liability recalc < ~5s (sub-second target); asset run
  is O(N) illustration calls with progress feedback. Modest, local-scale targets.
- **Integration & Reliability (NFR8–NFR11):** single API adapter; distinct 400/401/
  422 handling surfacing field-level messages; reasonable timeout → whole-run fail;
  saved quote reopens to identical results.
- **Security & Privacy (NFR12–NFR13):** only actuarial fields transmitted (no PII);
  credential relocatable to a server-side env var without changing calling code.
- **Maintainability & Extensibility (NFR14–NFR15):** funding-strategy, persistence,
  and report-page mechanisms seamed behind interfaces; tax & discount as parameters.

**Scale & Complexity:**

- Primary domain: single-user browser SPA (Chrome, desktop-first) + one external
  HTTPS/JSON illustration API.
- Complexity level: **High** — concentrated in financial/actuarial computation,
  corporate-tax interplay, and an algorithmic external-API design loop; deliberately
  **low** in web-platform breadth (no SEO/analytics/real-time/multi-device/a11y).
- Estimated architectural components: ~10–11 (quote data model, persistence
  interface, pure calc engine, funding-strategy interface, illustration-API adapter +
  schema client, schema-driven validation, run orchestrator, report registry/
  renderer, PDF export, UI screens, settings).

### Technical Constraints & Dependencies

- **Single hard dependency — the `lifeproj` v1 API** over HTTPS with `X-API-Key`:
  `POST /api/v1/project` (keyed), open `GET /api/v1/health` and `GET /api/v1/schema`.
  Stateless/retry-safe; six exact `health` risk-class strings; optional `solve` block
  (Phase 2); responses rounded to cents and consumed as authoritative.
- **Trust boundary:** asset-side numbers are authoritative-by-construction (not
  independently audited); auditability is required only on the liability side.
- **Persistence:** browser `localStorage` for MVP behind a thin persistence
  interface; planned migration to Postgres/DB later without touching calc or UI.
- **Credential handling:** local app setting for MVP; planned move to server-side
  env var + proxy. Known MVP caveat to confirm in design: a pure browser SPA exposes
  the key client-side and depends on the API permitting browser-origin CORS —
  acceptable for single-user local use; the later server move resolves both.
- **Money & dates:** decimal/integer-cents end-to-end; age nearest birthday centralized
  and boundary-tested; issue_age to the API uses the same convention.
- **Output fidelity:** presentation-grade, page-accurate print/PDF is a real MVP
  requirement (the client deliverable), not an afterthought.

### Cross-Cutting Concerns Identified

1. **Calculation determinism & precision** — pure engine, decimal money, centralized
   date/age logic; benchmarked exact-to-the-cent. Spans engine and reporting.
2. **Whole-run fail-fast error semantics** — uniform across validation, API adapter,
   orchestrator, and UI; preserve inputs; no partial/ambiguous results.
3. **The six extensibility seams** — funding strategy, persistence, parameterized
   tax/discount, report registry, API adapter, per-individual data — keep Options 2–4
   and the ~52-page report additive.
4. **PII data-minimization to the API** — only actuarial fields cross the adapter
   boundary; enforced by construction in the request mapper.
5. **Schema-driven configuration** — enums/defaults discovered from `/schema` feed
   both validation and the census UI to stay in lockstep with the engine.
6. **Print/PDF presentation fidelity** — stable page layout shared by the MVP pages
   and the future full report.

## Starter Template Evaluation

### Primary Technology Domain

**Full-stack web application — SvelteKit** (Svelte 5 + SvelteKit 2 + Vite, TypeScript).
A single deployable that serves both the SPA frontend and a thin server layer
(backend-for-frontend). This satisfies the "thin backend proxy now" posture without
standing up a separate service.

### Starter Options Considered

- **Official Svelte CLI — `npx sv create` (SELECTED).** The maintained, canonical
  scaffolder. One-pass add-ons for TypeScript, Vitest, Playwright, Tailwind, ESLint,
  Prettier. Pulls current package versions at scaffold time.
- **`npm create vite@latest` + Svelte (frontend-only) — rejected.** Produces a
  client-only SPA with no server runtime, which cannot host the API-key proxy. Would
  force a second service, contradicting the chosen posture.
- **Community full-stack templates (e.g., bundled auth/ORM starters) — rejected.**
  Carry opinions (auth, DB schemas) the single-user MVP does not need yet; the lean
  official scaffold plus a deliberate `src/lib` structure is a better fit.

### Selected Starter: Official Svelte CLI (`sv create`)

**Rationale for Selection:**

- SvelteKit is a true full-stack framework, so the thin proxy is just server routes in
  the same app — the API key lives in a server-only env var from day one, eliminating
  the client-side-key and CORS caveats the PRD flagged (NFR12–13).
- Compile-time reactivity (Svelte 5 runes) and minimal runtime suit a stateful,
  desktop-first, single-user data-entry + report workflow.
- File-based routing maps directly onto the two MVP screens (Setup+Census, Results/
  Report); `src/lib` cleanly houses the pure calc engine, funding-strategy interface,
  and the lifeproj adapter (all framework-agnostic, fully unit-testable).
- `adapter-node` yields a portable Node server: run locally for the MVP, deploy to
  Railway later (same platform as `lifeproj`) for the Phase 3 hosted move.

**Initialization Command:**

```bash
# Scaffold (interactive add-ons: TypeScript, Vitest, ESLint, Prettier; Tailwind + Playwright optional)
npx sv create schiff-serp

cd schiff-serp

# Switch to an explicit Node server target for the proxy + Railway deploy path
npm install -D @sveltejs/adapter-node
# -> set `adapter()` to adapter-node in svelte.config.js

npm install
npm run dev   # http://localhost:5173
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript throughout; Svelte 5 (runes); SvelteKit 2 on Node; Vite dev/build (current
versions pulled by the scaffolder).

**Topology (full-stack, single app):**
SPA routes + SvelteKit server endpoints in one deployable. Server layer acts as a
backend-for-frontend: the only outbound caller of `lifeproj`, injecting `X-API-Key`
from `$env/static/private` (never shipped to the browser).

**Styling Solution:**
Tailwind CSS via the `sv` add-on for the data-entry UI (deferrable/confirmed in the
patterns step). Report/print pages use bespoke print CSS (`@page`, page-break control)
regardless of utility framework — page-accurate PDF is a first-class requirement.

**Build Tooling:**
Vite (HMR, fast TS builds). `@sveltejs/adapter-node` produces `build/` with a runnable
Node server (`node build`) for local and Railway deployment.

**Testing Framework:**
Vitest for unit tests — the home of the pure calc-engine suite, boundary-birthday
date tests, and the exact-to-the-cent benchmark-client assertion. Playwright optional
for an end-to-end smoke test (census → run → report) against a mocked adapter.

**Code Organization:**
SvelteKit file-based routing for screens; `src/lib/` for domain logic
(`engine/`, `funding/`, `lifeproj/` adapter, `persistence/`, `report/`), surfaced via
the `$lib` alias. Domain code stays free of Svelte/SvelteKit imports so it is portable
and unit-testable in isolation.

**Development Experience:**
Vite HMR, TypeScript, ESLint + Prettier, `$env` typed environment access, `$lib` alias.

**Note:** Project initialization using this command should be the first implementation
story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Money representation: **big.js** (decimal-places precision) + a single centralized
  rounding policy — underpins NFR1–3 and the exact-to-the-cent benchmark.
- Quote data model: one serializable JSON aggregate; money serialized as decimal
  strings (no float drift on reopen, NFR11).
- `lifeproj` anti-corruption adapter + typed error model with whole-run fail-fast.
- Server BFF proxy + server-only API key.
- Input/contract validation: **Valibot** schemas (field-level errors, FR24).
- Run orchestration model: client-orchestrated (in-browser engine + N proxied calls).

**Important Decisions (Shape Architecture):**
- State via Svelte 5 runes; report-page registry; localStorage repository interface;
  schema discovery + caching; browser-print PDF approach.

**Deferred Decisions (Post-MVP):**
- Postgres + server-side persistence (swap the repository impl, no engine/UI change).
- Auth / multi-user / saved client portfolios.
- Funding Options 2–4 via the funding-strategy interface + `lifeproj` `solve`.
- Full ~52-page report (FASB worksheets, audit trails, per-participant pages, glossary).
- Non-zero discount rate, mortality tables, additional benefit formulas/COLA/certain
  period.
- Programmatic server-side PDF generation (only if browser print proves insufficient).

### Data Architecture

- **Quote aggregate (single document).** The entire quote — `Company`,
  `ModelSettings`, `Census: Insured[]`, and a computed `Results` snapshot — is one
  serializable JSON object. **Per-individual data is modeled from day one** (per-insured
  formula %, plan membership COLI/SERP/both, risk class) even though MVP defaults much
  of it (seam: per-individual data).
- **Money — big.js (7.0.1).** All engine arithmetic uses `Big` instances; money is
  serialized in the Quote as **decimal strings**. Rounding is centralized in one money
  module with a single documented rounding mode (default half-up), **validated against
  the benchmark client**; the engine never rounds ad hoc mid-calculation (NFR1–3, NFR5).
- **Validation — Valibot (1.4.1).** Schemas define `Company`, `ModelSettings`,
  `Insured`, and the `lifeproj` request/response contract; types derived via
  `v.InferOutput`. Field-level issues surface to the operator (FR24). The outbound
  request schema contains **only actuarial fields by construction** — names/DOB cannot
  leak (NFR12, FR19).
- **Persistence — localStorage behind a `QuoteRepository` interface** (`list/get/
  save/delete`, FR33–35). Each Quote carries a `schemaVersion` for forward migration.
  Reopen reproduces identical inputs and results (NFR11). DB swap is a repository
  reimplementation only (seam: persistence).
- **Schema discovery & caching.** `GET /api/schema` (proxied) is fetched once and
  cached per session; it feeds enums/defaults into both Valibot and the census UI so
  the app stays in lockstep with the engine (FR22).

### Authentication & Security

- **No authentication in MVP** (single user, local). Auth is a Phase 3 concern.
- **API credential server-side only.** `LIFEPROJ_API_KEY` (and `LIFEPROJ_BASE_URL`)
  read via `$env/static/private`; only the server proxy ever sees it — the browser
  never receives the key (NFR13, resolved now rather than deferred).
- **PII data-minimization enforced at the adapter boundary** via the actuarial-only
  outbound Valibot schema (NFR12).
- **No encryption-at-rest required** (PRD); localStorage holds PII, acceptable for a
  single-user local tool. SvelteKit's default CSRF protection applies to POST routes;
  all calls are same-origin.

### API & Communication Patterns

- **Backend-for-frontend (BFF).** SvelteKit server routes are the only outbound
  caller of `lifeproj`: `GET /api/schema` (proxy + cache) and `POST /api/illustration`
  (single projection). JSON over the same origin.
- **Anti-corruption adapter** in `src/lib/server/lifeproj/` is the sole module that
  knows the wire shape: maps domain `DesignRequest → lifeproj` body and `lifeproj`
  response → domain `IllustrationResult`, and surfaces `gpt_adjusted` / `mec_adjusted`
  + guideline premiums (FR20–21, NFR8).
- **Typed, discriminated error model** mapped from the API contract:
  `ValidationError(details[])` (400), `AuthError` (401), `ProjectionError(message)`
  (422), `ConnectivityError` (timeout/unreachable). Each is handled distinctly (NFR9).
- **Whole-run fail-fast.** Any error aborts the entire run with a specific reason; no
  partial output; client-side inputs are preserved for correct-and-rerun (FR25–26).
  Per-call timeout via `AbortController` (reasonable default) → `ConnectivityError` →
  fail whole (NFR10).
- **No rate limiting** (single user); sequential calls also avoid hammering `lifeproj`.

### Frontend Architecture

- **State via Svelte 5 runes.** A central quote store (`$lib/stores`) holds the active
  Quote; liability results are `$derived` from inputs, giving instant in-browser
  recalculation (NFR6, sub-second). No external state library.
- **Run orchestration (client-side).** The pure engine computes the liability and
  per-person face amounts in the browser; the client then issues **N sequential POSTs**
  to `/api/illustration` (one per COLI participant), updating a progress indicator
  (FR27), and aborts remaining calls on the first error (fail-fast).
- **Routing & screens.** SvelteKit file-based routing: `/` (Setup + Census) and
  `/report` (Results/Report). Report output is rendered from a **data-driven page
  registry** — MVP registers Cover, Census Summary, COLI Summary; new pages are purely
  additive (FR28–31, seam: report registry).
- **Print/PDF — browser print first.** `window.print()` with dedicated print CSS
  (`@page`, page-break control) for page-accurate output (FR32). A programmatic PDF
  library is deferred unless print fidelity proves insufficient.

### Infrastructure & Deployment

- **Hosting.** Local Node for MVP (`npm run dev`; or `node build` via `adapter-node`);
  Railway later (same platform as `lifeproj`) for the Phase 3 hosted move.
- **Environment config.** `.env` (gitignored) for `LIFEPROJ_API_KEY` +
  `LIFEPROJ_BASE_URL`; `.env.example` committed.
- **CI/CD (nice-to-have).** GitHub Actions running `vitest`, `svelte-check`, and a
  build on push — valuable as the guardrail for the benchmark test, even solo.
- **Logging/monitoring.** Server logs adapter errors with their status mapping; no
  external monitoring/observability stack in MVP. Scaling: N/A (single user).

### Decision Impact Analysis

**Implementation Sequence (dependency-ordered):**
1. Quote data model + money module (big.js) + date/age (nearest-birthday) utils +
   `QuoteRepository` (localStorage).
2. Pure calc engine (salary → FAS → benefit stream → total/NPV → tax-adjust → per-person
   DB) + funding-strategy interface with the Option 1 (Cost Recovery) implementation.
3. `lifeproj` adapter + server proxy + Valibot contract + schema discovery.
4. Run orchestrator (client) + report-page registry/renderer with the three MVP pages.
5. Two UI screens (Setup+Census, Results/Report) + print/PDF styling.

**Cross-Component Dependencies:**
- Engine depends on the money + date/age utilities.
- Funding strategy consumes engine output (total cost → Total DB → per-person face).
- Adapter depends on the Valibot contract + discovered schema.
- Orchestrator depends on engine + funding strategy + adapter.
- Report depends on the computed Quote `Results`; persistence depends on Quote
  serialization (money-as-decimal-string for identical reopen).

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 10 areas where AI agents could otherwise
diverge — money math, rounding, date/age, the `lifeproj` wire naming boundary, error
shape, validation timing, state mutation, file/naming layout, server-only boundary,
and PII outflow.

### Naming Patterns

**Code Naming Conventions:**
- TypeScript: `camelCase` for variables/functions, `PascalCase` for types/interfaces/
  classes (no `I` prefix), `SCREAMING_SNAKE_CASE` for module-level constants.
- Svelte components: `PascalCase.svelte` (e.g., `CensusEditor.svelte`).
- Library/module files: `kebab-case.ts` (e.g., `salary-projection.ts`,
  `lifeproj-adapter.ts`, `quote-repository.ts`).
- Domain fields: `camelCase` (`issueAge`, `faceAmount`, `corporateTaxRate`,
  `finalAverageSalary`).
- Types via `v.InferOutput<typeof Schema>` — the Valibot schema is the source of truth;
  do not hand-write a parallel `interface` for validated shapes.

**API Naming Conventions (internal BFF):**
- Routes: lowercase noun paths under `/api` — `/api/schema`, `/api/illustration`.
- Our own JSON request/response fields: `camelCase`.
- HTTP methods: `GET` for schema, `POST` for illustration.

**External Wire Naming (`lifeproj`) — confined boundary:**
- The `lifeproj` contract is `snake_case` (`issue_age`, `face_amount`, `gpt_adjusted`).
- **`snake_case` appears ONLY inside `src/lib/server/lifeproj/`.** The adapter is the
  single translation point: domain `camelCase` ⇄ wire `snake_case`. No `snake_case`
  field names anywhere in the engine, stores, UI, or persisted Quote.

### Structure Patterns

**Project Organization:**
- Domain logic lives in `src/lib/` and is **free of Svelte/SvelteKit imports** so it is
  portable and unit-testable in isolation.
- Server-only code (anything touching the API key or calling `lifeproj`) lives under
  `src/lib/server/` — SvelteKit enforces that this never reaches the browser bundle.
- Tests are **co-located** as `*.test.ts` next to the unit under test (Vitest).
- The known-good benchmark fixture + assertion lives with the engine
  (`src/lib/engine/benchmark/`).
- Screens use SvelteKit file-based routing (`+page.svelte`, `+page.ts`, `+server.ts`);
  shared UI in `src/lib/components/`.

**File Structure Patterns:**
- Config at repo root: `.env` (gitignored), `.env.example` (committed),
  `svelte.config.js`, `vite.config.ts`.
- One concern per module folder (`engine/`, `funding/`, `lifeproj/`, `persistence/`,
  `report/`, `money/`, `dates/`, `domain/`, `stores/`).

### Format Patterns

**API Response Formats (internal BFF):**
- Success: the resource JSON directly (no `{ data: ... }` envelope).
- Error: `{ "error": { "kind": "...", "message": "...", "details": [...]? } }`,
  mirroring `lifeproj`'s `{ error, details[] }` so the adapter mapping is 1:1.
- Status codes pass through the proxy: `400` validation, `401` auth, `422` projection,
  `504`/`502` connectivity — each mapped to a distinct `kind`.

**Data Exchange & Storage Formats:**
- **Money: decimal strings** everywhere outside the engine (JSON, storage, props) —
  e.g., `"162240.00"`. Inside the engine, money is a `Big` instance. Never a JS
  `number`.
- **Dates: ISO `YYYY-MM-DD` strings** for DOB / date of hire (date-only, no timezone).
  All age math goes through the single date utility.
- JSON field naming: `camelCase` (except the `lifeproj` boundary). Booleans `true`/
  `false`. Use explicit `null` for "computed but empty"; omit fields that are "not
  provided".

### Communication Patterns

**State Management Patterns:**
- Svelte 5 runes only (`$state`, `$derived`, `$effect`). No external state library.
- **Immutable-style updates**: reassign objects/arrays rather than deep-mutating nested
  fields, so reactivity and `$derived` track correctly.
- A single quote store exposes typed update functions; components call those rather than
  mutating Quote internals directly.
- Liability `Results` are `$derived` from inputs (instant recalc); the asset-design
  `Results` are populated by the run orchestrator.

**Run/Status & Logging:**
- One `runState` rune: discriminated `status` of `idle | computing | designing | done
  | failed`, plus `progress: { completed, total }` and `error?: RunFailure`.
- Server logs are structured (`{ level, event, status, detail }`), levels `error |
  warn | info`. The client surfaces user-facing messages only — never raw stack/keys.

### Process Patterns

**Error Handling Patterns:**
- Typed error classes from the adapter: `LifeprojValidationError(details[])`,
  `LifeprojAuthError`, `LifeprojProjectionError(message)`,
  `LifeprojConnectivityError`.
- The client run orchestrator wraps the N calls in try/catch; the **first** error
  aborts remaining calls (AbortController) and sets `runState = failed` with a specific
  reason — **whole-run fail-fast, no partial results** (FR25, NFR10).
- Inputs are never mutated by a run, so a failed run leaves the Quote intact for
  correct-and-rerun (FR26). **No retry/resume logic** — re-run from scratch is the only
  recovery path (Journey 2).
- The pure engine assumes pre-validated input and throws on invariant violation
  (programmer error), not on user error; user-input validation happens at the boundary.

**Validation & Loading Patterns:**
- Valibot validates at two boundaries: (1) user input before a run (client) and
  (2) the outbound `lifeproj` request (server adapter). Shared schemas live in
  `src/lib/domain/`; server-only request schemas in `src/lib/server/lifeproj/`.
- The report renders only when `runState.status === 'done'`; a progress indicator shows
  during `designing` (FR27). No spinner-less blocking calls.

### Enforcement Guidelines

**All AI Agents MUST:**
- Use the `money` module for every monetary value and operation — **never** a JS
  `number` for money; **never** round mid-calculation (round only at defined output
  boundaries via the centralized rounding policy).
- Route **all** `lifeproj` access through the server adapter; the browser never calls
  `lifeproj` directly and never sees the API key.
- Keep `snake_case` and the `lifeproj` wire shape confined to `src/lib/server/lifeproj/`.
- Compute every age/duration through the single date utility using **age nearest
  birthday**; never inline date math.
- Send **only actuarial fields** to the adapter — names, DOB, and any identifier are
  structurally absent from the outbound request type (NFR12, FR19).
- Keep `src/lib` domain code free of Svelte imports; co-locate `*.test.ts`; validate at
  boundaries with Valibot.

**Pattern Enforcement:**
- ESLint + the SvelteKit `$lib/server` boundary (build-time guarantee for server-only
  code), `svelte-check` in CI.
- The benchmark-client Vitest test is the **correctness gate** — it must stay green.
- A short code-review checklist captures the money/date/PII/`snake_case` rules above.

### Pattern Examples

**Good Examples:**
- `const totalDb = totalCost.times(new Big(1).minus(taxRate));` // big.js, no float
- Adapter maps `{ issueAge, faceAmount } → { issue_age, face_amount }` at the boundary.
- Client calls `fetch('/api/illustration', …)`; the server proxy adds `X-API-Key`.
- DOB stored as `"1967-06-15"`; age derived via `ageNearestBirthday(dob, asOf)`.

**Anti-Patterns:**
- `const totalDb = totalCost * (1 - taxRate);` // float drift — forbidden.
- Using `issue_age` / `face_amount` in engine, store, or UI code.
- Calling `https://…/api/v1/project` from the browser (breaks the BFF/key boundary).
- Rounding to cents inside intermediate salary/FAS/NPV steps.
- Sending `firstName` / `dateOfBirth` in a `lifeproj` request.

## Project Structure & Boundaries

### Complete Project Directory Structure

```
schiff-serp/
├── README.md
├── package.json
├── svelte.config.js              # adapter-node configured
├── vite.config.ts
├── vitest.config.ts              # (or test config inside vite.config.ts)
├── tsconfig.json
├── eslint.config.js              # flat config; enforces $lib/server boundary
├── .prettierrc
├── .env                          # LIFEPROJ_API_KEY, LIFEPROJ_BASE_URL (gitignored)
├── .env.example                  # committed template
├── .gitignore
├── playwright.config.ts          # optional (e2e smoke)
├── .github/
│   └── workflows/
│       └── ci.yml                # vitest + svelte-check + build
├── static/
│   ├── favicon.png
│   └── fonts/                    # report typography (print fidelity)
├── src/
│   ├── app.html
│   ├── app.css                   # global styles + base print rules
│   ├── app.d.ts
│   ├── hooks.server.ts           # top-level error normalization + logging
│   ├── lib/
│   │   ├── domain/               # SHARED types + Valibot schemas (client-safe)
│   │   │   ├── company.ts
│   │   │   ├── model-settings.ts
│   │   │   ├── insured.ts
│   │   │   ├── quote.ts          # Quote aggregate (Company+Settings+Census+Results)
│   │   │   ├── illustration.ts   # DesignRequest / IllustrationResult (camelCase)
│   │   │   ├── results.ts        # liability + asset result types
│   │   │   ├── risk-class.ts     # enum (seeded; reconciled with /schema)
│   │   │   ├── errors.ts         # typed error classes + RunFailure
│   │   │   └── index.ts
│   │   ├── money/
│   │   │   ├── money.ts          # Big config, rounding policy, parse/format/toCents
│   │   │   └── money.test.ts
│   │   ├── dates/
│   │   │   ├── age.ts            # ageNearestBirthday, durations (single source)
│   │   │   └── age.test.ts
│   │   ├── engine/               # PURE calc engine (no Svelte, no I/O, no fetch)
│   │   │   ├── salary-projection.ts
│   │   │   ├── final-average-salary.ts
│   │   │   ├── benefit-stream.ts        # retirement → assumed death age (84)
│   │   │   ├── liability.ts             # total cost + NPV (discount param)
│   │   │   ├── tax-adjustment.ts        # Total DB = cost × (1 − tax)
│   │   │   ├── allocation.ts            # per-person DB (equal split)
│   │   │   ├── compute-liability.ts     # pure orchestrator over the above
│   │   │   ├── *.test.ts                # co-located unit tests
│   │   │   └── benchmark/
│   │   │       ├── benchmark-client.fixture.ts
│   │   │       └── benchmark.test.ts    # CORRECTNESS GATE (exact-to-the-cent)
│   │   ├── funding/              # pluggable funding strategy (seam: strategy)
│   │   │   ├── funding-strategy.ts      # interface
│   │   │   ├── cost-recovery.ts         # Option 1 implementation
│   │   │   ├── cost-recovery.test.ts
│   │   │   └── index.ts                 # strategy registry (Option 1 registered)
│   │   ├── orchestrator/        # CLIENT run orchestration (fail-fast)
│   │   │   ├── run.ts                   # engine+funding → N illustration calls
│   │   │   └── run.test.ts              # tested against a mocked api client
│   │   ├── api/                 # BROWSER → our BFF (client-safe)
│   │   │   ├── illustration-client.ts   # POST /api/illustration
│   │   │   └── schema-client.ts         # GET /api/schema
│   │   ├── persistence/
│   │   │   ├── quote-repository.ts      # interface (seam: persistence)
│   │   │   ├── local-storage-repository.ts
│   │   │   ├── serialization.ts         # Quote ⇄ JSON (money-as-decimal-string)
│   │   │   └── local-storage-repository.test.ts
│   │   ├── report/              # data-driven page registry (seam: report)
│   │   │   ├── registry.ts              # [{ id, title, component }]
│   │   │   ├── ReportView.svelte        # renders registry in order
│   │   │   ├── print.css                # @page + page-break control
│   │   │   └── pages/
│   │   │       ├── CoverPage.svelte
│   │   │       ├── CensusSummaryPage.svelte
│   │   │       └── ColiSummaryPage.svelte
│   │   ├── stores/             # Svelte 5 runes (.svelte.ts for module runes)
│   │   │   ├── quote.svelte.ts          # active Quote + typed update fns
│   │   │   ├── run-state.svelte.ts      # runState rune (status/progress/error)
│   │   │   └── schema.svelte.ts         # discovered schema cache (client)
│   │   ├── components/         # shared UI
│   │   │   ├── CompanyForm.svelte
│   │   │   ├── ModelSettingsForm.svelte
│   │   │   ├── CensusEditor.svelte
│   │   │   ├── CensusRow.svelte
│   │   │   ├── RunButton.svelte
│   │   │   ├── ProgressIndicator.svelte
│   │   │   └── QuoteList.svelte         # select / delete saved quotes
│   │   └── server/            # SERVER-ONLY (never bundled to browser)
│   │       ├── lifeproj/
│   │       │   ├── adapter.ts           # domain ⇄ wire (snake_case), keyed call
│   │       │   ├── wire-schemas.ts      # Valibot schemas for lifeproj (snake_case)
│   │       │   ├── errors.ts            # map 400/401/422/timeout → typed errors
│   │       │   └── adapter.test.ts
│   │       ├── schema-cache.ts          # cache lifeproj /schema
│   │       └── logger.ts                # structured server logging
│   └── routes/
│       ├── +layout.svelte              # app shell + nav (Setup ↔ Report)
│       ├── +page.svelte                # "/"  Setup + Census screen
│       ├── report/
│       │   └── +page.svelte            # "/report"  Results / Report screen
│       └── api/                        # internal BFF endpoints
│           ├── schema/
│           │   └── +server.ts          # GET → proxy lifeproj /schema (cached)
│           └── illustration/
│               └── +server.ts          # POST → proxy lifeproj /project (keyed)
└── tests/
    └── e2e/
        └── quote-flow.test.ts          # optional: census → run → report (mocked)
```

### Architectural Boundaries

**External API Boundary:**
- `src/lib/server/lifeproj/adapter.ts` is the ONLY code that opens an HTTPS connection
  to `lifeproj` and the ONLY holder of `X-API-Key`. All `snake_case` and wire details
  stop here.

**Internal BFF Boundary:**
- `src/routes/api/*/+server.ts` are the only network endpoints the browser calls. The
  browser reaches them through `src/lib/api/*-client.ts`; it never constructs a
  `lifeproj` URL.

**Server-Only Boundary:**
- Everything under `src/lib/server/**` and `+server.ts` runs only on the server
  (SvelteKit build-time guarantee). The API key cannot leak into the client bundle.

**Engine (Purity) Boundary:**
- `engine/`, `funding/`, `money/`, `dates/` import no Svelte and perform no I/O. They
  are pure functions over plain inputs → fully unit-testable; the benchmark test lives
  here as the correctness gate.

**Persistence Boundary:**
- `persistence/quote-repository.ts` is the swap point. `local-storage-repository.ts` is
  the MVP impl; a future `postgres-repository.ts` satisfies the same interface with no
  engine/UI change.

**State Boundary:**
- `stores/*` own all mutable app state. Components read state and `$derived` values and
  call typed store update functions — they never mutate Quote internals directly.

### Requirements to Structure Mapping

**Feature/FR-Category Mapping:**
- **Company & Plan Config (FR1–FR4):** `domain/company.ts`, `domain/model-settings.ts`,
  `components/CompanyForm.svelte`, `ModelSettingsForm.svelte`. **FR4** (API credential)
  is realized as a server env var in `.env` + `src/lib/server/lifeproj/adapter.ts`
  (not an in-app setting) — operator configures it; browser never sees it.
- **Census Management (FR5–FR10):** `domain/insured.ts`, `components/CensusEditor.svelte`
  + `CensusRow.svelte`, `stores/quote.svelte.ts`.
- **SERP Liability Calc (FR11–FR16):** `engine/*` (+ `money/`, `dates/`).
- **COLI Asset Design (FR17–FR22):** allocation/tax in `funding/cost-recovery.ts`
  (FR17–18); design+retrieve via `api/illustration-client.ts` →
  `routes/api/illustration/+server.ts` → `server/lifeproj/adapter.ts` (FR19–21);
  schema discovery via `server/schema-cache.ts` + `stores/schema.svelte.ts` (FR22).
- **Run Orchestration & Errors (FR23–FR27):** `orchestrator/run.ts`,
  `stores/run-state.svelte.ts`, `domain/errors.ts`, `server/lifeproj/errors.ts`,
  `components/RunButton.svelte` + `ProgressIndicator.svelte`.
- **Reporting & Export (FR28–FR32):** `report/registry.ts`, `report/pages/*`,
  `report/ReportView.svelte`, `report/print.css`, route `/report`.
- **Quote Persistence (FR33–FR35):** `persistence/*`, `components/QuoteList.svelte`.

**Cross-Cutting Concerns:**
- Money → `lib/money/`; Dates/age → `lib/dates/`; Validation → `domain/*` schemas +
  `server/lifeproj/wire-schemas.ts`; Errors/fail-fast → `domain/errors.ts` +
  `orchestrator/run.ts` + `server/lifeproj/errors.ts`; Logging → `server/logger.ts` +
  `hooks.server.ts`.

### Integration Points

**Internal Communication:**
- Components → store update fns → Quote state → engine (`$derived` liability) → report.
- Run: `RunButton` → `orchestrator/run.ts` → `api/illustration-client.ts` →
  `/api/illustration` → `server/lifeproj/adapter.ts`.

**External Integrations:**
- `lifeproj` v1: `POST /api/v1/project` (keyed) and `GET /api/v1/schema` (open),
  reached only via the server adapter.

**Data Flow:**
1. Operator enters Company/Settings/Census → validated (Valibot) → quote store.
2. Liability `Results` recompute instantly in-browser (`$derived` over the engine).
3. Run → funding strategy derives per-person face → N sequential proxied illustration
   calls → progress updates → asset `Results` populate the store (fail-fast on first
   error, inputs preserved).
4. Report pages render from `Results` via the registry; print/PDF via browser print.
5. Save → serialize (money→string) → `QuoteRepository` (localStorage); reopen
   deserializes to identical inputs and results.

### File Organization Patterns

- **Configuration:** root-level (`svelte.config.js`, `vite.config.ts`,
  `vitest.config.ts`, `tsconfig.json`, `eslint.config.js`, `.env*`).
- **Source:** domain logic under `src/lib/**` (pure where possible); screens under
  `src/routes/**`; server-only under `src/lib/server/**` + `routes/api/**`.
- **Tests:** co-located `*.test.ts` (Vitest); benchmark under `engine/benchmark/`;
  optional Playwright under `tests/e2e/`.
- **Assets:** `static/` (favicon, report fonts); component-scoped styles in `.svelte`
  files; print rules in `app.css` + `report/print.css`.

### Development Workflow Integration

- **Dev server:** `npm run dev` (Vite HMR at `:5173`); server routes run in the same
  process — the proxy and SPA evolve together.
- **Build:** `vite build` via `@sveltejs/adapter-node` → runnable `build/` (`node build`).
- **Deploy:** the same Node artifact runs locally now and on Railway later; only `.env`
  differs between environments.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
SvelteKit 2 + Svelte 5 + Vite + Vitest + adapter-node form a single, mutually
compatible toolchain. big.js and Valibot are pure, isomorphic libraries that run
identically in the browser (engine, client validation) and on the server (adapter,
wire validation) — no environment conflict. Runes-in-modules (`*.svelte.ts`) is the
supported Svelte 5 mechanism for the stores. No contradictory decisions found.

**Pattern Consistency:**
The naming/format/process patterns reinforce the decisions: money-as-decimal-string +
big.js (NFR3), `snake_case` confined to the adapter (single ACL seam), fail-fast error
model wired through orchestrator + typed errors, validation at boundaries with Valibot.
The purity boundary (`engine/funding/money/dates` import no Svelte) is what makes the
benchmark gate possible.

**Structure Alignment:**
The directory tree physically enforces the boundaries: `src/lib/server/**` +
`routes/api/**` quarantine the key and `lifeproj` wire shape; `engine/` purity enables
deterministic unit tests; the three seam interfaces (`funding-strategy`,
`quote-repository`, report `registry`) each have a concrete home and a clear swap point.

### Requirements Coverage Validation ✅

**Functional Requirements Coverage (35/35):**
- **Company & Config (FR1–4):** `domain/company`, `domain/model-settings`, forms.
  FR4 satisfied via server env var (deliberate improvement over in-app setting).
- **Census (FR5–10):** `domain/insured`, `CensusEditor`/`CensusRow`, quote store;
  FR10 review = the Setup screen census table before `RunButton`.
- **Liability (FR11–16):** `engine/*`; FR16 per-participant + aggregate carried in
  `results.ts`.
- **COLI Design (FR17–22):** FR17–18 in `funding/cost-recovery`; FR19–21 via the
  adapter (incl. surfacing `gpt_adjusted`/`mec_adjusted` + guideline premiums); FR22
  via schema discovery/cache.
- **Run & Errors (FR23–27):** `orchestrator/run`, `run-state`, typed errors, progress.
- **Reporting (FR28–32):** report registry + 3 pages + print CSS; FR32 browser print.
- **Persistence (FR33–35):** `persistence/*` + `QuoteList`.

**Non-Functional Requirements Coverage (15/15):**
- Accuracy (NFR1–5): pure engine, benchmark gate, big.js, single date utility, all
  figures parameterized/documented. **(See Gap I-1 re: the benchmark source.)**
- Performance (NFR6–7): in-browser `$derived` recalc; O(N) sequential calls + progress.
- Integration/Reliability (NFR8–11): single adapter; distinct 400/401/422; timeout →
  whole-run fail; deterministic reopen via money-as-string serialization.
- Security/Privacy (NFR12–13): actuarial-only outbound type; key server-side **now**
  (NFR13 exceeded — no future relocation needed).
- Maintainability (NFR14–15): three seam interfaces; tax/discount as model settings.

### Implementation Readiness Validation ✅

- **Decision completeness:** critical decisions documented with verified versions
  (big.js 7.0.1, Valibot 1.4.1; Svelte 5 / SvelteKit 2 / Vite via scaffolder).
- **Structure completeness:** concrete tree with every module, boundary, and the
  FR→file mapping.
- **Pattern completeness:** the 10 conflict points each have a rule + good/anti
  examples + enforcement (ESLint boundary, svelte-check, benchmark gate).

### Gap Analysis Results

**Important (resolve during early implementation, not blocking the architecture):**
- **I-1 — Benchmark fixture under MVP assumptions.** NFR2 needs a known-good reference
  computed with 0% discount / no mortality / pay-to-84. The Sample Report.pdf (5.75%
  discount + FASB mortality) cannot serve directly. *Resolution:* the operator supplies
  (or signs off on) a small reference quote computed under MVP rules; it becomes
  `benchmark-client.fixture.ts` and the rounding policy is calibrated to it.
- **I-2 — Option 1 premium determination + `solve` scope.** Producing a Cost-Recovery
  illustration from a derived face amount requires a premium; the sample implies a
  *solved level premium over a ~5-year pay window*. *Resolution/recommendation:* include
  `solve` support in the `lifeproj` adapter in the MVP (small addition), and confirm the
  exact target with the operator (e.g., level premium to endow / hit a target net
  surrender value, and the pay-period length). This refines the PRD's "solve = Phase 2".

**Minor (small, test- or fallback-level):**
- **M-1 — Schema fallback.** If `GET /schema` is unreachable at startup, fall back to
  the six seeded risk-class strings + documented defaults; surface a non-blocking notice.
- **M-2 — Money round-trip test.** Add an explicit serialization test asserting
  `Big → string → Big` equality to guarantee NFR11 on reopen.
- **M-3 — Boundary-birthday tests.** The date utility needs explicit age-nearest-
  birthday boundary cases (issue_age vs benefit timing) as a standing test.

**Nice-to-have (future):**
- **N-1 — Full-report PDF fidelity.** Browser print suffices for the 3 MVP pages; the
  ~52-page report (audit trails, FASB tables) should re-evaluate browser-print vs a
  PDF library when those sections are built.

### Validation Issues Addressed

- I-2 produced a concrete architectural refinement: **`solve` moves into MVP adapter
  scope** (the funding-strategy interface still cleanly carries Options 2–4 later).
- I-1 is captured as the first dependency of the engine work: the benchmark fixture
  precedes rounding-policy finalization.
- M-1/M-2/M-3 are folded into the relevant modules' test/fallback requirements.

### Architecture Completeness Checklist

**✅ Requirements Analysis** — context, scale, constraints, cross-cutting concerns.
**✅ Architectural Decisions** — critical decisions with versions; integration + perf.
**✅ Implementation Patterns** — naming, structure, communication, process.
**✅ Project Structure** — full tree, boundaries, integration points, FR mapping.

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION (with I-1 and I-2 confirmed at the start of
the engine/adapter work).

**Confidence Level:** High — the dominant risk (calculation correctness) is contained
behind a pure, benchmarked engine; the single external dependency is isolated behind one
adapter; every Phase 2/3 expansion has a pre-built seam.

**Key Strengths:**
- Correctness-first: pure engine + decimal money + a benchmark gate in CI.
- The thin-backend choice eliminates the PRD's key-exposure/CORS caveats immediately.
- Six future-proofing seams keep Options 2–4 and the 52-page report additive.
- Strong, enforceable agent-consistency rules (money, dates, PII, `snake_case` boundary).

**Areas for Future Enhancement:**
- Postgres persistence + auth (Phase 3), full report + PDF strategy (Phase 2),
  non-zero discount + mortality tables, additional benefit formulas.

### Implementation Handoff

**AI Agent Guidelines:**
- Follow the documented decisions and patterns exactly; respect the module boundaries.
- Treat the benchmark test as the correctness gate; never weaken it to pass.
- All `lifeproj` access flows through the server adapter; never expose the key client-side.
- Resolve I-1 (benchmark fixture) and I-2 (Option 1 `solve` target) with the operator
  before finalizing the engine and adapter.

**First Implementation Priority:**
`npx sv create schiff-serp` (TypeScript, Vitest, ESLint, Prettier) → switch to
`@sveltejs/adapter-node` → scaffold the `src/lib` module folders. This is the first
implementation story.
