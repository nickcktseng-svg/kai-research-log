import type {
	CreatePaperAnalysisInput,
	CreatePaperInput,
	PaperReadingStatus,
	PaperSource,
	PaperVisibility,
	UpdatePaperInput,
} from '../../types/database';

type ParseResult<T> =
	| {
			ok: true;
			value: T;
	  }
	| {
			ok: false;
			message: string;
	  };

const paperSources = ['manual', 'openalex', 'doi', 'url'] as const;
const readingStatuses = ['to_read', 'reading', 'finished', 'important'] as const;
const visibilityOptions = ['private', 'public'] as const;

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isOneOf = <T extends readonly string[]>(
	value: unknown,
	allowedValues: T,
): value is T[number] =>
	typeof value === 'string' && allowedValues.includes(value);

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
	fallback = '',
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

const readOptionalNumber = (
	payload: Record<string, unknown>,
	key: string,
	fallback: number,
): ParseResult<number> => {
	const value = payload[key];
	if (value === undefined || value === null || value === '') {
		return { ok: true, value: fallback };
	}

	const numberValue = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(numberValue)) {
		return { ok: false, message: `${key} must be a number.` };
	}

	return { ok: true, value: Math.max(0, Math.round(numberValue)) };
};

const readPublicationYear = (
	payload: Record<string, unknown>,
): ParseResult<number | null> => {
	const value = payload.publication_year ?? payload.publicationYear;
	if (value === undefined || value === null || value === '') {
		return { ok: true, value: null };
	}

	const year = typeof value === 'number' ? value : Number(value);
	if (!Number.isInteger(year) || year < 1500 || year > 2200) {
		return { ok: false, message: 'publication_year must be a valid year.' };
	}

	return { ok: true, value: year };
};

const readStringArray = (
	payload: Record<string, unknown>,
	key: string,
	{ maxItems, maxLength }: { maxItems: number; maxLength: number },
): ParseResult<string[]> => {
	const value = payload[key];
	if (value === undefined || value === null) {
		return { ok: true, value: [] };
	}

	if (!Array.isArray(value)) {
		return { ok: false, message: `${key} must be an array of strings.` };
	}

	const values: string[] = [];

	for (const item of value) {
		if (typeof item !== 'string') {
			return { ok: false, message: `${key} must be an array of strings.` };
		}

		const trimmedItem = item.trim();
		if (trimmedItem.length > maxLength) {
			return { ok: false, message: `${key} item is too long.` };
		}

		if (trimmedItem && !values.includes(trimmedItem)) {
			values.push(trimmedItem);
		}
	}

	if (values.length > maxItems) {
		return { ok: false, message: `${key} can contain at most ${maxItems} items.` };
	}

	return { ok: true, value: values };
};

const readBoolean = (
	payload: Record<string, unknown>,
	key: string,
	fallback: boolean,
): ParseResult<boolean> => {
	const value = payload[key];
	if (value === undefined || value === null) {
		return { ok: true, value: fallback };
	}

	if (typeof value !== 'boolean') {
		return { ok: false, message: `${key} must be a boolean.` };
	}

	return { ok: true, value };
};

const readAnalysis = (
	payload: Record<string, unknown>,
): ParseResult<CreatePaperAnalysisInput | undefined> => {
	const value = payload.analysis;
	if (value === undefined || value === null) {
		return { ok: true, value: undefined };
	}

	if (!isObject(value)) {
		return { ok: false, message: 'analysis must be an object.' };
	}

	const mode = readOptionalString(value, 'analysis_mode', 60, 'quick');
	if (!mode.ok) return mode;

	const title = readOptionalString(value, 'analysis_title', 160, '');
	if (!title.ok) return title;

	const markdown = readRequiredString(value, 'analysis_markdown', 220_000);
	if (!markdown.ok) return markdown;

	const excerpt = readOptionalString(value, 'source_excerpt', 50_000, '');
	if (!excerpt.ok) return excerpt;

	return {
		ok: true,
		value: {
			analysis_mode: mode.value,
			analysis_title: title.value,
			analysis_markdown: markdown.value,
			source_excerpt: excerpt.value,
		},
	};
};

export const parseLargeJsonObject = async (
	request: Request,
	maxBytes = 900_000,
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

export const parseCreatePaperPayload = (
	payload: Record<string, unknown>,
): ParseResult<CreatePaperInput> => {
	const title = readRequiredString(payload, 'title', 400);
	if (!title.ok) return title;

	const source: PaperSource = isOneOf(payload.source, paperSources)
		? payload.source
		: 'manual';

	const sourceId = readOptionalString(
		{ source_id: payload.source_id ?? payload.sourceId },
		'source_id',
		800,
		'',
	);
	if (!sourceId.ok) return sourceId;

	const doi = readOptionalString(payload, 'doi', 300, '');
	if (!doi.ok) return doi;

	const authors = readStringArray(payload, 'authors', {
		maxItems: 40,
		maxLength: 120,
	});
	if (!authors.ok) return authors;

	const publicationYear = readPublicationYear(payload);
	if (!publicationYear.ok) return publicationYear;

	const journal = readOptionalString(payload, 'journal', 240, '');
	if (!journal.ok) return journal;

	const abstract = readOptionalString(payload, 'abstract', 18_000, '');
	if (!abstract.ok) return abstract;

	const url = readOptionalString(payload, 'url', 1200, '');
	if (!url.ok) return url;

	const citation = readOptionalString(payload, 'citation', 1800, '');
	if (!citation.ok) return citation;

	const citedByCount = readOptionalNumber(
		{ cited_by_count: payload.cited_by_count ?? payload.citedByCount },
		'cited_by_count',
		0,
	);
	if (!citedByCount.ok) return citedByCount;

	const isOpenAccess = readBoolean(
		{ is_open_access: payload.is_open_access ?? payload.isOpenAccess },
		'is_open_access',
		false,
	);
	if (!isOpenAccess.ok) return isOpenAccess;

	const readingStatus: PaperReadingStatus = isOneOf(
		payload.reading_status ?? payload.readingStatus,
		readingStatuses,
	)
		? (payload.reading_status ?? payload.readingStatus) as PaperReadingStatus
		: 'to_read';

	const tags = readStringArray(payload, 'tags', { maxItems: 24, maxLength: 60 });
	if (!tags.ok) return tags;

	const notes = readOptionalString(payload, 'notes', 30_000, '');
	if (!notes.ok) return notes;

	const visibility: PaperVisibility = isOneOf(payload.visibility, visibilityOptions)
		? payload.visibility
		: 'private';

	const analysis = readAnalysis(payload);
	if (!analysis.ok) return analysis;

	return {
		ok: true,
		value: {
			source,
			source_id: sourceId.value,
			doi: doi.value,
			title: title.value,
			authors: authors.value,
			publication_year: publicationYear.value,
			journal: journal.value,
			abstract: abstract.value,
			url: url.value,
			citation: citation.value,
			cited_by_count: citedByCount.value,
			is_open_access: isOpenAccess.value,
			reading_status: readingStatus,
			tags: tags.value,
			notes: notes.value,
			visibility,
			analysis: analysis.value,
		},
	};
};

export const parseUpdatePaperPayload = (
	payload: Record<string, unknown>,
): ParseResult<UpdatePaperInput> => {
	const update: UpdatePaperInput = {};

	if ('reading_status' in payload || 'readingStatus' in payload) {
		const value = payload.reading_status ?? payload.readingStatus;
		if (!isOneOf(value, readingStatuses)) {
			return {
				ok: false,
				message: 'reading_status must be to_read, reading, finished, or important.',
			};
		}
		update.reading_status = value;
	}

	if ('tags' in payload) {
		const tags = readStringArray(payload, 'tags', { maxItems: 24, maxLength: 60 });
		if (!tags.ok) return tags;
		update.tags = tags.value;
	}

	if ('notes' in payload) {
		const notes = readOptionalString(payload, 'notes', 30_000, '');
		if (!notes.ok) return notes;
		update.notes = notes.value;
	}

	if ('visibility' in payload) {
		if (!isOneOf(payload.visibility, visibilityOptions)) {
			return { ok: false, message: 'visibility must be private or public.' };
		}
		update.visibility = payload.visibility;
	}

	if (Object.keys(update).length === 0) {
		return { ok: false, message: 'At least one paper field is required.' };
	}

	return { ok: true, value: update };
};

export const parseCreatePaperAnalysisPayload = (
	payload: Record<string, unknown>,
): ParseResult<CreatePaperAnalysisInput> => {
	const analysis = readAnalysis({ analysis: payload });
	if (!analysis.ok) return analysis;
	if (!analysis.value) {
		return { ok: false, message: 'analysis is required.' };
	}

	return { ok: true, value: analysis.value };
};

export const parsePaperId = (id: string | undefined): ParseResult<string> => {
	if (!id || id.trim().length === 0) {
		return { ok: false, message: 'Paper id is required.' };
	}

	const trimmedId = id.trim();
	if (trimmedId.length > 128) {
		return { ok: false, message: 'Paper id is too long.' };
	}

	return { ok: true, value: trimmedId };
};
