/**
 * /api/quotes/[id] — load one saved quote (GET) or delete it (DELETE).
 */
import { error, json } from '@sveltejs/kit';
import { getServerQuoteRepository } from '$lib/server/persistence/postgres-repository';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const quote = await getServerQuoteRepository().get(params.id);
	if (!quote) {
		error(404, 'Quote not found.');
	}
	return json(quote);
};

export const DELETE: RequestHandler = async ({ params }) => {
	await getServerQuoteRepository().delete(params.id);
	return new Response(null, { status: 204 });
};
