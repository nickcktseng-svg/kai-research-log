import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireOwnerTaskAccess } from '../../../../lib/api/auth';
import {
	parseBlogEntryId,
	parseLargeJsonObject,
	parseUpdateBlogEntryPayload,
} from '../../../../lib/api/blog-entry-payloads';
import {
	databaseUnavailable,
	invalidRequest,
	jsonResponse,
	notFound,
	queryFailed,
} from '../../../../lib/database/http';
import { updateBlogEntry } from '../../../../lib/database/blog-entries';

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
	const authError = await requireOwnerTaskAccess(request, {
		sessionSecret: env.SESSION_SECRET,
		taskApiToken: env.TASK_API_TOKEN,
	});
	if (authError) return authError;

	const parsedId = parseBlogEntryId(params.id);
	if (!parsedId.ok) return invalidRequest(parsedId.message);

	const db = env.DB as D1Database | undefined;
	if (!db) return databaseUnavailable();

	const payload = await parseLargeJsonObject(request);
	if (!payload.ok) return invalidRequest(payload.message);

	const input = parseUpdateBlogEntryPayload(payload.value);
	if (!input.ok) return invalidRequest(input.message);

	try {
		const entry = await updateBlogEntry(db, parsedId.value, input.value);
		if (!entry) return notFound();

		return jsonResponse({ ok: true, entry });
	} catch (error) {
		console.error('Failed to update D1 blog entry.', error);
		return queryFailed();
	}
};
