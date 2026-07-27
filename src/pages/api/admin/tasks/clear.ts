import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireOwnerTaskAccess } from '../../../../lib/api/auth';
import {
	databaseUnavailable,
	jsonResponse,
	queryFailed,
} from '../../../../lib/database/http';
import { deleteAllDatabaseTasks } from '../../../../lib/database/tasks';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	const authError = await requireOwnerTaskAccess(request, {
		sessionSecret: env.SESSION_SECRET,
		taskApiToken: env.TASK_API_TOKEN,
	});
	if (authError) return authError;

	const db = env.DB as D1Database | undefined;
	if (!db) return databaseUnavailable();

	try {
		await deleteAllDatabaseTasks(db);
		return jsonResponse({ ok: true });
	} catch (error) {
		console.error('Failed to clear D1 tasks.', error);
		return queryFailed();
	}
};
