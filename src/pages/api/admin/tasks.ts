import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireOwnerTaskAccess } from '../../../lib/api/auth';
import {
	parseCreateTaskPayload,
	parseJsonObject,
} from '../../../lib/api/task-payloads';
import {
	databaseUnavailable,
	invalidRequest,
	jsonResponse,
	queryFailed,
} from '../../../lib/database/http';
import { createDatabaseTask } from '../../../lib/database/tasks';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	const authError = await requireOwnerTaskAccess(request, {
		sessionSecret: env.SESSION_SECRET,
		taskApiToken: env.TASK_API_TOKEN,
	});
	if (authError) return authError;

	const db = env.DB as D1Database | undefined;
	if (!db) return databaseUnavailable();

	const payload = await parseJsonObject(request);
	if (!payload.ok) return invalidRequest(payload.message);

	const input = parseCreateTaskPayload(payload.value);
	if (!input.ok) return invalidRequest(input.message);

	try {
		const task = await createDatabaseTask(db, input.value);
		return jsonResponse({ ok: true, task }, 201);
	} catch (error) {
		console.error('Failed to create D1 task.', error);
		return queryFailed();
	}
};
