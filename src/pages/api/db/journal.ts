import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
	databaseUnavailable,
	jsonResponse,
	queryFailed,
} from '../../../lib/database/http';
import { listJournalEntries } from '../../../lib/database/journal';

export const prerender = false;

export const GET: APIRoute = async () => {
	const db = env.DB as D1Database | undefined;
	if (!db) return databaseUnavailable();

	try {
		const entries = await listJournalEntries(db, { includeDrafts: false });
		return jsonResponse({ ok: true, entries });
	} catch (error) {
		console.error('Failed to query D1 journal entries API.', error);
		return queryFailed();
	}
};
