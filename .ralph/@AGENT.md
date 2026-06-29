# Agent Build Instructions

## Project Setup
```bash
npm install
```

## Running Tests
```bash
npx vitest run
```

## Build Commands
```bash
npm run build
```

## Development Server
```bash
npm run dev
```

## Production Build (adapter-node)
```bash
npm run build   # -> build/  (build/index.js, build/handler.js)
npm run start   # node build  (runs the production Node server)
```

## Type & Lint Gates
```bash
npm run check   # svelte-kit sync && svelte-check  (type checking)
npm run lint    # prettier --check . && eslint .    (enforces $lib/server boundary)
npm run format  # prettier --write .
```

## Key Learnings
- **Stack (Story 1.1):** SvelteKit 2 + Svelte 5 (runes forced via `svelte.config.js` compilerOptions),
  TypeScript, Vite 8, Vitest 4, ESLint 10 flat config, Prettier, `@sveltejs/adapter-node`.
- **Scaffolder gotcha:** `npx sv create` (sv CLI v0.16.1) is interactive. Use
  `sv create <dir> --template minimal --types ts --no-add-ons --no-install`, then
  `sv add --no-install --no-git-check eslint prettier vitest=usages:unit sveltekit-adapter=adapter:node`.
  Omitting `--no-add-ons` on `create` leaves an add-ons prompt that, if interrupted, deletes
  `svelte.config.js` and corrupts the workspace.
- **svelte.config.js:** The current sv CLI puts the adapter in `vite.config.ts` and omits
  `svelte.config.js`. We use the conventional layout instead: adapter-node lives in
  `svelte.config.js`; `vite.config.ts` only holds `sveltekit()` + the vitest `test` block.
- **$lib/server boundary:** enforced two ways — SvelteKit build-time guarantee AND an ESLint
  `no-restricted-imports` rule (in `eslint.config.js`) that excludes server-side files
  (`src/lib/server/**`, `+server.ts`, `*.server.ts`, `hooks.server.ts`).
- **Prettier scope:** `.prettierignore` excludes BMAD/Ralph tooling + planning docs
  (`_bmad/`, `_bmad-output/`, `.ralph/`, `bmalph/`, `.claude/`, `API.md`, `CLAUDE.md`) so
  `npm run lint` only checks application source.
- **Vitest config:** uses a `server` project (node environment) including
  `src/**/*.{test,spec}.{js,ts}` — the home for the pure engine suites. `requireAssertions: true`
  is on, so every test must assert.
- Fastest cycle: `npm test` (~0.2s for the placeholder suite); `npm run build` ~2.3s.

### Foundations (Story 1.2)
- **Money — `$lib/money/money.ts` (big.js 7.0.1).** Single rounding policy set at module
  load: `Big.RM = Big.roundHalfUp`, `Big.DP = 20` (high division precision; never round
  mid-calc). Money is `Big` in the engine, decimal strings everywhere else. Serialize with
  `serializeMoney` (lossless `toString`), parse with `parseMoney`, display with `formatMoney`
  (2 dp). `isMoneyString` is the Valibot-free predicate the domain wraps. **Never use a JS
  `number` for money outside the engine.**
- **Dates — `$lib/dates/age.ts`.** `ageNearestBirthday(dob, asOf)` is the single age source
  (age nearest birthday; ties round up). Dates are ISO `YYYY-MM-DD`; all math is UTC. Feb-29
  birthdays fall back to Feb-28 in non-leap years. `isValidIsoDate` is the domain's date
  predicate. Never inline date math elsewhere.
- **Domain — `$lib/domain/` (Valibot 1.4.2).** Schemas are the source of truth; types via
  `v.InferOutput` (no hand-written parallel interfaces). Files: `value-objects.ts`
  (MoneyString/IsoDate/Rate/…), `risk-class.ts` (six seeded `health` strings), `company.ts`,
  `model-settings.ts` (+ `DEFAULT_MODEL_SETTINGS`: growth 3% / discount 0% / death age 84),
  `insured.ts` (gender M/F, plan membership COLI/SERP/BOTH), `results.ts`, `quote.ts`
  (aggregate root, `schemaVersion`, `createQuote`), `index.ts` barrel. No `snake_case` in any
  domain type.
- **`$lib` alias in tests:** Vitest resolves `$lib/*` via the SvelteKit Vite plugin — import
  cross-module helpers as `$lib/money/money`, not relative paths, in non-co-located code.

### Quote setup + runes store (Story 1.3)
- **Active quote store — `$lib/stores/quote.svelte.ts`.** A single `QuoteStore` class
  instance (`quoteStore`) with a `current = $state<Quote | null>(null)` field. Reactive
  across components because they all read the same instance. Mutations are immutable-style
  (`updateCompany`/`updateModelSettings`/`setCensus` reassign `current` and the nested
  object) so `$derived`/`$effect` track and `DEFAULT_MODEL_SETTINGS` is never mutated.
- **Testing runes stores in node:** name the test `*.store.test.ts` (NOT `*.svelte.test.ts`)
  so it runs in the node "server" vitest project — `*.svelte.{test,spec}` is excluded there
  and no browser project exists. Importing the `.svelte.ts` module compiles fine; reading
  state in assertions is non-reactive, which is what we want.
- **Field-level validation — `$lib/domain/validate.ts` `fieldErrors(schema, input)`.**
  Returns `{ topLevelField: message }` from `v.safeParse(..., { abortPipeEarly: true })`.
  Forms (`CompanyForm`, `ModelSettingsForm`) build a candidate object from raw string
  inputs (empty -> `NaN` to force an error), `$derived` the errors, and commit to the store
  only when there are none (AR4).
- **Components are runes-mode** (`$props`/`$state`/`$derived`, `onclick`/`oninput`
  attributes, `{@render children()}`) — project forces runes via `svelte.config.js`.

### Executive census (Story 1.4)
- **Store census methods (`quote.svelte.ts`):** `addInsured(Omit<Insured,'id'>)` (store
  assigns the id via `crypto.randomUUID`), `updateInsured(id, patch)`, `removeInsured(id)` —
  all immutable (map/filter/spread), so reactivity tracks (AR12).
- **`InsuredDraftSchema = v.omit(InsuredSchema, ['id'])`** — the form validates a draft (no
  id) with `fieldErrors`; the operator never supplies an id.
- **`CensusEditor.svelte`** is one form that doubles as add/edit (`editingId` state), plus a
  review table (FR10). Salary displays via `formatMoney(money(value))`; selects are seeded
  from `RISK_CLASSES` / `GENDERS` / `PLAN_MEMBERSHIPS`. Census editing only renders inside
  the active-quote branch of `/`, so SSR (no active quote) shows just the create form.

### Persistence (Story 1.5)
- **Seam:** `$lib/persistence/quote-repository.ts` defines the async `QuoteRepository`
  (`list/get/save/delete`) + `QuoteSummary`. UI/stores depend ONLY on this interface; a DB
  swap reimplements it and touches nothing else (NFR14).
- **Impl:** `local-storage-repository.ts` — `LocalStorageQuoteRepository` keyed by
  `schiff-serp:quote:<id>`, depends on a minimal `KeyValueStorage` port (testable with an
  in-memory fake; `localStorage` satisfies it structurally). `getQuoteRepository()` resolves
  `localStorage` lazily so importing is SSR-safe — only call it in browser (onMount/handlers).
- **Serialization:** `serialization.ts` — money is decimal strings in the Quote, so JSON
  round-trips exactly (AR18); `deserializeQuote` validates via `QuoteSchema` (migration seam).
- **Façade:** `$lib/stores/saved-quotes.svelte.ts` (`savedQuotes`) — reactive `summaries`
  refreshed after save/remove; UI never touches the repo directly. `QuoteList.svelte` opens
  (loads full quote into `quoteStore`) and deletes; Setup route has a Save button.

### Engine — salary & FAS (Story 2.1)
- **Pure engine in `$lib/engine/`** — imports ONLY `$lib/money` (for `Big` + policy) and
  `$lib/dates` (age). NO Svelte/SvelteKit/`$app`/fetch imports, so it is unit-testable in
  isolation (AR15). Money is a `Big` inside the engine; conversion to decimal strings happens
  later at the results boundary (Story 2.4).
- **`projectSalary({currentSalary, dateOfBirth, asOf, retirementAge, salaryGrowthRate})`** →
  `SalaryYear[]` (`{age, salary: Big}`) from current age (age-nearest-birthday as of `asOf`)
  to retirement age inclusive: `salary(age)=currentSalary×(1+g)^(age−currentAge)`. `asOf` is an
  explicit param (engine stays pure/deterministic — no `today()`). No rounding (NFR5).
- **`finalAverageSalary(path, averagingPeriod)`** → `Big`, averages the trailing N years
  (full-precision `Big.div`, Big.DP=20); averages what's available if the path is shorter;
  throws on empty path / non-positive period (programmer error).
- **Calc convention (calibratable):** FAS includes the retirement-age salary in its trailing
  window. Benchmark gate is skipped (operator decision) — conventions get calibrated when a
  signed-off reference quote arrives.

### Engine — benefit & stream (Story 2.2)
- **`annualBenefit(fas: Big, benefitPercentage: number)`** → `Big` = Factor × FAS (FR13).
- **`benefitStream({annualBenefit, retirementAge, benefitWaitingPeriod, assumedDeathBenefitAge})`**
  → `BenefitYear[]` (`{age, amount: Big}`): level payments from `retirementAge +
  benefitWaitingPeriod` through `assumedDeathBenefitAge` inclusive (FR14). Empty if first
  payment age > death age; throws on negative/non-integer waiting period. MVP is a level
  benefit (no COLA/mortality decrement).

### Engine — liability + orchestrator (Story 2.3)
- **`totalBenefitCost(stream)`** → `Big`, undiscounted sum (FR15).
- **`netPresentValue(stream, discountRate, fromAge)`** → `Big`: each payment at `age`
  discounted by `(1+rate)^(age−fromAge)`, where `fromAge` is the valuation/current age. 0% ⇒
  equals the undiscounted total. Discount rate is a parameter — a data change, not code (NFR15).
- **`computeLiability({census, settings, asOf})`** → `LiabilityResult` (`perParticipant` +
  `aggregate`, all `Big`). Filters to SERP participants (`isSerpParticipant`, so COLI-only are
  excluded, BOTH included), composes salary→FAS→benefit→stream→total/NPV, aggregates total +
  NPV. No hardcoded actuarial constants — every figure traces to a setting/input/named formula.
- Engine is Big-internal; mapping `LiabilityResult` → domain `Results` (decimal strings) and
  wiring to the store/UI is Story 2.4.

### Live liability results (Story 2.4)
- **`engine/results-mapping.ts` `toResults(LiabilityResult)`** → domain `Results`: rounds
  money to cents (`formatMoney`, half-up) at this output boundary (NFR5); asset fields omitted
  (Epic 3). Validated against `ResultsSchema` so it persists cleanly.
- **`$lib/stores/liability.svelte.ts` (`liability`)** — `current` (`$derived.by`) recomputes
  `computeLiability` from `quoteStore.current` (census + settings) whenever inputs change;
  `results` re-maps to the domain snapshot. Valuation date = `today()` (local). In-browser +
  pure ⇒ sub-second (NFR6). It never mutates the quote (no reactive loop).
- **`LiabilityResults.svelte`** shows per-participant + aggregate (FR16), wired into `/` under
  the census. Persistence: the Setup route's Save snapshots `liability.results` onto the quote
  via `quoteStore.setResults(...)` before saving, so results reopen with the quote (AC3/NFR11).

### lifeproj adapter + credential boundary (Story 3.1)
- **`src/lib/server/lifeproj/` is the ONLY place the snake_case wire shape and the API key
  live.** `adapter.ts` is injectable (`createLifeprojAdapter({baseUrl, apiKey, fetch, timeoutMs})`)
  so it imports no `$env` and is unit-tested with a mock fetch. `mapDesignRequestToWire`
  (camelCase→snake_case, actuarial-only — no PII, NFR12) and `mapWireResponseToResult`
  (wire numbers→money strings via `formatMoney`).
- **Credential boundary — `credentials.ts` `getLifeprojAdapter()`** reads `$env/dynamic/private`
  (LIFEPROJ_API_KEY/_BASE_URL) and builds the adapter; throws if unset. Uses **dynamic** (not
  static) so `build`/CI doesn't require secrets present; still server-only (under `$lib/server`)
  so the key never reaches the browser (NFR13). Not imported by tests.
- **Domain types — `domain/illustration.ts`:** `DesignRequest` (camelCase, actuarial-only,
  optional `solve` block) and `IllustrationResult` (per-year premium/account value/CSV/death
  benefit + `gptAdjusted`/`mecAdjusted` + guideline premiums). CSV is mapped from account value
  (wire report has no surrender column) — documented, calibratable via `/schema`.
- **Typed errors — `errors.ts`:** 400→`LifeprojValidationError(details[])`, 401→`LifeprojAuthError`,
  422→`LifeprojProjectionError(message)`, timeout/network→`LifeprojConnectivityError`; discriminate
  on `.kind`. Per-call timeout via `AbortController` (+ `AbortSignal.any` with a caller signal).
- BFF endpoints that call `getLifeprojAdapter()` are Story 3.2.

### Internal BFF endpoints (Story 3.2)
- **Routes:** `GET /api/schema` (`src/routes/api/schema/+server.ts`) proxies lifeproj
  `/schema` via `schema-cache.ts` (server-process cache); `POST /api/illustration`
  (`.../illustration/+server.ts`) validates the body against `DesignRequestSchema`, calls
  `getLifeprojAdapter().project(...)`, returns the result or a mapped error envelope.
- **`adapter.schema()`** added; fetch/timeout refactored into a shared `fetchWithTimeout` helper.
- **Error envelope — `error-envelope.ts` `toErrorEnvelope(err)`** → `{ status, body: { error:
  { kind, message, details? } } }`; pass-through status (400/401/422/504), unknown → generic
  500 with NO internal leak.
- **Browser clients — `$lib/api/`** (`schema-client.ts` `fetchSchema`, `illustration-client.ts`
  `postIllustration`): call ONLY same-origin `/api/*` (never lifeproj, AR6); throw `ApiError`
  (`api-error.ts`) carrying `kind`/`status`/`details` from the envelope; network failure →
  `kind: 'connectivity'`.
- **Test note:** mocking an adapter rejection inside a `+server` test trips vitest's
  unhandled-rejection tracker; that pass-through is covered at the unit level instead
  (`error-envelope.test.ts`, `illustration-client.test.ts`).

### Schema discovery + reconcile (Story 3.3)
- **`$lib/stores/schema.svelte.ts` (`schemaStore`)** — loaded once at app start from
  `+layout.svelte` `onMount` (`schemaStore.load()`; idempotent — won't refetch when ready).
  Caches reconciled `riskClasses` + `defaults` for the session.
- **Tolerant extraction:** the `/schema` JSON shape isn't fixed, so `extractRiskClasses(raw)`
  recursively finds the health/risk-class enum (a string array containing a known class or a
  `/tobacco/i` value) wherever it sits; `extractDefaults` pulls a top-level `defaults` object.
- **Reconcile (FR8/FR22):** `CensusEditor` renders risk-class options from
  `schemaStore.riskClasses` (cast to `RiskClass[]`), replacing the seeded `RISK_CLASSES` import.
  Valibot still validates against the seeded `RiskClassSchema` (== engine set in practice);
  full dynamic-schema validation is Story 3.7.
- **Fallback (AR10/M-1):** if `/schema` is unreachable, the store keeps the six seeded classes,
  sets `status='fallback'` + a `notice`, and the layout shows a non-blocking banner. App stays
  usable.

### Funding — tax-adjust + allocation (Story 3.4)
- **`engine/tax-adjustment.ts` `taxAdjustedDeathBenefit(totalCost, taxRate)`** → `Big` =
  `cost × (1 − taxRate)` (FR17); throws if rate ∉ [0,1]. No rounding.
- **`engine/allocation.ts` `allocateEqually(totalDB, insuredIds)`** → `FaceAllocation[]`
  (`{insuredId, faceAmount: Big}`), equal split; `[]` for no participants; full Big precision
  (rounded at the output boundary).
- **Funding seam — `funding/`:** `funding-strategy.ts` (`FundingStrategy` interface:
  `fund({totalBenefitCost, corporateTaxRate, coliParticipantIds}) → {totalDeathBenefit,
  allocations}`); `cost-recovery.ts` (`costRecoveryStrategy`, Option 1, composes the two engine
  fns); `index.ts` registry (`getFundingStrategy`/`listFundingStrategies`/
  `DEFAULT_FUNDING_STRATEGY_ID='cost-recovery'`). Options 2–4 = new file + one `register(...)`
  (NFR14). **Consumed by the run orchestrator (Story 3.6)** — tested seam, not yet UI-wired.

### COLI solve design (Story 3.5)
- **`COST_RECOVERY_SOLVE`** (in `funding/cost-recovery.ts`) = `{ value: '1000.00', when: 100,
  basis: 'age' }` — operator-confirmed target: solve the level premium so each policy's net
  surrender value reaches $1,000 at age 100 (AR17/I-2).
- **`buildCostRecoveryDesignRequest({issueAge, gender, riskClass, faceAmount, productType?})`**
  → `DesignRequest` with the solve block and NO fixed premium (the engine solves it). Validates
  against `DesignRequestSchema`. Issue age is computed from DOB by the caller (orchestrator, 3.6).
- **Adapter solve support** already maps the `solve` block (camelCase→snake_case) and returns
  the resolved premium as `result.solvedAnnualPremium` (from `summary.initial_annual_premium`).
  Covered by `adapter.test.ts` against a mocked solved response (AC3).

### Run orchestration (Story 3.6)
- **`orchestrator/run.ts` `runModel({quote, asOf, illustrate, onStatus, onProgress, signal})`**
  — pure, store-free, `illustrate` injected (testable with a mock). Emits `computing` (engine
  liability + funding in-browser), then `designing` while issuing N **sequential** illustration
  calls (one per COLI participant, `await` in a loop) with `onProgress(completed, total)`.
  Returns `{liability, totalDeathBenefit, designed}`; does NOT emit `done` (caller does, after
  assembling).
- **`engine/results-mapping.ts` `assembleResults({liability, totalDeathBenefit, designed})`** →
  full domain `Results`: SERP liability merged with COLI asset design (face, solved premium,
  year-1 AV/CSV/DB, GPT/MEC flags) + aggregate total DB / total first-year premium; COLI-only
  participants get a zero-liability entry.
- **`stores/run-state.svelte.ts` (`runState`)** — `status`/`progress`/`error`/`designed`;
  `start()` wires `runModel` → `postIllustration` → `assembleResults` → `quoteStore.setResults`
  → `done`; on error → `failed` (full fail-fast/AbortController is Story 3.8). Never mutates the
  quote.
- **Components:** `RunButton` (disabled while running / no quote), `ProgressIndicator`
  (computing… / designing N/total), `AssetResults` (per-policy premium/AV/CSV/DB + GPT/MEC +
  guideline premiums — FR20/FR21). Wired into `/`.

### Pre-run validation (Story 3.7)
- **`orchestrator/validate-run.ts` `validateRun({quote, asOf, riskClasses})`** → `RunValidationIssue[]`
  (pure, store-free). Per insured: risk class ∈ the **discovered** engine set (passed in from
  `schemaStore.riskClasses`, not just the seeded enum), issue age ∈ [0,120], gender M/F, salary
  is money. Plus readiness: ≥1 COLI participant; settings `retirementAge ≤ assumedDeathBenefitAge`.
  Empty list ⇒ ready. Each issue carries `{insuredId?, label, field, message}` (FR24).
- **`runState.start()` gates on it:** validates first; if any issue, sets `validationIssues`,
  stays `idle`, and does NOT call `runModel`. `RunButton` shows the field-level issues; cleared
  on the next start/reset.

### Whole-run fail-fast (Story 3.8)
- **Per-call timeout (NFR10):** `runModel` wraps each illustration call in a per-call
  `AbortController` combined (`AbortSignal.any`) with the run-level signal; a timeout
  (`timeoutMs`, default `DEFAULT_RUN_CALL_TIMEOUT_MS`=30s) aborts the call → the client throws a
  `connectivity` ApiError → the thrown error stops the loop, so remaining calls are aborted
  (whole-run fail-fast). No silent hang.
- **`domain/errors.ts`:** `RunFailure {kind, message, details?}` + `toRunFailure(err)` (maps an
  ApiError's kind/message/details; unknown → `internal`) + `runFailureHeadline(kind)`.
- **`runState`:** owns a run `AbortController` (+ `cancel()`); on any error it aborts, clears
  `designed`, sets `status='failed'` and `error = toRunFailure(...)`. **No partial output** —
  `setResults` runs only on full success; a failed run never mutates the quote (inputs intact,
  re-run from scratch, no retry/resume). `RunButton` shows `runFailureHeadline(kind): message`.

### Report registry + renderer (Story 4.1)
- **`report/registry.ts`** — `ReportPage { id, title, component: Component }` + ordered
  `reportPages` array (cover → census-summary → coli-summary). Adding a page = append one entry
  (additive, NFR14/FR31). `Component` type from `'svelte'`.
- **`report/ReportView.svelte`** renders the registry in order via
  `{#each reportPages}{@const PageComponent = page.component}<PageComponent />`. (Svelte 5 runes:
  no `<svelte:component>` — capture the component into a capitalized const.)
- **`/report` route** renders `ReportView` only when `runState.status === 'done'`, else a "run
  the model" prompt (supports FR28–30). Layout has Setup ↔ Report nav (hidden in `@media print`).
- **Pages** (`report/pages/CoverPage`, `CensusSummaryPage`, `ColiSummaryPage`); registration
  done in 4.1. **CoverPage (Story 4.2)** renders the SERP-financed-with-COLI title personalized
  with `quoteStore.current.company.name` (FR28). CensusSummary/ColiSummary still stubs (4.3/4.4).
- **ESLint:** `svelte/no-navigation-without-resolve` is off — static internal `<a href>` links
  are intentional.

## Feature Development Quality Standards

**CRITICAL**: All new features MUST meet the following mandatory requirements before being considered complete.

### Testing Requirements

- **Minimum Coverage**: 85% code coverage ratio required for all new code
- **Test Pass Rate**: 100% - all tests must pass, no exceptions
- **Test Types Required**:
  - Unit tests for all business logic and services
  - Integration tests for API endpoints or main functionality
  - End-to-end tests for critical user workflows
- **Coverage Validation**: Run coverage reports before marking features complete:
  ```bash
  # Examples by language/framework
  npm run test:coverage
  pytest --cov=src tests/ --cov-report=term-missing
  cargo tarpaulin --out Html
  ```
- **Test Quality**: Tests must validate behavior, not just achieve coverage metrics
- **Test Documentation**: Complex test scenarios must include comments explaining the test strategy

### Git Workflow Requirements

Before moving to the next feature, ALL changes must be:

1. **Committed with Clear Messages**:
   ```bash
   git add .
   git commit -m "feat(module): descriptive message following conventional commits"
   ```
   - Use conventional commit format: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, etc.
   - Include scope when applicable: `feat(api):`, `fix(ui):`, `test(auth):`
   - Write descriptive messages that explain WHAT changed and WHY

2. **Pushed to Remote Repository**:
   ```bash
   git push origin <branch-name>
   ```
   - Never leave completed features uncommitted
   - Push regularly to maintain backup and enable collaboration
   - Ensure CI/CD pipelines pass before considering feature complete

3. **Branch Hygiene**:
   - Work on feature branches, never directly on `main`
   - Branch naming convention: `feature/<feature-name>`, `fix/<issue-name>`, `docs/<doc-update>`
   - Create pull requests for all significant changes

4. **Ralph Integration**:
   - Update .ralph/@fix_plan.md with new tasks before starting work
   - Mark items complete in .ralph/@fix_plan.md upon completion
   - Update .ralph/PROMPT.md if development patterns change
   - Test features work within Ralph's autonomous loop

### Documentation Requirements

**ALL implementation documentation MUST remain synchronized with the codebase**:

1. **Code Documentation**:
   - Language-appropriate documentation (JSDoc, docstrings, etc.)
   - Update inline comments when implementation changes
   - Remove outdated comments immediately

2. **Implementation Documentation**:
   - Update relevant sections in this @AGENT.md file
   - Keep build and test commands current
   - Update configuration examples when defaults change
   - Document breaking changes prominently

3. **README Updates**:
   - Keep feature lists current
   - Update setup instructions when dependencies change
   - Maintain accurate command examples
   - Update version compatibility information

4. **@AGENT.md Maintenance**:
   - Add new build patterns to relevant sections
   - Update "Key Learnings" with new insights
   - Keep command examples accurate and tested
   - Document new testing patterns or quality gates

### Feature Completion Checklist

Before marking ANY feature as complete, verify:

- [ ] All tests pass with appropriate framework command
- [ ] Code coverage meets 85% minimum threshold
- [ ] Coverage report reviewed for meaningful test quality
- [ ] Code formatted according to project standards
- [ ] Type checking passes (if applicable)
- [ ] All changes committed with conventional commit messages
- [ ] All commits pushed to remote repository
- [ ] .ralph/@fix_plan.md task marked as complete
- [ ] Implementation documentation updated
- [ ] Inline code comments updated or added
- [ ] .ralph/@AGENT.md updated (if new patterns introduced)
- [ ] Breaking changes documented
- [ ] Features tested within Ralph loop (if applicable)
- [ ] CI/CD pipeline passes

### Rationale

These standards ensure:
- **Quality**: High test coverage and pass rates prevent regressions
- **Traceability**: Git commits and .ralph/@fix_plan.md provide clear history of changes
- **Maintainability**: Current documentation reduces onboarding time and prevents knowledge loss
- **Collaboration**: Pushed changes enable team visibility and code review
- **Reliability**: Consistent quality gates maintain production stability
- **Automation**: Ralph integration ensures continuous development practices

**Enforcement**: AI agents should automatically apply these standards to all feature development tasks without requiring explicit instruction for each task.
