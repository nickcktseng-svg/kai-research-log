import type {
	CreateJournalEntryInput,
	JournalStatus,
	UpdateJournalEntryInput,
} from '../../types/database';
import { normalizeJournalSlug } from '../database/journal';

type ParseResult<T> =
	| {
			ok: true;
			value: T;
	  }
	| {
			ok: false;
			message: string;
	  };

const journalStatuses = ['draft', 'published'] as const;

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isJournalStatus = (value: unknown): value is JournalStatus =>
	typeof value === 'string' &&
	(journalStatuses as readonly string[]).includes(value);

const sanitizeHtml = (value: string): string =>
	value
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
		.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
		.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
		.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
		.replace(/\s(href|src)\s*=\s*"javascript:[^"]*"/gi, '')
		.replace(/\s(href|src)\s*=\s*'javascript:[^']*'/gi, '');

const readRequiredString = (
	payload: Record<string, unknown>,
	key: string,
	maxLength: number,
): ParseResult<string> => {
	const value = payload[key];
	if (typeof value !== 'string' || value.trim().length === 0) {
		return { ok: false, message: `${key} is required.` };
	}

	const trimmedValue = value.trim();
	if (trimmedValue.length > maxLength) {
		return { ok: false, message: `${key} is too long.` };
	}

	return { ok: true, value: trimmedValue };
};

const readOptionalString = (
	payload: Record<string, unknown>,
	key: string,
	maxLength: number,
	fallback: string,
): ParseResult<string> => {
	const value = payload[key];
	if (value === undefined || value === null) {
		return { ok: true, value: fallback };
	}

	if (typeof value !== 'string') {
		return { ok: false, message: `${key} must be a string.` };
	}

	const trimmedValue = value.trim();
	if (trimmedValue.length > maxLength) {
		return { ok: false, message: `${key} is too long.` };
	}

	return { ok: true, value: trimmedValue || fallback };
};

const readContentHtml = (
	payload: Record<string, unknown>,
	key: string,
): ParseResult<string> => {
	const value = payload[key];
	if (typeof value !== 'string') {
		return { ok: false, message: `${key} must be a string.` };
	}

	if (value.length > 1_500_000) {
		return { ok: false, message: `${key} is too large.` };
	}

	return { ok: true, value: sanitizeHtml(value.trim()) };
};

const readSlug = (
	payload: Record<string, unknown>,
): ParseResult<string | null> => {
	const value = payload.slug;
	if (value === undefined || value === null || value === '') {
		return { ok: true, value: null };
	}

	if (typeof value !== 'string') {
		return { ok: false, message: 'slug must be a string.' };
	}

	const slug = normalizeJournalSlug(value);
	if (slug.length > 90) {
		return { ok: false, message: 'slug is too long.' };
	}

	return { ok: true, value: slug || null };
};

const readEntryDate = (
	payload: Record<string, unknown>,
): ParseResult<string> => {
	const value = payload.entry_date ?? payload.entryDate;
	if (value === undefined || value === null || value === '') {
		return { ok: true, value: new Date().toISOString().slice(0, 10) };
	}

	if (typeof value !== 'string') {
		return { ok: false, message: 'entry_date must be a string.' };
	}

	const trimmedValue = value.trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
		return { ok: false, message: 'entry_date must use YYYY-MM-DD.' };
	}

	return { ok: true, value: trimmedValue };
};

const readTags = (payload: Record<string, unknown>): ParseResult<string[]> => {
	const value = payload.tags;
	if (value === undefined || value === null) {
		return { ok: true, value: [] };
	}

	if (!Array.isArray(value)) {
		return { ok: false, message: 'tags must be an array of strings.' };
	}

	const tags: string[] = [];

	for (const tag of value) {
		if (typeof tag !== 'string') {
			return { ok: false, message: 'tags must be an array of strings.' };
		}

		const trimmedTag = tag.trim();
		if (trimmedTag.length > 40) {
			return { ok: false, message: 'tag is too long.' };
		}

		if (trimmedTag && !tags.includes(trimmedTag)) {
			tags.push(trimmedTag);
		}
	}

	if (tags.length > 24) {
		return { ok: false, message: 'tags can contain at most 24 items.' };
	}

	return { ok: true, value: tags };
};

export const parseLargeJsonObject = async (
	request: Request,
	maxBytes = 1_800_000,
): Promise<ParseResult<Record<string, unknown>>> => {
	const contentLength = Number(request.headers.get('content-length') ?? 0);
	if (contentLength > maxBytes) {
		return { ok: false, message: 'Request body is too large.' };
	}

	try {
		const payload: unknown = await request.json();
		if (!isObject(payload)) {
			return { ok: false, message: 'Request body must be a JSON object.' };
		}

		return { ok: true, value: payload };
	} catch {
		return { ok: false, message: 'Request body must be valid JSON.' };
	}
};

export const parseCreateJournalEntryPayload = (
	payload: Record<string, unknown>,
): ParseResult<CreateJournalEntryInput> => {
	const title = readRequiredString(payload, 'title', 180);
	if (!title.ok) return title;

	const slug = readSlug(payload);
	if (!slug.ok) return slug;

	const summary = readOptionalString(payload, 'summary', 1200, '');
	if (!summary.ok) return summary;

	const category = readOptionalString(payload, 'category', 80, '研究日誌');
	if (!category.ok) return category;

	const tags = readTags(payload);
	if (!tags.ok) return tags;

	const contentHtml = readContentHtml(payload, 'content_html');
	if (!contentHtml.ok) return contentHtml;

	const entryDate = readEntryDate(payload);
	if (!entryDate.ok) return entryDate;

	const status = isJournalStatus(payload.status) ? payload.status : 'draft';

	return {
		ok: true,
		value: {
			title: title.value,
			slug: slug.value,
			summary: summary.value,
			category: category.value,
			tags: tags.value,
			content_html: contentHtml.value,
			status,
			entry_date: entryDate.value,
		},
	};
};

export const parseUpdateJournalEntryPayload = (
	payload: Record<string, unknown>,
): ParseResult<UpdateJournalEntryInput> => {
	const update: UpdateJournalEntryInput = {};

	if ('title' in payload) {
		const title = readRequiredString(payload, 'title', 180);
		if (!title.ok) return title;
		update.title = title.value;
	}

	if ('slug' in payload) {
		const slug = readSlug(payload);
		if (!slug.ok) return slug;
		update.slug = slug.value;
	}

	if ('summary' in payload) {
		const summary = readOptionalString(payload, 'summary', 1200, '');
		if (!summary.ok) return summary;
		update.summary = summary.value;
	}

	if ('category' in payload) {
		const category = readOptionalString(payload, 'category', 80, '研究日誌');
		if (!category.ok) return category;
		update.category = category.value;
	}

	if ('tags' in payload) {
		const tags = readTags(payload);
		if (!tags.ok) return tags;
		update.tags = tags.value;
	}

	if ('content_html' in payload) {
		const contentHtml = readContentHtml(payload, 'content_html');
		if (!contentHtml.ok) return contentHtml;
		update.content_html = contentHtml.value;
	}

	if ('status' in payload) {
		if (!isJournalStatus(payload.status)) {
			return { ok: false, message: 'status must be draft or published.' };
		}
		update.status = payload.status;
	}

	if ('entry_date' in payload || 'entryDate' in payload) {
		const entryDate = readEntryDate(payload);
		if (!entryDate.ok) return entryDate;
		update.entry_date = entryDate.value;
	}

	if (Object.keys(update).length === 0) {
		return { ok: false, message: 'At least one journal field is required.' };
	}

	return { ok: true, value: update };
};

export const parseJournalId = (id: string | undefined): ParseResult<string> => {
	if (!id || id.trim().length === 0) {
		return { ok: false, message: 'Journal id is required.' };
	}

	const trimmedId = id.trim();
	if (trimmedId.length > 128) {
		return { ok: false, message: 'Journal id is too long.' };
	}

	return { ok: true, value: trimmedId };
};
