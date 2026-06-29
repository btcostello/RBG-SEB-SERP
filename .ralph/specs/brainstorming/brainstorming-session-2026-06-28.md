---
stepsCompleted: [1, 2, 3, 4]
workflow_completed: true
session_active: false
inputDocuments: []
session_topic: 'Browser-based SERP (Supplemental Executive Retirement Plan) quoting system financed with COLI — single-user rebuild from Excel'
session_goals: 'Build sequencing & MVP scope — define the smallest genuinely-useful build (Cost Recovery / Option 1) and the order to build it without painting into a corner for the later 3 asset options and ~52-page report'
selected_approach: 'ai-recommended'
techniques_used: ['First Principles Thinking', 'Resource Constraints', 'Decision Tree Mapping']
ideas_generated: []
context_file: '_bmad/bmm/data/project-context-template.md'
---

# Brainstorming Session Results

**Facilitator:** Mary (Business Analyst)
**Date:** 2026-06-28

## Session Overview

**Topic:** A browser-based SERP quoting system financed with COLI. Rebuilding from a complex Excel model, from scratch, as a single-user web tool that automates a currently-manual process. Eventual goal: host online.

**Goals:** Build sequencing & MVP scope. Nail the smallest genuinely-useful build (the Cost Recovery Approach / Option 1) and the right order to build it, structured so the later 3 asset options and the ~52-page report don't force a rewrite.

### Session Setup

Mode: fast / pressure-test. User already has a detailed system outline and known intent. ~5 min per technique. Facilitator pressure-tests the spec rather than generating volume.

## Technique Selection

**Approach:** AI-Recommended Techniques (fast mode)

**Recommended Techniques:**

- **First Principles Thinking:** Strip the Excel-era assumptions; define the irreducible Cost Recovery quote.
- **Resource Constraints:** Force the MVP boundary and the thinnest end-to-end vertical slice.
- **Decision Tree Mapping:** Sequence the build by dependency; flag the corner-painting decisions.

## Phase 1 — First Principles (rulings)

1. **Liability engine is the MVP core.** Build the year-by-year benefit → Total Cost / NPV engine first. Asset values come from a live illustration API; Option 1 is a thin wrapper consuming one number.
2. **Tax adjustment is in the pipeline, not just display.** SERP benefits are tax-deductible; life insurance death benefit is tax-free. Therefore: `Life Insurance Death Benefit (Total DB) = Total Benefit Cost × (1 − Corporate Tax Rate)`. This after-tax number is what flows to the API.
3. **Illustration API is the only hard external dependency** — live but imperfect; docs available; expected to be refined over time. Implies an adapter/anti-corruption layer so API quirks don't leak into the calc engine.
4. **Start with one benefit formula: Factor × Final Average Salary.** Other formula variants, COLA, certain period, min/max become later config.

## Phase 2 — Resource Constraints (MVP boundary + new inputs surfaced)

**Thinnest end-to-end slice ("the artery"):** Company + model settings → census of N → per-person benefit stream → total → tax-adjust → split → API call → render Cover + Census + COLI summary.

New/decided assumptions the engine requires:

5. **Salary growth rate** — add as an input, **default 3%**. (FAS = average of final years of projected salary.)
6. **Discount rate** — model setting, **0% for now** (NPV Cost = Total Cost until turned on). Field stays in the pipeline.
7. **Benefit payout window** — pay each year from **Retirement Age → Assumed Death Age (84)**. No mortality table in v1; certain-period/COLA deferred.
8. **Persistence required Day 1**, lightweight. Two-screen MVP: (1) Setup + Census, (2) Results/Report.

## Phase 3 — Decision Tree Mapping (build sequence + corner-painting flags)

**Recommended build order (dependency-driven):**

1. **Quote data model + lightweight persistence.** Model the whole quote as one serializable JSON "Quote" document (Company, ModelSettings, Census[Insured], per-individual SERP design). Persist behind a thin interface.
2. **Calc engine (pure, no UI, no API).** Salary projection → FAS → benefit stream (ret→84) → Total Cost → NPV (0%) → ×(1−tax) → Total DB → per-person DB (Total DB / COLI count). Unit-testable in isolation.
3. **Illustration API adapter (anti-corruption layer).** Wrap the imperfect live API; map request (per-person DB) → response (premium, account value, cash surrender value, death benefit schedule). Mockable.
4. **Report renderer.** Data-driven page registry; ship 3 placeholder pages (Cover, Census Summary, COLI Summary). Adding the other ~49 pages is additive.
5. **UI: two screens** (Setup+Census, Results/Report).

**Corner-painting decisions flagged (decide now, cheap; later, expensive):**

- **A. Persistence abstraction.** "Host online eventually" → keep persistence behind an interface so localStorage/IndexedDB (now) swaps to a server/DB (later) without touching calc or UI.
- **B. Pluggable asset strategy.** Option 1 now, but Options 2–4 differ in distributions. Define an "asset/funding strategy" interface that returns a funding schedule; never hardcode Option 1 into the engine.
- **C. Per-individual data from day 1.** Even with equal-split DB + one formula, store per-individual formula, plan membership (COLI/SERP/both), and benefit design as data (defaulted) so adding richness later isn't a restructure.
- **D. Parameterize tax & discount.** Both flow as parameters (discount 0% now) — turning them on is data, not code.
- **E. Money precision.** Use decimal/integer-cents, not floats, across the calc engine to prevent rounding drift in 52 pages of tables.
- **F. Report = document model.** Treat the 52 pages as a registry of data-driven templates, not hand-built pages.

## Idea Organization and Prioritization

**Thematic organization of outcomes:**

- **Theme 1 — Liability engine is the product.** The year-by-year benefit projection and Total/NPV cost is the core; the asset (COLI) side consumes a single derived number.
- **Theme 2 — Architecture seams that protect the future.** API adapter, pluggable asset strategy, persistence interface, parameterized tax/discount, document-model reports — all to keep Options 2–4 and the 52-page report additive.
- **Theme 3 — MVP boundary.** Factor × FAS only; pay to age 84; 0% discount; equal-split DB; two screens; lightweight persistence.

**Prioritization (build order):**

1. Quote data model + lightweight persistence
2. Calc engine (pure, testable)
3. Illustration API adapter (anti-corruption layer)
4. Report renderer + 3 placeholder pages
5. Two UI screens (Setup+Census, Results/Report)

## MVP Scope — Decisions Locked

**Inputs**
- Company: Name, Corporate Tax Rate
- Model Settings: Default Death Benefit Age (84), Default Retirement Age, Benefit Waiting Period, **Salary Growth Rate (default 3%)**, **Discount Rate (default 0%)**, FAS averaging period
- Benefit formula: **Factor × Final Average Salary** only
- Census per insured: First/Last Name, Gender, DOB, Date of Hire, Current Salary, Retirement Benefit as % of FAS; plan membership (COLI/SERP/both) stored but defaulted

**Calculation (Cost Recovery / Option 1)**
- Project salary at growth rate → FAS (avg of final years)
- Benefit = % × FAS, paid each year Retirement Age → 84
- Sum → Total Benefit Cost; NPV at 0% (= Total Cost for now)
- `Total DB = Total Benefit Cost × (1 − Corporate Tax Rate)`
- Per-person DB = Total DB / COLI participant count
- Call illustration API per person → premium, account value, cash surrender value, death benefit schedule

**Reports (placeholders)**
- Cover Page, Census Summary, COLI Summary (Total Death Benefit, Total First-Year Premium)

**Explicitly deferred:** Options 2–4, COLA, certain period, min/max, other benefit formulas, mortality tables, multi-user/auth, non-zero discount, full 52-page report.

## Session Summary and Insights

**Key achievements:**
- Confirmed the liability engine — not the COLI side — as the MVP core.
- Resolved the open `(Tax Adjusted??)` question into a concrete pipeline rule.
- Surfaced 4 missing inputs (salary growth, discount rate, payout window, persistence) before any code.
- Produced a dependency-ordered build sequence and 6 corner-painting safeguards.

**Next step:** Feed this into a Product Brief (`/create-brief`) or straight into a PRD (`/create-prd`).

**Status:** workflow_completed: true
