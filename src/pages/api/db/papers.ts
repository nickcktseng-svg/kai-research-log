import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
	databaseUnavailable,
	jsonResponse,
	queryFailed,
} from '../../../lib/database/http';
import { listPapers } from '../../../lib/database/papers';

export const prerender = false;

export const GET: APIRoute = async () => {
	const db = env.DB as D1Database | undefined;

	if (!db) {
		return databaseUnavailable();
	}

	try {
		const papers = await listPapers(db, { includePrivate: false, limit: 100 });
		return jsonResponse({ ok: true, papers });
	} catch (error) {
		console.error('Failed to query public D1 papers API.', error);
		return queryFailed();
	}
};
