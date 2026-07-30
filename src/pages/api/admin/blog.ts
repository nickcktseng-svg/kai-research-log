import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireOwnerTaskAccess } from '../../../lib/api/auth';
import {
	parseCreateBlogEntryPayload,
	parseLargeJsonObject,
} from '../../../lib/api/blog-entry-payloads';
import {
	databaseUnavailable,
	invalidRequest,
	jsonResponse,
	queryFailed,
} from '../../../lib/database/http';
import {
	createBlogEntry,
	listBlogEntries,
} from '../../../lib/database/blog-entries';

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
		const entries = await listBlogEntries(db, { includeDrafts: true });
		return jsonResponse({ ok: true, entries });
	} catch (error) {
		console.error('Failed to list D1 blog entries.', error);
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

	const input = parseCreateBlogEntryPayload(payload.value);
	if (!input.ok) return invalidRequest(input.message);

	try {
		const entry = await createBlogEntry(db, input.value);
		return jsonResponse({ ok: true, entry }, 201);
	} catch (error) {
		console.error('Failed to create D1 blog entry.', error);
		return queryFailed();
	}
};
