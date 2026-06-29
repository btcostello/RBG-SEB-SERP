/**
 * GET /api/schema — proxy lifeproj `/schema` and return it, cached per session (AR7, AR10).
 * The browser calls this same-origin route (via `$lib/api/schema-client`), never lifeproj.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCachedSchema } from '$lib/server/lifeproj/schema-cache';
import { toErrorEnvelope } from '$lib/server/lifeproj/error-envelope';

export const GET: RequestHandler = async () => {
	try {
		const schema = await getCachedSchema();
		return json(schema);
	} catch (error) {
		const { status, body } = toErrorEnvelope(error);
		return json(body, { status });
	}
};
