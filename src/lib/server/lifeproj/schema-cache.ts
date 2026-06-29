/**
 * Server-side cache of the lifeproj `/schema` response (AR7, AR10).
 *
 * `/schema` is stable, so it is fetched once via the adapter and reused for the life of the
 * server process. The raw JSON is returned as-is; reconciling it into enums/defaults is the
 * client's job (Story 3.3).
 */
import { getLifeprojAdapter } from './credentials';

let cachedSchema: unknown | null = null;

/** Fetch the engine schema once and return the cached copy thereafter. */
export async function getCachedSchema(): Promise<unknown> {
	if (cachedSchema !== null) return cachedSchema;
	cachedSchema = await getLifeprojAdapter().schema();
	return cachedSchema;
}

/** Clear the cache (e.g. for tests or a forced refresh). */
export function clearSchemaCache(): void {
	cachedSchema = null;
}
