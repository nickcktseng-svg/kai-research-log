export type ApiErrorCode = 'database_unavailable' | 'query_failed';

export const jsonResponse = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store',
		},
	});

export const databaseUnavailable = () =>
	jsonResponse({ ok: false, error: 'database_unavailable' satisfies ApiErrorCode }, 503);

export const queryFailed = () =>
	jsonResponse({ ok: false, error: 'query_failed' satisfies ApiErrorCode }, 500);
