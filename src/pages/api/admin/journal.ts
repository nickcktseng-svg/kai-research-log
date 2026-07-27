import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireOwnerTaskAccess } from '../../../lib/api/auth';
import {
	parseCreateJournalEntryPayload,
	parseLargeJsonObject,
} from '../../../lib/api/journal-payloads';
import {
	databaseUnavailable,
	invalidRequest,
	jsonResponse,
	queryFailed,
} from '../../../lib/database/http';
import {
	createJournalEntry,
	listJournalEntries,
} from '../../../lib/database/journal';

export const prerender = false;

const requireOwner = (request: Request) =>
	requireOwnerTaskAccess(request, {
		sessionSecret: env.SESSION_SECRET,
		taskApiToken: env.TASK_API_TOKEN,
	});

export const GET: APIRoute = async ({ request }) => {
	const authError = await requireOwner(request);
	if (authError) return authError;

	const db = env.DB as D1Database | undefined;
	if (!db) return databaseUnavailable();

	try {
		const entries = await listJournalEntries(db, { includeDrafts: true });
		return jsonResponse({ ok: true, entries });
	} catch (error) {
		console.error('Failed to list D1 journal entries.', error);
		return queryFailed();
	}
};

export const POST: APIRoute = async ({ request }) => {
	const authError = await requireOwner(request);
	if (authError) return authError;

	const db = env.DB as D1Database | undefined;
	if (!db) return databaseUnavailable();

	const payload = await parseLargeJsonObject(request);
	if (!payload.ok) return invalidRequest(payload.message);

	const input = parseCreateJournalEntryPayload(payload.value);
	if (!input.ok) return invalidRequest(input.message);

	try {
		const entry = await createJournalEntry(db, input.value);
		return jsonResponse({ ok: true, entry }, 201);
	} catch (error) {
		console.error('Failed to create D1 journal entry.', error);
		return queryFailed();
	}
};
