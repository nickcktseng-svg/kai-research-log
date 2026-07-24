import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { timingSafeTokenMatch } from '../../../lib/api/auth';
import {
	parseJsonObject,
} from '../../../lib/api/task-payloads';
import {
	authUnconfigured,
	invalidRequest,
	jsonResponse,
	unauthorized,
} from '../../../lib/database/http';
import { createAuthSessionCookie } from '../../../lib/auth/session';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	if (!env.SESSION_SECRET || !env.OWNER_PASSWORD) {
		return authUnconfigured();
	}

	const payload = await parseJsonObject(request);
	if (!payload.ok) return invalidRequest(payload.message);

	const username =
		typeof payload.value.username === 'string' ? payload.value.username.trim() : '';
	const password =
		typeof payload.value.password === 'string' ? payload.value.password : '';
	const expectedUsername = env.OWNER_USERNAME || 'kai';

	if (!username || !password) {
		return invalidRequest('username and password are required.');
	}

	const usernameMatches = username === expectedUsername;
	const passwordMatches = await timingSafeTokenMatch(password, env.OWNER_PASSWORD);

	if (!usernameMatches || !passwordMatches) {
		return unauthorized();
	}

	const cookie = await createAuthSessionCookie({
		maxAgeSeconds: 60 * 60 * 24 * 7,
		request,
		role: 'owner',
		secret: env.SESSION_SECRET,
		username: expectedUsername,
	});

	return jsonResponse(
		{ ok: true, role: 'owner', username: expectedUsername },
		200,
		{ 'set-cookie': cookie },
	);
};
