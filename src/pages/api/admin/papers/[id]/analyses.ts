import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireOwnerTaskAccess } from '../../../../../lib/api/auth';
import {
	parseCreatePaperAnalysisPayload,
	parseLargeJsonObject,
	parsePaperId,
} from '../../../../../lib/api/paper-payloads';
import {
	databaseUnavailable,
	invalidRequest,
	jsonResponse,
	notFound,
	queryFailed,
} from '../../../../../lib/database/http';
import { createPaperAnalysis } from '../../../../../lib/database/papers';

export const prerender = false;

const requireOwner = (request: Request) =>
	requireOwnerTaskAccess(request, {
		sessionSecret: env.SESSION_SECRET,
		taskApiToken: env.TASK_API_TOKEN,
	});

export const POST: APIRoute = async ({ params, request }) => {
	const authError = await requireOwner(request);
	if (authError) return authError;

	const db = env.DB as D1Database | undefined;
	if (!db) return databaseUnavailable();

	const paperId = parsePaperId(params.id);
	if (!paperId.ok) return invalidRequest(paperId.message);

	const payload = await parseLargeJsonObject(request);
	if (!payload.ok) return invalidRequest(payload.message);

	const input = parseCreatePaperAnalysisPayload(payload.value);
	if (!input.ok) return invalidRequest(input.message);

	try {
		const paper = await createPaperAnalysis(db, paperId.value, input.value);
		if (!paper) return notFound();

		return jsonResponse({ ok: true, paper }, 201);
	} catch (error) {
		console.error('Failed to create D1 paper analysis.', error);
		return queryFailed();
	}
};
