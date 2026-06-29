/**
 * lifeproj credential boundary (FR4, NFR13, AR11).
 *
 * The single place the API key and base URL enter the system. Read from server-only env and
 * passed to the adapter; the key never reaches the browser bundle (this module lives under
 * `$lib/server`, which SvelteKit guarantees is server-only).
 *
 * Uses `$env/dynamic/private` (runtime) rather than `$env/static/private` so that `build`/CI
 * does not require the secrets to be present at build time; both are server-only and satisfy
 * the credential boundary. The values are still injected into the adapter exactly as AR11
 * intends.
 */
import { env } from '$env/dynamic/private';
import { createLifeprojAdapter, type LifeprojAdapter } from './adapter';

let adapter: LifeprojAdapter | null = null;

/**
 * Build (once) and return the configured lifeproj adapter. Throws if the credentials are not
 * configured, so a misconfiguration surfaces clearly server-side rather than silently failing.
 */
export function getLifeprojAdapter(): LifeprojAdapter {
	if (adapter) return adapter;

	const apiKey = env.LIFEPROJ_API_KEY;
	const baseUrl = env.LIFEPROJ_BASE_URL;
	if (!apiKey || !baseUrl) {
		throw new Error(
			'lifeproj is not configured: set LIFEPROJ_API_KEY and LIFEPROJ_BASE_URL in the server environment (.env)'
		);
	}

	adapter = createLifeprojAdapter({ apiKey, baseUrl });
	return adapter;
}
