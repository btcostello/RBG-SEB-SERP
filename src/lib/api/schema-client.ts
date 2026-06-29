/**
 * Browser → BFF client for the engine schema (AR6).
 * Calls the same-origin `/api/schema` route only — never lifeproj directly. Returns the raw
 * schema JSON; reconciliation into enums/defaults is Story 3.3.
 */
import { ApiError, errorFromResponse } from './api-error';

export async function fetchSchema(
	options: { fetch?: typeof fetch; signal?: AbortSignal } = {}
): Promise<unknown> {
	const fetchImpl = options.fetch ?? fetch;

	let response: Response;
	try {
		response = await fetchImpl('/api/schema', { signal: options.signal });
	} catch (error) {
		throw new ApiError(
			'connectivity',
			`Could not reach the server: ${(error as Error).message}`,
			0
		);
	}

	if (!response.ok) {
		throw await errorFromResponse(response);
	}
	return response.json();
}
