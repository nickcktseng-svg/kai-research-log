import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createAuthSessionCookie } from '../../../lib/auth/session';
import { authUnconfigured, jsonResponse } from '../../../lib/database/http';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	if (!env.SESSION_SECRET) {
		return authUnconfigured();
	}

	const cookie = await createAuthSessionCookie({
		maxAgeSeconds: 60 * 60 * 24,
		request,
		role: 'guest',
		secret: env.SESSION_SECRET,
		username: '訪客',
	});

	return jsonResponse(
		{ ok: true, role: 'guest', username: '訪客' },
		200,
		{ 'set-cookie': cookie },
	);
};
