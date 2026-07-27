import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireOwnerTaskAccess } from '../../../../lib/api/auth';
import {
	parseJournalId,
	parseLargeJsonObject,
	parseUpdateJournalEntryPayload,
} from '../../../../lib/api/journal-payloads';
import {
	databaseUnavailable,
	invalidRequest,
	jsonResponse,
	notFound,
	queryFailed,
} from '../../../../lib/database/http';
import { updateJournalEntry } from '../../../../lib/database/journal';

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
	const authError = await requireOwnerTaskAccess(request, {
		sessionSecret: env.SESSION_SECRET,
		taskApiToken: env.TASK_API_TOKEN,
	});
	if (authError) return authError;

	const parsedId = parseJournalId(params.id);
	if (!parsedId.ok) return invalidRequest(parsedId.message);

	const db = env.DB as D1Database | undefined;
	if (!db) return databaseUnavailable();

	const payload = await parseLargeJsonObject(request);
	if (!payload.ok) return invalidRequest(payload.message);

	const input = parseUpdateJournalEntryPayload(payload.value);
	if (!input.ok) return invalidRequest(input.message);

	try {
		const entry = await updateJournalEntry(db, parsedId.value, input.value);
		if (!entry) return notFound();

		return jsonResponse({ ok: true, entry });
	} catch (error) {
		console.error('Failed to update D1 journal entry.', error);
		return queryFailed();
	}
};
