/**
 * /api/quotes — list all saved quotes (GET) and save/overwrite one (POST).
 *
 * Thin HTTP surface over the server-side PostgresQuoteRepository, so the browser never touches the
 * database or its credentials directly (same boundary as the lifeproj API key). The POST body is
 * validated against QuoteSchema before it reaches the database.
 */
import { error, json } from '@sveltejs/kit';
import * as v from 'valibot';
import { QuoteSchema } from '$lib/domain';
import { getServerQuoteRepository } from '$lib/server/persistence/postgres-repository';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return json(await getServerQuoteRepository().list());
};

export const POST: RequestHandler = async ({ request }) => {
	const parsed = v.safeParse(QuoteSchema, await request.json().catch(() => null));
	if (!parsed.success) {
		error(400, 'Request body is not a valid quote.');
	}
	await getServerQuoteRepository().save(parsed.output);
	return new Response(null, { status: 204 });
};
