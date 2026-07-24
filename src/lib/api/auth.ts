import { authUnconfigured, unauthorized } from '../database/http';
import { readAuthSession } from '../auth/session';

const extractBearerToken = (request: Request): string | null => {
	const authorization = request.headers.get('authorization');
	if (!authorization) return null;

	const match = authorization.match(/^Bearer\s+(.+)$/i);
	return match?.[1]?.trim() || null;
};

export const timingSafeTokenMatch = async (
	providedToken: string,
	expectedToken: string,
): Promise<boolean> => {
	const encoder = new TextEncoder();
	const [providedHash, expectedHash] = await Promise.all([
		crypto.subtle.digest('SHA-256', encoder.encode(providedToken)),
		crypto.subtle.digest('SHA-256', encoder.encode(expectedToken)),
	]);

	return crypto.subtle.timingSafeEqual(providedHash, expectedHash);
};

export const requireTaskApiToken = async (
	request: Request,
	expectedToken: string | undefined,
): Promise<Response | null> => {
	if (!expectedToken) {
		return authUnconfigured();
	}

	const providedToken = extractBearerToken(request);
	if (!providedToken) {
		return unauthorized();
	}

	const isAuthorized = await timingSafeTokenMatch(providedToken, expectedToken);
	return isAuthorized ? null : unauthorized();
};

export const requireOwnerTaskAccess = async (
	request: Request,
	{
		sessionSecret,
		taskApiToken,
	}: {
		sessionSecret: string | undefined;
		taskApiToken: string | undefined;
	},
): Promise<Response | null> => {
	const session = await readAuthSession(request, sessionSecret);
	if (session?.role === 'owner') return null;

	if (taskApiToken) {
		const providedToken = extractBearerToken(request);
		if (providedToken) {
			const isAuthorized = await timingSafeTokenMatch(providedToken, taskApiToken);
			if (isAuthorized) return null;
		}
	}

	if (!sessionSecret && !taskApiToken) {
		return authUnconfigured();
	}

	return unauthorized();
};
