export type ApiErrorCode =
	| 'auth_unconfigured'
	| 'database_unavailable'
	| 'invalid_request'
	| 'not_found'
	| 'query_failed'
	| 'unauthorized';

export const jsonResponse = (
	body: unknown,
	status = 200,
	headers: Record<string, string> = {},
) =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store',
			...headers,
		},
	});

export const authUnconfigured = () =>
	jsonResponse({ ok: false, error: 'auth_unconfigured' satisfies ApiErrorCode }, 503);

export const databaseUnavailable = () =>
	jsonResponse({ ok: false, error: 'database_unavailable' satisfies ApiErrorCode }, 503);

export const invalidRequest = (message: string) =>
	jsonResponse(
		{ ok: false, error: 'invalid_request' satisfies ApiErrorCode, message },
		400,
	);

export const notFound = () =>
	jsonResponse({ ok: false, error: 'not_found' satisfies ApiErrorCode }, 404);

export const queryFailed = () =>
	jsonResponse({ ok: false, error: 'query_failed' satisfies ApiErrorCode }, 500);

export const unauthorized = () =>
	jsonResponse({ ok: false, error: 'unauthorized' satisfies ApiErrorCode }, 401, {
		'www-authenticate': 'Bearer',
	});
