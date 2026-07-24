import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireOwnerTaskAccess } from '../../../../../lib/api/auth';
import { parseTaskId } from '../../../../../lib/api/task-payloads';
import {
	databaseUnavailable,
	invalidRequest,
	jsonResponse,
	notFound,
	queryFailed,
} from '../../../../../lib/database/http';
import { completeDatabaseTask } from '../../../../../lib/database/tasks';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
	const authError = await requireOwnerTaskAccess(request, {
		sessionSecret: env.SESSION_SECRET,
		taskApiToken: env.TASK_API_TOKEN,
	});
	if (authError) return authError;

	const taskId = parseTaskId(params.id);
	if (!taskId.ok) return invalidRequest(taskId.message);

	const db = env.DB as D1Database | undefined;
	if (!db) return databaseUnavailable();

	try {
		const task = await completeDatabaseTask(db, taskId.value);
		if (!task) return notFound();

		return jsonResponse({ ok: true, task });
	} catch (error) {
		console.error('Failed to complete D1 task.', error);
		return queryFailed();
	}
};
