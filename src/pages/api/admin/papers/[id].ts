import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireOwnerTaskAccess } from '../../../../lib/api/auth';
import {
	parseLargeJsonObject,
	parsePaperId,
	parseUpdatePaperPayload,
} from '../../../../lib/api/paper-payloads';
import {
	databaseUnavailable,
	invalidRequest,
	jsonResponse,
	notFound,
	queryFailed,
} from '../../../../lib/database/http';
import { updatePaper } from '../../../../lib/database/papers';

export const prerender = false;

const requireOwner = (request: Request) =>
	requireOwnerTaskAccess(request, {
		sessionSecret: env.SESSION_SECRET,
		taskApiToken: env.TASK_API_TOKEN,
	});

export const PATCH: APIRoute = async ({ params, request }) => {
	const authError = await requireOwner(request);
	if (authError) return authError;

	const db = env.DB as D1Database | undefined;
	if (!db) return databaseUnavailable();

	const paperId = parsePaperId(params.id);
	if (!paperId.ok) return invalidRequest(paperId.message);

	const payload = await parseLargeJsonObject(request, 80_000);
	if (!payload.ok) return invalidRequest(payload.message);

	const input = parseUpdatePaperPayload(payload.value);
	if (!input.ok) return invalidRequest(input.message);

	try {
		const paper = await updatePaper(db, paperId.value, input.value);
		if (!paper) return notFound();

		return jsonResponse({ ok: true, paper });
	} catch (error) {
		console.error('Failed to update D1 paper.', error);
		return queryFailed();
	}
};
