import type {
	CreatePaperAnalysisInput,
	CreatePaperInput,
	DatabasePaper,
	DatabasePaperAnalysis,
	Paper,
	UpdatePaperInput,
} from '../../types/database';

const parseStringArray = (value: string): string[] => {
	try {
		const parsed: unknown = JSON.parse(value || '[]');
		if (!Array.isArray(parsed)) return [];

		return parsed.filter((item): item is string => typeof item === 'string');
	} catch {
		return [];
	}
};

const normalizeDoi = (doi: string): string =>
	doi
		.trim()
		.toLowerCase()
		.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
		.replace(/^doi:\s*/, '');

const normalizeSourceId = (sourceId: string): string =>
	sourceId.trim().toLowerCase();

const normalizeTitleKey = (title: string): string =>
	title
		.trim()
		.toLowerCase()
		.replace(/[^\p{Letter}\p{Number}]+/gu, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 120);

export const createPaperSourceKey = (input: CreatePaperInput): string => {
	const doi = normalizeDoi(input.doi);
	if (doi) return `doi:${doi}`;

	const sourceId = normalizeSourceId(input.source_id);
	if (sourceId) return `${input.source}:${sourceId}`;

	const url = input.url.trim().toLowerCase();
	if (url) return `url:${url}`;

	const titleKey = normalizeTitleKey(input.title) || 'untitled';
	return `manual:${titleKey}:${input.publication_year ?? 'unknown'}`;
};

const normalizePaper = (
	paper: DatabasePaper,
	analyses: DatabasePaperAnalysis[] = [],
): Paper => {
	const { authors_json, tags_json, ...rest } = paper;

	return {
		...rest,
		authors: parseStringArray(authors_json),
		tags: parseStringArray(tags_json),
		analyses,
	};
};

const mapAnalysesByPaper = (
	rows: DatabasePaperAnalysis[],
): Map<string, DatabasePaperAnalysis[]> => {
	const analysisMap = new Map<string, DatabasePaperAnalysis[]>();

	for (const row of rows) {
		const analyses = analysisMap.get(row.paper_id) ?? [];
		analyses.push(row);
		analysisMap.set(row.paper_id, analyses);
	}

	return analysisMap;
};

const listAnalysesForPaperIds = async (
	db: D1Database,
	paperIds: string[],
): Promise<Map<string, DatabasePaperAnalysis[]>> => {
	if (paperIds.length === 0) return new Map();

	const placeholders = paperIds.map(() => '?').join(', ');
	const result = await db
		.prepare(
			`SELECT *
			FROM paper_analyses
			WHERE paper_id IN (${placeholders})
			ORDER BY created_at DESC`,
		)
		.bind(...paperIds)
		.all();

	return mapAnalysesByPaper((result.results ?? []) as DatabasePaperAnalysis[]);
};

export const listPapers = async (
	db: D1Database,
	{
		includePrivate = false,
		limit = 100,
	}: {
		includePrivate?: boolean;
		limit?: number;
	} = {},
): Promise<Paper[]> => {
	const safeLimit = Math.max(1, Math.min(limit, 200));
	const paperResult = includePrivate
		? await db
				.prepare(
					`SELECT *
					FROM papers
					ORDER BY saved_at DESC, updated_at DESC
					LIMIT ?`,
				)
				.bind(safeLimit)
				.all()
		: await db
				.prepare(
					`SELECT *
					FROM papers
					WHERE visibility = ?
					ORDER BY saved_at DESC, updated_at DESC
					LIMIT ?`,
				)
				.bind('public', safeLimit)
				.all();

	const paperRows = (paperResult.results ?? []) as DatabasePaper[];
	const analysisMap = await listAnalysesForPaperIds(
		db,
		paperRows.map((paper) => paper.id),
	);

	return paperRows.map((paper) =>
		normalizePaper(paper, analysisMap.get(paper.id) ?? []),
	);
};

export const getPaperById = async (
	db: D1Database,
	id: string,
	{ includePrivate = false }: { includePrivate?: boolean } = {},
): Promise<Paper | null> => {
	const paper = includePrivate
		? await db.prepare('SELECT * FROM papers WHERE id = ?').bind(id).first<DatabasePaper>()
		: await db
				.prepare('SELECT * FROM papers WHERE id = ? AND visibility = ?')
				.bind(id, 'public')
				.first<DatabasePaper>();

	if (!paper) return null;

	const analysisMap = await listAnalysesForPaperIds(db, [paper.id]);
	return normalizePaper(paper, analysisMap.get(paper.id) ?? []);
};

const bindPaperValues = (
	input: CreatePaperInput,
	sourceKey: string,
	now: string,
): (string | number | null)[] => [
	sourceKey,
	input.source,
	input.source_id,
	normalizeDoi(input.doi),
	input.title,
	JSON.stringify(input.authors),
	input.publication_year,
	input.journal,
	input.abstract,
	input.url,
	input.citation,
	input.cited_by_count,
	input.is_open_access ? 1 : 0,
	input.reading_status,
	JSON.stringify(input.tags),
	input.visibility,
	now,
];

const createAnalysisStatement = (
	db: D1Database,
	paperId: string,
	input: CreatePaperAnalysisInput,
): D1PreparedStatement => {
	const id = `analysis-${crypto.randomUUID()}`;
	const now = new Date().toISOString();

	return db
		.prepare(
			`INSERT INTO paper_analyses (
				id,
				paper_id,
				analysis_mode,
				analysis_title,
				analysis_markdown,
				source_excerpt,
				created_at,
				updated_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			paperId,
			input.analysis_mode,
			input.analysis_title,
			input.analysis_markdown,
			input.source_excerpt,
			now,
			now,
		);
};

export const savePaper = async (
	db: D1Database,
	input: CreatePaperInput,
): Promise<Paper> => {
	const sourceKey = createPaperSourceKey(input);
	const existingPaper = await db
		.prepare('SELECT id FROM papers WHERE source_key = ?')
		.bind(sourceKey)
		.first<{ id: string }>();
	const now = new Date().toISOString();

	if (existingPaper) {
		const assignments = [
			'source = ?',
			'source_id = ?',
			'doi = ?',
			'title = ?',
			'authors_json = ?',
			'publication_year = ?',
			'journal = ?',
			'abstract = ?',
			'url = ?',
			'citation = ?',
			'cited_by_count = ?',
			'is_open_access = ?',
			'reading_status = ?',
			'tags_json = ?',
			'visibility = ?',
			'saved_at = ?',
		];
		const values = bindPaperValues(input, sourceKey, now).slice(1);

		if (input.notes !== undefined) {
			assignments.push('notes = ?');
			values.push(input.notes);
		}

		const statements = [
			db
				.prepare(
					`UPDATE papers
					SET ${assignments.join(', ')}, updated_at = ?
					WHERE id = ?`,
				)
				.bind(...values, now, existingPaper.id),
		];

		if (input.analysis?.analysis_markdown) {
			statements.push(createAnalysisStatement(db, existingPaper.id, input.analysis));
		}

		await db.batch(statements);

		const paper = await getPaperById(db, existingPaper.id, { includePrivate: true });
		if (!paper) throw new Error('Saved paper could not be read back from D1.');
		return paper;
	}

	const paperId = `paper-${crypto.randomUUID()}`;
	const statements = [
		db
			.prepare(
				`INSERT INTO papers (
					id,
					source_key,
					source,
					source_id,
					doi,
					title,
					authors_json,
					publication_year,
					journal,
					abstract,
					url,
					citation,
					cited_by_count,
					is_open_access,
					reading_status,
					tags_json,
					notes,
					visibility,
					saved_at,
					created_at,
					updated_at
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				paperId,
				sourceKey,
				input.source,
				input.source_id,
				normalizeDoi(input.doi),
				input.title,
				JSON.stringify(input.authors),
				input.publication_year,
				input.journal,
				input.abstract,
				input.url,
				input.citation,
				input.cited_by_count,
				input.is_open_access ? 1 : 0,
				input.reading_status,
				JSON.stringify(input.tags),
				input.notes ?? '',
				input.visibility,
				now,
				now,
				now,
			),
	];

	if (input.analysis?.analysis_markdown) {
		statements.push(createAnalysisStatement(db, paperId, input.analysis));
	}

	await db.batch(statements);

	const paper = await getPaperById(db, paperId, { includePrivate: true });
	if (!paper) throw new Error('Created paper could not be read back from D1.');

	return paper;
};

export const updatePaper = async (
	db: D1Database,
	id: string,
	input: UpdatePaperInput,
): Promise<Paper | null> => {
	const existingPaper = await db
		.prepare('SELECT id FROM papers WHERE id = ?')
		.bind(id)
		.first<{ id: string }>();

	if (!existingPaper) return null;

	const assignments: string[] = [];
	const values: (string | number | null)[] = [];
	const now = new Date().toISOString();

	if (input.reading_status !== undefined) {
		assignments.push('reading_status = ?');
		values.push(input.reading_status);
	}
	if (input.tags !== undefined) {
		assignments.push('tags_json = ?');
		values.push(JSON.stringify(input.tags));
	}
	if (input.notes !== undefined) {
		assignments.push('notes = ?');
		values.push(input.notes);
	}
	if (input.visibility !== undefined) {
		assignments.push('visibility = ?');
		values.push(input.visibility);
	}

	if (assignments.length > 0) {
		await db
			.prepare(
				`UPDATE papers
				SET ${assignments.join(', ')}, updated_at = ?
				WHERE id = ?`,
			)
			.bind(...values, now, id)
			.run();
	} else {
		await db
			.prepare('UPDATE papers SET updated_at = ? WHERE id = ?')
			.bind(now, id)
			.run();
	}

	return getPaperById(db, id, { includePrivate: true });
};

export const createPaperAnalysis = async (
	db: D1Database,
	paperId: string,
	input: CreatePaperAnalysisInput,
): Promise<Paper | null> => {
	const existingPaper = await db
		.prepare('SELECT id FROM papers WHERE id = ?')
		.bind(paperId)
		.first<{ id: string }>();

	if (!existingPaper) return null;

	await createAnalysisStatement(db, paperId, input).run();
	return getPaperById(db, paperId, { includePrivate: true });
};
