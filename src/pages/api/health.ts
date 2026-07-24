import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

type HealthResponse = {
	ok: boolean;
	database: 'connected' | 'unavailable';
};

const json = (body: HealthResponse, status: number) =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store',
		},
	});

export const GET: APIRoute = async () => {
	const db = env.DB as D1Database | undefined;

	if (!db) {
		return json({ ok: false, database: 'unavailable' }, 503);
	}

	try {
		await db.prepare('SELECT 1').first();
		return json({ ok: true, database: 'connected' }, 200);
	} catch {
		return json({ ok: false, database: 'unavailable' }, 503);
	}
};
