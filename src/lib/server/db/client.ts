/**
 * Postgres connection + schema, server-only.
 *
 * The single place `DATABASE_URL` enters the system. Like the lifeproj credential boundary, it is
 * read from server-only dynamic env (so `build`/CI does not require it) and never reaches the
 * browser bundle — this module lives under `$lib/server`, which SvelteKit guarantees is server-only.
 *
 * The schema is a single `quotes` table; each quote is stored whole as `jsonb`, with the company
 * name denormalised so the saved-quotes list needs no JSON parsing. `ensureSchema()` runs an
 * idempotent `CREATE TABLE IF NOT EXISTS` once per process — no migration framework, matching the
 * lean rest of the app (there is only one table and it is additive).
 */
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

let sql: postgres.Sql | null = null;
let schemaReady: Promise<void> | null = null;

/** The postgres client singleton. Throws a clear error if the database is not configured. */
export function getSql(): postgres.Sql {
	if (sql) return sql;
	const url = env.DATABASE_URL;
	if (!url) {
		throw new Error(
			'DATABASE_URL is not set — configure a Postgres database (see .env.example / README).'
		);
	}
	// SSL is taken from the connection string (e.g. `?sslmode=require`); Railway's internal
	// networking needs none. `onnotice` is silenced so routine NOTICEs do not spam the logs.
	sql = postgres(url, { onnotice: () => {} });
	return sql;
}

/** Create the `quotes` table if it does not exist. Idempotent; runs at most once per process. */
export function ensureSchema(): Promise<void> {
	if (!schemaReady) {
		const db = getSql();
		schemaReady = db`
			CREATE TABLE IF NOT EXISTS quotes (
				id           text PRIMARY KEY,
				company_name text NOT NULL,
				data         jsonb NOT NULL,
				created_at   timestamptz NOT NULL DEFAULT now(),
				updated_at   timestamptz NOT NULL DEFAULT now()
			)
		`.then(() => undefined);
	}
	return schemaReady;
}
