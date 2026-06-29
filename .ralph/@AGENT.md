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
