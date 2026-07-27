import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireOwnerTaskAccess } from '../../../lib/api/auth';
import {
	parseCreatePaperPayload,
	parseLargeJsonObject,
} from '../../../lib/api/paper-payloads';
import {
	databaseUnavailable,
	invalidRequest,
	jsonResponse,
	queryFailed,
} from '../../../lib/database/http';
import { listPapers, savePaper } from '../../../lib/database/papers';

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
		const papers = await listPapers(db, { includePrivate: true, limit: 200 });
		return jsonResponse({ ok: true, papers });
	} catch (error) {
		console.error('Failed to list D1 papers.', error);
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

	const input = parseCreatePaperPayload(payload.value);
	if (!input.ok) return invalidRequest(input.message);

	try {
		const paper = await savePaper(db, input.value);
		return jsonResponse({ ok: true, paper }, 201);
	} catch (error) {
		console.error('Failed to save D1 paper.', error);
		return queryFailed();
	}
};
