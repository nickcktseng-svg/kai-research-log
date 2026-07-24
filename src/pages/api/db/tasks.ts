import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
	databaseUnavailable,
	jsonResponse,
	queryFailed,
} from '../../../lib/database/http';
import { listDatabaseTasks } from '../../../lib/database/tasks';

export const prerender = false;

export const GET: APIRoute = async () => {
	const db = env.DB as D1Database | undefined;

	if (!db) {
		return databaseUnavailable();
	}

	try {
		const tasks = await listDatabaseTasks(db);
		return jsonResponse({ ok: true, tasks });
	} catch (error) {
		console.error('Failed to query D1 tasks API.', error);
		return queryFailed();
	}
};
