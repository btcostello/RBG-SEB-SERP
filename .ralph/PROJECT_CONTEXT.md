# Schiff SERP — Project Context

## Project Goals

**Schiff SERP** is a single-operator, browser-based web application that generates client-ready proposals for **nonqualified Supplemental Executive Retirement Plans (SERPs) financed with Company-Owned Life Insurance (COLI)**. It replaces a complex, error-prone Excel model with a clean pipeline — **inputs → calculation engine → report** — that lets one expert produce a complete proposal in an afternoon instead of a week.

The product serves a single internal user: the proposal author at Schiff Executive Benefits. For each prospective client company, the system captures company and plan parameters plus an executive census, projects the year-by-year SERP benefit liability, derives the COLI death benefit required to fund it on a tax-adjusted basis, and **drives an external life-insurance illustration API algorithmically to design and retrieve the matching COLI asset**. The output is a multi-section client proposal addressed to a financially literate but non-actuarial audience — typically the **CFO, Head of HR, and CEO** — that (1) educates them on how SERP plans work, (2) proposes a specific plan structure, and (3) quantifies exactly what it costs to fund that plan with COLI.

The MVP delivers the **Cost Recovery funding approach (Option 1)** end-to-end with three report pages (Cover, Census Summary, COLI Summary), persisted locally. The architecture is deliberately seamed — pluggable funding strategy, an API integration layer, parameterized tax/discount inputs, and a data-driven report registry — so the three remaining funding options and the full ~52-page report can be added incrementally without rework.

### What Makes This Special

The differentiator is **automation of the asset-design process**. Today's slowest, most error-prone step is the manual, iterative work of pulling COLI illustration data into Excel and tuning the policy design by hand. Schiff SERP replaces that with an **engine that interacts with the illustration API and takes an algorithmic approach to finding the optimal COLI design** — sizing premiums, face amounts, and (for later options) distributions to best match the SERP liability, by programmatically calling and converging on the external illustration engine rather than re-keying values.

Because the illustration engine is external, the asset-side numbers are taken as authoritative outputs rather than independently audited. **Auditability lives on the liability side**: the SERP benefit projection and tax-adjusted funding target are fully traceable to inputs and documented calculations, with no hidden hardcoded cells — the opposite of the legacy spreadsheet.

**Core insight:** The math on the liability side isn't excessively complicated — it was simply *tangled together* in Excel. The real leverage is an engine that automates the asset-side design loop against the API. Together, untangling the liability math and automating the asset design is what unlocks speed, repeatability, and a clean path to the more sophisticated funding options.

## Success Metrics

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

## Scope Boundaries

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
