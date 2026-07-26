# Schiff SERP

A SvelteKit application for building SERP (Supplemental Executive Retirement Plan) proposals
financed with COLI (Corporate-Owned Life Insurance). It captures a quote (company, model
settings, executive census), computes the SERP liability with a pure, deterministic calc engine,
designs each COLI policy via the external `lifeproj` illustration engine, and generates a
client-ready proposal report.

Built with Svelte 5 (runes) + SvelteKit 2 on Node, TypeScript, Vitest, ESLint, and Prettier.

## Prerequisites

- Node.js 20+ (22 recommended)
- npm
- Docker (for the local Postgres that stores saved quotes)

## Setup

```bash
npm install
cp .env.example .env    # fill in LIFEPROJ_API_KEY / LIFEPROJ_BASE_URL; DATABASE_URL is preset for local docker
docker compose up -d    # start local Postgres (matches the DATABASE_URL in .env.example)
```

The `quotes` table is created automatically on first use — no migration step.

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

## Saved-quotes database

Saved quotes are stored in **Postgres** (one `quotes` table; each quote is a `jsonb` row). The
browser never touches the database: the saved-quotes store calls `/api/quotes` routes, which use a
server-only `PostgresQuoteRepository`. The database connection string is the only new secret:

- `DATABASE_URL` — server-only, read via `$env/dynamic/private`.

This is a single-user store (no auth/multi-tenant); a quote is saved by its own id and reopened
later. The in-progress working quote still mirrors to `sessionStorage` so an accidental refresh
does not lose an unsaved edit.

## Deployment (Railway)

- **One web service** — the adapter-node build. Start command `node build`; Railway injects `PORT`.
- **One Postgres plugin** — attach it and reference its injected `DATABASE_URL` on the web service.
- **Env vars** — `LIFEPROJ_API_KEY`, `LIFEPROJ_BASE_URL`, `DATABASE_URL`.

No persistent volume is required (state lives in Postgres). If `DATABASE_URL` is unset, the
`/api/quotes` routes fail with a clear error rather than silently losing data.

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
- `src/lib/persistence/` — quote repository interface + the browser HTTP implementation (`/api/quotes`)
- `src/lib/report/` — data-driven report page registry
- `src/lib/stores/` — Svelte 5 runes state
- `src/lib/components/` — shared UI
- `src/lib/server/` — **server-only** (lifeproj adapter + API-key holder, Postgres client + quote
  repository). Never bundled to the browser.

The `$lib/server` boundary is enforced by both SvelteKit (build-time) and ESLint (lint-time):
server-only code, including the `lifeproj` API key and the `DATABASE_URL`, can never reach the
client bundle.
