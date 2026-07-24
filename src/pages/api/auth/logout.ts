import type { APIRoute } from 'astro';
import { createClearAuthSessionCookie } from '../../../lib/auth/session';
import { jsonResponse } from '../../../lib/database/http';

export const prerender = false;

export const POST: APIRoute = async ({ request }) =>
	jsonResponse(
		{ ok: true },
		200,
		{ 'set-cookie': createClearAuthSessionCookie(request) },
	);
