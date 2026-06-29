# Ralph Fix Plan

## Stories to Implement

### Quote Setup, Census & Persistence
> Goal: The operator can create, open, save, and delete named quotes; set company and model settings (documented defaults with per-quote overrides); and build, edit, and review a full executive census — a complete, persistent data-entry workspace. This epic establishes the project foundation and all input-side capabilities, so the operator can capture and manage everything a proposal needs even before the calculation engine exists.

- [x] Story 1.1: Initialize the SvelteKit project and module structure
- [x] Story 1.2: Establish money, date/age, and domain-model foundations
- [x] Story 1.3: Create and configure a quote (company + model settings)
- [x] Story 1.4: Build and review the executive census
- [x] Story 1.5: Save, reopen, list, and delete quotes
### SERP Liability Calculation
> Goal: From a census, the operator gets a defensible, deterministic, exact-to-the-cent liability — salary projection → final average salary → annual benefit (Factor × FAS) → year-by-year stream → total cost + NPV — presented per-participant and in aggregate. The engine is built as pure, side-effect-free functions (no Svelte, no I/O) so it is fully unit-testable, and a benchmark-client test stands as the permanent correctness gate.

- [x] Story 2.1: Project salary to retirement and compute final average salary
- [x] Story 2.2: Compute the annual benefit and year-by-year benefit stream
- [x] Story 2.3: Compute total benefit cost and net present value
  > As the proposal author
  > I want the system to total the plan's benefit cost and its NPV at the configured discount rate
  > So that I have the single liability figure the funding calculation depends on.
  > AC: Given each insured's benefit stream, When the engine computes total benefit cost, Then it returns the correct undiscounted sum across all SERP participants (FR15)
  > AC: Given the configured NPV discount rate (parameter, default 0%), When the engine computes NPV, Then it discounts the streams correctly, and changing the rate is a data change requiring no code change (FR15, NFR15)
  > AC: Given the engine modules, When the pure `compute-liability` orchestrator runs, Then it composes salary → FAS → benefit → stream → total/NPV with no hardcoded constants — every figure traces to an input or a named formula (NFR5)
  > Spec: specs/planning-artifacts/epics.md#story-2-3
- [ ] Story 2.4: Present per-participant and aggregate liability results live
  > As the proposal author
  > I want liability results shown per participant and in aggregate, recalculating instantly as I change inputs
  > So that I can see the impact of an assumption change immediately.
  > AC: Given a quote with a complete census, When liability is computed, Then results are available both per participant and in aggregate (FR16)
  > AC: Given the quote store, When any liability-relevant input changes, Then liability `Results` are recomputed as `$derived` values and the view updates in well under ~5 seconds (target sub-second) (NFR6, AR12)
  > AC: Given computed liability results, When the quote is serialized, Then the `Results` snapshot is carried on the Quote aggregate for persistence and reopen (supports NFR11)
  > Spec: specs/planning-artifacts/epics.md#story-2-4
- [~] Story 2.5: Lock the benchmark correctness gate — SKIPPED per operator (2026-06-28): no signed-off reference quote; calc errors to be corrected later. Do not block engine work on this. Leave the engine structured so a benchmark fixture can be dropped in later, but do not implement the benchmark gate now.
  > As a developer
  > I want a known-good benchmark client asserted exact-to-the-cent in CI
  > So that no future change can silently break liability correctness.
  > AC: Given the operator-supplied (or signed-off) reference quote computed under MVP rules — 0% discount, no mortality, pay-to-84, When it is captured as `benchmark-client.fixture.ts`, Then the rounding policy is calibrated to it and `benchmark.test.ts` asserts the SERP benefit streams and total/NPV match exactly to the cent (FR-engine, NFR2, AR16/I-1)
  > AC: Given the benchmark test, When CI runs, Then the benchmark assertion is part of the standing correctness gate and must stay green (NFR1, NFR2)
  > AC: Given the absence of a signed-off reference, When engine work begins, Then obtaining the reference is an explicit blocking prerequisite, surfaced to the operator (AR16/I-1)
  > Spec: specs/planning-artifacts/epics.md#story-2-5
### COLI Asset Design via Illustration Engine (Cost Recovery / Option 1)
> Goal: The operator runs the full model in a single action: the system computes the tax-adjusted total death benefit, allocates per-person face amounts, and algorithmically designs and retrieves each COLI policy via the external `lifeproj` engine — surfacing GPT/MEC flags and guideline premiums — with whole-run fail-fast and progress feedback. All `lifeproj` access is confined to one server-side adapter; the browser never sees the API key and only actuarial fields cross the boundary.

- [ ] Story 3.1: Build the lifeproj server adapter and credential boundary
  > As a developer
  > I want a server-only anti-corruption adapter that is the sole caller of `lifeproj` and the sole holder of the API key
  > So that the wire contract, credential, and PII boundary are enforced in one place.
  > AC: Given `LIFEPROJ_API_KEY` and `LIFEPROJ_BASE_URL` in server env (`$env/static/private`), When the adapter calls `POST /api/v1/project`, Then it injects `X-API-Key` server-side and the key never reaches the browser bundle (FR4, NFR13)
  > AC: Given a domain `DesignRequest` (camelCase, actuarial fields only — issue age, gender, risk class, face amount, design params), When the adapter maps it to the wire request, Then `snake_case` and the wire shape appear only inside `src/lib/server/lifeproj/`, and no name/DOB/identifier is structurally present in the outbound type (NFR12, FR19)
  > AC: Given a `lifeproj` response, When the adapter maps it to `IllustrationResult`, Then it returns per-insured yearly premium, account value, cash surrender value, and death benefit, plus `gpt_adjusted` / `mec_adjusted` and guideline premiums (FR20, NFR8)
  > AC: Given API responses 400 / 401 / 422 / timeout, When the adapter handles them, Then each maps to a distinct typed error (`ValidationError(details[])`, `AuthError`, `ProjectionError`, `ConnectivityError`), surfacing field-level messages where provided (NFR9, AR8)
  > Spec: specs/planning-artifacts/epics.md#story-3-1
- [ ] Story 3.2: Expose the internal BFF endpoints
  > As a developer
  > I want internal `/api/schema` and `/api/illustration` endpoints the browser calls
  > So that the client never constructs a `lifeproj` URL and the proxy is the only network surface.
  > AC: Given the server adapter, When `GET /api/schema` is called, Then it proxies `lifeproj` `/schema` and returns it (cached per session) (AR7, AR10)
  > AC: Given the server adapter, When `POST /api/illustration` is called with a design request, Then it returns a single projection result or a mapped error envelope `{ error: { kind, message, details? } }` with pass-through status codes (AR7, NFR9)
  > AC: Given the browser, When it needs schema or an illustration, Then it calls only `src/lib/api/*-client.ts` against same-origin BFF routes, never `lifeproj` directly (AR6)
  > Spec: specs/planning-artifacts/epics.md#story-3-2
- [ ] Story 3.3: Discover, cache, and reconcile the engine schema
  > As the proposal author
  > I want the app to learn the engine's accepted values from its published schema
  > So that risk classes and defaults stay in lockstep with the engine instead of drifting from hardcoded values.
  > AC: Given app start, When `/api/schema` is fetched, Then enums and defaults are cached for the session and feed both Valibot validation and the census UI (FR22, AR10)
  > AC: Given the discovered schema, When the census risk-class field is rendered, Then its options reconcile with the engine's risk-class set (replacing the Epic 1 seeded enum) (FR8, FR22)
  > AC: Given `/schema` is unreachable at startup, When the app falls back, Then it uses the six seeded risk-class strings + documented defaults and shows a non-blocking notice (AR10/M-1)
  > Spec: specs/planning-artifacts/epics.md#story-3-3
- [ ] Story 3.4: Compute the tax-adjusted death benefit and allocate per-person face
  > As the proposal author
  > I want the Cost-Recovery funding strategy to size the total death benefit and split it per participant
  > So that each insured has a face amount the illustration can be designed around.
  > AC: Given the total benefit cost and the corporate tax rate, When the funding strategy computes the total COLI death benefit, Then it returns `Total DB = total cost × (1 − tax rate)` as a single named, tested function (FR17, risk-mitigation)
  > AC: Given the total death benefit and the set of COLI participants, When the strategy allocates, Then it derives each insured's face amount by equal split (FR18)
  > AC: Given the funding-strategy interface, When Cost Recovery (Option 1) is implemented, Then it is registered behind the strategy seam so Options 2–4 are additive without touching the engine (NFR14)
  > Spec: specs/planning-artifacts/epics.md#story-3-4
- [ ] Story 3.5: Algorithmically design each COLI policy via solve
  > As the proposal author
  > I want the system to derive each insured's Cost-Recovery premium by solving against the illustration engine
  > So that the COLI policy is designed automatically rather than hand-tuned.
  > AC: Given an insured's face amount and actuarial inputs, When the design loop runs, Then it uses `lifeproj` `solve` to derive the Cost-Recovery premium (solved level premium over the agreed pay window) and retrieves the resulting illustration (FR19, AR17/I-2)
  > AC: Given the solve target is not yet confirmed, When design work begins, Then the exact target (e.g., level premium to endow / target net surrender value, and pay-period length) is confirmed with the operator as an explicit prerequisite (AR17/I-2) — RESOLVED per operator (2026-06-28): solve target is $1000 net surrender value at age 100. Design the Cost-Recovery solve so each policy's CSV reaches $1,000 at age 100.
  > AC: Given the adapter's `solve` support, When it is exercised, Then it is covered by adapter tests against a mocked engine response
  > Spec: specs/planning-artifacts/epics.md#story-3-5
- [ ] Story 3.6: Orchestrate the single-action run with progress and results
  > As the proposal author
  > I want one action that runs the whole model and shows progress
  > So that I get a complete liability + asset result without manual steps.
  > AC: Given a complete quote, When I trigger Run, Then the pure engine computes liability and per-person face in-browser, then the client issues N sequential `POST /api/illustration` calls — one per COLI participant (FR23, AR9)
  > AC: Given a multi-member run, When illustrations are being designed, Then `runState` transitions `computing → designing → done` and a progress indicator shows completed/total (FR27, NFR7, AR12)
  > AC: Given completed asset design, When results populate, Then each insured's premium / account value / CSV / death benefit and the `gpt_adjusted` / `mec_adjusted` flags + guideline premiums are surfaced to the operator — never silently ignored (FR21, FR20)
  > Spec: specs/planning-artifacts/epics.md#story-3-6
- [ ] Story 3.7: Validate inputs against the engine contract before a run
  > As the proposal author
  > I want my census and settings checked against the engine's contract before any call
  > So that avoidable errors are caught up front with clear, field-level messages.
  > AC: Given a quote about to run, When pre-run validation executes, Then census and settings are validated against the `lifeproj` contract (via Valibot schemas informed by the discovered schema) (FR24, AR4)
  > AC: Given a contract violation (e.g., missing/invalid risk class), When validation fails, Then specific, field-level issues are reported to the operator and the run does not start (FR24)
  > Spec: specs/planning-artifacts/epics.md#story-3-7
- [ ] Story 3.8: Fail the whole run fast and preserve inputs for re-run
  > As the proposal author
  > I want a failed run to stop cleanly with a clear reason and keep my inputs intact
  > So that I never get partial or ambiguous output and can correct and re-run.
  > AC: Given any error during a run (validation / auth / projection / connectivity), When it occurs, Then the orchestrator aborts remaining calls (AbortController), sets `runState = failed` with a specific reason, and produces no partial output (FR25, NFR10)
  > AC: Given a per-call timeout, When the engine is slow or unreachable, Then the call fails as `ConnectivityError` and the whole run fails with a clear message (no silent hang) (NFR10)
  > AC: Given a failed run, When I correct the offending input, Then all previously entered data is intact (a run never mutates inputs) and I can re-run from scratch — there is no partial retry/resume (FR26)
  > Spec: specs/planning-artifacts/epics.md#story-3-8
### Proposal Report Generation & Export
> Goal: The operator generates the client-ready proposal — Cover, Census Summary, and COLI Summary as discrete, data-driven pages personalized with the prospect company name — and prints or exports to PDF with presentation-grade layout. A data-driven page registry keeps the future ~52-page report purely additive.

- [ ] Story 4.1: Build the data-driven report page registry and renderer
  > As a developer
  > I want a report rendered from a page registry
  > So that new report pages can be added later without touching existing pages.
  > AC: Given the report module, When the registry is defined, Then it is a list of `{ id, title, component }` entries and `ReportView` renders the registered pages in order on the `/report` route (FR31, AR13)
  > AC: Given the run state, When results are not yet ready, Then the report renders only when `runState.status === 'done'` (otherwise prompts to run) (supports FR28–30)
  > AC: Given a new page is added later, When it is registered, Then it appears in the report with no change to existing pages (FR31, NFR14)
  > Spec: specs/planning-artifacts/epics.md#story-4-1
- [ ] Story 4.2: Generate the Cover page
  > As the proposal author
  > I want a cover page personalized with the prospect company name
  > So that the proposal opens as a polished, client-specific document.
  > AC: Given a quote with a company name and a completed run, When the Cover page renders, Then it displays the SERP-financed-with-COLI proposal cover personalized with the prospect company name (FR28), And it is registered in the report registry (FR31)
  > Spec: specs/planning-artifacts/epics.md#story-4-2
- [ ] Story 4.3: Generate the Census Summary page
  > As the proposal author
  > I want a census summary page listing the plan participants
  > So that the client sees who the plan covers.
  > AC: Given a quote with a census and a completed run, When the Census Summary page renders, Then it lists the plan participants with their key fields (FR29), And it is registered in the report registry (FR31)
  > Spec: specs/planning-artifacts/epics.md#story-4-3
- [ ] Story 4.4: Generate the COLI Summary page
  > As the proposal author
  > I want a COLI summary page showing the headline funding numbers
  > So that the client sees what funding the plan with COLI costs.
  > AC: Given a completed run, When the COLI Summary page renders, Then it shows the total death benefit and total first-year premium (FR30), And monetary values are formatted from decimal-string money (AR2), And it is registered in the report registry (FR31)
  > Spec: specs/planning-artifacts/epics.md#story-4-4
- [ ] Story 4.5: Print and export the proposal to PDF with presentation-grade layout
  > As the proposal author
  > I want to print or export the proposal to PDF with stable, presentation-grade pages
  > So that I can bring the deliverable to a client meeting.
  > AC: Given a completed report, When I print/export, Then `window.print()` produces page-accurate output using dedicated print CSS (`@page`, page-break control) (FR32, AR14)
  > AC: Given the three MVP pages, When exported to PDF, Then each renders as a clean, presentation-grade page with stable layout (no clipped or split content) (FR32)
  > Spec: specs/planning-artifacts/epics.md#story-4-5

## Completed

## Operator Decisions (2026-06-28)
- **Story 2.5 (benchmark gate): SKIPPED.** No signed-off reference quote available. Calculation errors will be corrected later. Do not block Epic 2 engine work on the benchmark; keep the engine structured so a benchmark fixture can be added later.
- **Story 3.5 (solve target): $1,000 net surrender value at age 100.** Design the Cost-Recovery solve so each COLI policy's CSV reaches $1,000 at age 100.

## Notes
- Follow TDD methodology (red-green-refactor)
- One story per Ralph loop iteration
- Update this file after completing each story
