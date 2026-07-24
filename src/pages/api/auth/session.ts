import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { readAuthSession } from '../../../lib/auth/session';
import { jsonResponse } from '../../../lib/database/http';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
	const session = await readAuthSession(request, env.SESSION_SECRET);

	return jsonResponse({
		ok: true,
		configured: Boolean(env.SESSION_SECRET && env.OWNER_PASSWORD),
		role: session?.role ?? 'anonymous',
		username: session?.username ?? null,
	});
};
