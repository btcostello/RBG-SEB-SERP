/**
 * Browser → BFF client for illustrations (AR6).
 * Calls the same-origin `/api/illustration` route only — never lifeproj directly.
 */
import * as v from 'valibot';
import { IllustrationResultSchema, type DesignRequest, type IllustrationResult } from '$lib/domain';
import { ApiError, errorFromResponse } from './api-error';

/**
 * POST a design request to the BFF and return the projection result. Throws an ApiError
 * (with `kind`) on a mapped server error or a connectivity failure.
 */
export async function postIllustration(
	request: DesignRequest,
	options: { fetch?: typeof fetch; signal?: AbortSignal } = {}
): Promise<IllustrationResult> {
	const fetchImpl = options.fetch ?? fetch;

	let response: Response;
	try {
		response = await fetchImpl('/api/illustration', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(request),
			signal: options.signal
		});
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
	return v.parse(IllustrationResultSchema, await response.json());
}
