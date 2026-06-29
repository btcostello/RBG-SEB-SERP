/**
 * POST /api/illustration — proxy a single lifeproj projection (keyed) (AR7, NFR9).
 *
 * Validates the design request against the domain schema, calls the server adapter (which
 * injects the API key), and returns one IllustrationResult or a mapped error envelope
 * `{ error: { kind, message, details? } }` with pass-through status codes. The browser calls
 * this same-origin route (via `$lib/api/illustration-client`), never lifeproj directly.
 */
import { json } from '@sveltejs/kit';
import * as v from 'valibot';
import type { RequestHandler } from './$types';
import { DesignRequestSchema } from '$lib/domain';
import { getLifeprojAdapter } from '$lib/server/lifeproj/credentials';
import { toErrorEnvelope } from '$lib/server/lifeproj/error-envelope';

export const POST: RequestHandler = async ({ request }) => {
	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return json(
			{ error: { kind: 'validation', message: 'Request body must be valid JSON' } },
			{ status: 400 }
		);
	}

	const parsed = v.safeParse(DesignRequestSchema, payload);
	if (!parsed.success) {
		const details = parsed.issues.map((issue) => ({
			field: issue.path?.map((segment) => String(segment.key)).join('.') ?? '',
			message: issue.message
		}));
		return json(
			{ error: { kind: 'validation', message: 'Invalid design request', details } },
			{ status: 400 }
		);
	}

	try {
		const result = await getLifeprojAdapter().project(parsed.output, request.signal);
		return json(result);
	} catch (error) {
		const { status, body } = toErrorEnvelope(error);
		return json(body, { status });
	}
};
