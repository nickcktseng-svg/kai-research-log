export type AuthRole = 'owner' | 'guest';

export interface AuthSession {
	role: AuthRole;
	username: string;
	iat: number;
	exp: number;
}

const cookieName = 'kai_research_session';
const encoder = new TextEncoder();

type TimingSafeSubtleCrypto = SubtleCrypto & {
	timingSafeEqual?: (a: ArrayBufferView, b: ArrayBufferView) => boolean;
};

const bytesToBase64Url = (bytes: Uint8Array): string => {
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
};

const base64UrlToBytes = (value: string): Uint8Array => {
	const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
	const paddedBase64 = base64.padEnd(
		base64.length + ((4 - (base64.length % 4)) % 4),
		'=',
	);
	const binary = atob(paddedBase64);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes;
};

const jsonToBase64Url = (value: unknown): string =>
	bytesToBase64Url(encoder.encode(JSON.stringify(value)));

const base64UrlToJson = <T>(value: string): T | null => {
	try {
		const bytes = base64UrlToBytes(value);
		return JSON.parse(new TextDecoder().decode(bytes)) as T;
	} catch {
		return null;
	}
};

const signValue = async (value: string, secret: string): Promise<string> => {
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));

	return bytesToBase64Url(new Uint8Array(signature));
};

const timingSafeEqual = (left: Uint8Array, right: Uint8Array): boolean => {
	if (left.byteLength !== right.byteLength) return false;

	const subtle = crypto.subtle as TimingSafeSubtleCrypto;
	if (subtle.timingSafeEqual) {
		return subtle.timingSafeEqual(left, right);
	}

	let diff = 0;
	for (let index = 0; index < left.byteLength; index += 1) {
		diff |= left[index] ^ right[index];
	}

	return diff === 0;
};

const parseCookies = (request: Request): Map<string, string> => {
	const cookieHeader = request.headers.get('cookie') ?? '';
	const cookies = new Map<string, string>();

	for (const pair of cookieHeader.split(';')) {
		const [name, ...rawValue] = pair.trim().split('=');
		if (!name || rawValue.length === 0) continue;
		cookies.set(name, rawValue.join('='));
	}

	return cookies;
};

const isAuthSession = (value: unknown): value is AuthSession => {
	if (typeof value !== 'object' || value === null) return false;

	const session = value as Partial<AuthSession>;
	return (
		(session.role === 'owner' || session.role === 'guest') &&
		typeof session.username === 'string' &&
		typeof session.iat === 'number' &&
		typeof session.exp === 'number'
	);
};

const cookieSecurity = (request: Request): string =>
	new URL(request.url).protocol === 'https:' ? '; Secure' : '';

export const createAuthSessionCookie = async ({
	maxAgeSeconds,
	request,
	role,
	secret,
	username,
}: {
	maxAgeSeconds: number;
	request: Request;
	role: AuthRole;
	secret: string;
	username: string;
}): Promise<string> => {
	const now = Math.floor(Date.now() / 1000);
	const session: AuthSession = {
		role,
		username,
		iat: now,
		exp: now + maxAgeSeconds,
	};
	const payload = jsonToBase64Url(session);
	const signature = await signValue(payload, secret);

	return `${cookieName}=${payload}.${signature}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${cookieSecurity(request)}`;
};

export const createClearAuthSessionCookie = (request: Request): string =>
	`${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${cookieSecurity(request)}`;

export const readAuthSession = async (
	request: Request,
	secret: string | undefined,
): Promise<AuthSession | null> => {
	if (!secret) return null;

	const sessionCookie = parseCookies(request).get(cookieName);
	if (!sessionCookie) return null;

	const [payload, signature] = sessionCookie.split('.');
	if (!payload || !signature) return null;

	let signaturesMatch = false;
	try {
		const expectedSignature = await signValue(payload, secret);
		signaturesMatch = timingSafeEqual(
			base64UrlToBytes(signature),
			base64UrlToBytes(expectedSignature),
		);
	} catch {
		return null;
	}

	if (!signaturesMatch) {
		return null;
	}

	const session = base64UrlToJson<AuthSession>(payload);
	if (!isAuthSession(session)) return null;

	const now = Math.floor(Date.now() / 1000);
	if (session.exp <= now) return null;

	return session;
};
