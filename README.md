# Schiff SERP

A SvelteKit application for building SERP (Supplemental Executive Retirement Plan) proposals
financed with COLI (Corporate-Owned Life Insurance). It captures a quote (company, model
settings, executive census), computes the SERP liability with a pure, deterministic calc engine,
designs each COLI policy via the external `lifeproj` illustration engine, and generates a
client-ready proposal report.

Built with Svelte 5 (runes) + SvelteKit 2 on Node, TypeScript, Vitest, ESLint, and Prettier.

## Prerequisites

- Node.js 22+
- npm

## Setup

```bash
npm install
cp .env.example .env   # then fill in LIFEPROJ_API_KEY and LIFEPROJ_BASE_URL
```

## Development

```bash
npm run dev            # serves at http://localhost:5173
```

## Quality gates

```bash
npm run check          # svelte-check (type checking)
npm test               # vitest (unit/engine suites)
npm run lint           # prettier --check + eslint (enforces the $lib/server boundary)
npm run format         # prettier --write
```

## Production build

```bash
npm run build          # @sveltejs/adapter-node → build/
npm run start          # node build  (runs the production server)
```

## Architecture

The codebase follows the module structure documented in
`.ralph/specs/planning-artifacts/architecture.md`:

- `src/lib/domain/` — shared types + Valibot schemas (client-safe)
- `src/lib/money/` — big.js money module (single rounding policy)
- `src/lib/dates/` — age-nearest-birthday date utilities
- `src/lib/engine/` — pure, side-effect-free SERP liability calc engine
- `src/lib/funding/` — pluggable funding strategy (Cost Recovery / Option 1)
- `src/lib/orchestrator/` — client-side run orchestration (fail-fast)
- `src/lib/api/` — browser → internal BFF clients
- `src/lib/persistence/` — quote repository (localStorage-backed)
- `src/lib/report/` — data-driven report page registry
- `src/lib/stores/` — Svelte 5 runes state
- `src/lib/components/` — shared UI
- `src/lib/server/` — **server-only** (lifeproj adapter, API-key holder). Never bundled to the browser.

The `$lib/server` boundary is enforced by both SvelteKit (build-time) and ESLint (lint-time):
server-only code, including the `lifeproj` API key, can never reach the client bundle.
