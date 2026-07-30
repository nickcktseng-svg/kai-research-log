import type {
	CreateBlogEntryInput,
	DatabaseBlogEntry,
	BlogEntry,
	BlogEntryStatus,
	UpdateBlogEntryInput,
} from '../../types/database';

const parseTags = (value: string): string[] => {
	try {
		const tags: unknown = JSON.parse(value || '[]');
		if (!Array.isArray(tags)) return [];

		return tags.filter((tag): tag is string => typeof tag === 'string');
	} catch {
		return [];
	}
};

const normalizeEntry = (entry: DatabaseBlogEntry): BlogEntry => {
	const { tags_json, ...rest } = entry;

	return {
		...rest,
		tags: parseTags(tags_json),
	};
};

export const normalizeBlogSlug = (value: string): string =>
	value
		.trim()
		.toLowerCase()
		.replace(/[^\p{Letter}\p{Number}]+/gu, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 90);

const createFallbackSlug = (title: string): string => {
	const normalizedTitle = normalizeBlogSlug(title);
	if (normalizedTitle) return normalizedTitle;

	const datePart = new Date().toISOString().slice(0, 10);
	return `blog-${datePart}`;
};

const createUniqueSlug = async (
	db: D1Database,
	baseSlug: string,
	excludedId?: string,
): Promise<string> => {
	const normalizedBase = normalizeBlogSlug(baseSlug) || 'blog';
	let slug = normalizedBase;
	let suffix = 2;

	while (true) {
		const query = excludedId
			? db
					.prepare('SELECT id FROM blog_entries WHERE slug = ? AND id != ?')
					.bind(slug, excludedId)
			: db.prepare('SELECT id FROM blog_entries WHERE slug = ?').bind(slug);
		const existing = await query.first<{ id: string }>();

		if (!existing) return slug;

		slug = `${normalizedBase}-${suffix}`;
		suffix += 1;
	}
};

export const listBlogEntries = async (
	db: D1Database,
	{
		includeDrafts = false,
		limit = 100,
	}: {
		includeDrafts?: boolean;
		limit?: number;
	} = {},
): Promise<BlogEntry[]> => {
	const safeLimit = Math.max(1, Math.min(limit, 100));
	const result = includeDrafts
		? await db
				.prepare(
					`SELECT *
					FROM blog_entries
					ORDER BY entry_date DESC, created_at DESC
					LIMIT ?`,
				)
				.bind(safeLimit)
				.all()
		: await db
				.prepare(
					`SELECT *
					FROM blog_entries
					WHERE status = ?
					ORDER BY entry_date DESC, created_at DESC
					LIMIT ?`,
				)
				.bind('published' satisfies BlogEntryStatus, safeLimit)
				.all();

	return ((result.results ?? []) as DatabaseBlogEntry[]).map(normalizeEntry);
};

export const getBlogEntryBySlug = async (
	db: D1Database,
	slug: string,
	{ includeDrafts = false }: { includeDrafts?: boolean } = {},
): Promise<BlogEntry | null> => {
	const normalizedSlug = normalizeBlogSlug(slug);
	const result = includeDrafts
		? await db
				.prepare('SELECT * FROM blog_entries WHERE slug = ?')
				.bind(normalizedSlug)
				.first<DatabaseBlogEntry>()
		: await db
				.prepare('SELECT * FROM blog_entries WHERE slug = ? AND status = ?')
				.bind(normalizedSlug, 'published' satisfies BlogEntryStatus)
				.first<DatabaseBlogEntry>();

	return result ? normalizeEntry(result) : null;
};

export const getBlogEntryById = async (
	db: D1Database,
	id: string,
): Promise<BlogEntry | null> => {
	const result = await db
		.prepare('SELECT * FROM blog_entries WHERE id = ?')
		.bind(id)
		.first<DatabaseBlogEntry>();

	return result ? normalizeEntry(result) : null;
};

export const createBlogEntry = async (
	db: D1Database,
	input: CreateBlogEntryInput,
): Promise<BlogEntry> => {
	const id = `blog-${crypto.randomUUID()}`;
	const now = new Date().toISOString();
	const baseSlug = input.slug || createFallbackSlug(input.title);
	const slug = await createUniqueSlug(db, baseSlug);

	await db
		.prepare(
			`INSERT INTO blog_entries (
				id,
				slug,
				title,
				summary,
				category,
				tags_json,
				content_html,
				status,
				entry_date,
				created_at,
				updated_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			slug,
			input.title,
			input.summary,
			input.category,
			JSON.stringify(input.tags),
			input.content_html,
			input.status,
			input.entry_date,
			now,
			now,
		)
		.run();

	const entry = await getBlogEntryById(db, id);
	if (!entry) {
		throw new Error('Created blog entry could not be read back from D1.');
	}

	return entry;
};

export const updateBlogEntry = async (
	db: D1Database,
	id: string,
	input: UpdateBlogEntryInput,
): Promise<BlogEntry | null> => {
	const existingEntry = await db
		.prepare('SELECT id, slug FROM blog_entries WHERE id = ?')
		.bind(id)
		.first<{ id: string; slug: string }>();

	if (!existingEntry) return null;

	const assignments: string[] = [];
	const values: string[] = [];
	const now = new Date().toISOString();

	const addAssignment = (column: string, value: string) => {
		assignments.push(`${column} = ?`);
		values.push(value);
	};

	if (input.title !== undefined) addAssignment('title', input.title);
	if (input.summary !== undefined) addAssignment('summary', input.summary);
	if (input.category !== undefined) addAssignment('category', input.category);
	if (input.tags !== undefined) addAssignment('tags_json', JSON.stringify(input.tags));
	if (input.content_html !== undefined) {
		addAssignment('content_html', input.content_html);
	}
	if (input.status !== undefined) addAssignment('status', input.status);
	if (input.entry_date !== undefined) addAssignment('entry_date', input.entry_date);
	if (input.slug !== undefined) {
		const slugSource = input.slug || input.title || existingEntry.slug;
		const uniqueSlug = await createUniqueSlug(db, slugSource, id);
		addAssignment('slug', uniqueSlug);
	}

	if (assignments.length > 0) {
		await db
			.prepare(
				`UPDATE blog_entries
				SET ${assignments.join(', ')}, updated_at = ?
				WHERE id = ?`,
			)
			.bind(...values, now, id)
			.run();
	} else {
		await db
			.prepare('UPDATE blog_entries SET updated_at = ? WHERE id = ?')
			.bind(now, id)
			.run();
	}

	return getBlogEntryById(db, id);
};
