import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
	databaseUnavailable,
	jsonResponse,
	queryFailed,
} from '../../../lib/database/http';
import { listDatabaseWeeklyReports } from '../../../lib/database/weekly-reports';

export const prerender = false;

export const GET: APIRoute = async () => {
	const db = env.DB as D1Database | undefined;

	if (!db) {
		return databaseUnavailable();
	}

	try {
		const reports = await listDatabaseWeeklyReports(db);
		return jsonResponse({ ok: true, reports });
	} catch (error) {
		console.error('Failed to query D1 weekly reports API.', error);
		return queryFailed();
	}
};
