import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireTaskApiToken } from '../../../../lib/api/auth';
import {
	parseJsonObject,
	parseTaskId,
	parseUpdateTaskPayload,
} from '../../../../lib/api/task-payloads';
import {
	databaseUnavailable,
	invalidRequest,
	jsonResponse,
	notFound,
	queryFailed,
} from '../../../../lib/database/http';
import { updateDatabaseTask } from '../../../../lib/database/tasks';

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
	const authError = await requireTaskApiToken(request, env.TASK_API_TOKEN);
	if (authError) return authError;

	const taskId = parseTaskId(params.id);
	if (!taskId.ok) return invalidRequest(taskId.message);

	const db = env.DB as D1Database | undefined;
	if (!db) return databaseUnavailable();

	const payload = await parseJsonObject(request);
	if (!payload.ok) return invalidRequest(payload.message);

	const input = parseUpdateTaskPayload(payload.value);
	if (!input.ok) return invalidRequest(input.message);

	try {
		const task = await updateDatabaseTask(db, taskId.value, input.value);
		if (!task) return notFound();

		return jsonResponse({ ok: true, task });
	} catch (error) {
		console.error('Failed to update D1 task.', error);
		return queryFailed();
	}
};
