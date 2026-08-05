import { createHash } from 'node:crypto';
import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	renameSync,
	statSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

export const rootDir = process.env.JOURNAL_PIPELINE_ROOT
	? resolve(process.env.JOURNAL_PIPELINE_ROOT)
	: dirname(dirname(fileURLToPath(import.meta.url)));

export const paths = {
	inbox: join(rootDir, 'journal-inbox'),
	pending: join(rootDir, 'journal-inbox/pending'),
	processed: join(rootDir, 'journal-inbox/processed'),
	processedJson: join(rootDir, 'journal-inbox/processed.json'),
	blogGenerated: join(rootDir, 'src/content/blog/generated'),
	weeklyDrafts: join(rootDir, 'src/data/generated-weekly-report-drafts.json'),
};

export const allowedSources = new Set(['codex', 'chatgpt', 'manual']);
export const allowedPrivacy = new Set(['public-safe', 'needs-review', 'private']);

export const requiredFrontmatter = ['id', 'createdAt', 'source', 'privacy'];

export const requiredSections = [
	'對話摘要',
	'本次目標',
	'完成事項',
	'化學／計算化學內容',
	'網頁開發內容',
	'重要決策',
	'遇到的問題',
	'解決方式',
	'修改的檔案',
	'待確認事項',
	'下一步',
];

const sensitivePatterns = [
	{ type: 'private-key', pattern: /BEGIN [A-Z ]*PRIVATE KEY/i },
	{ type: 'github-token', pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
	{ type: 'api-key-keyword', pattern: /\bAPI[\s_-]*key\b/i },
	{ type: 'bearer-token', pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/i },
	{ type: 'bearer-token-keyword', pattern: /\bBearer\s+token\b/i },
	{ type: 'password-assignment', pattern: /\bpassword\s*[:=]\s*\S+/i },
	{ type: 'password-keyword', pattern: /\bpassword\b/i },
	{ type: 'secret-assignment', pattern: /\bsecret\s*[:=]\s*\S+/i },
	{ type: 'secret-keyword', pattern: /\bsecret\b/i },
	{ type: 'github-token-keyword', pattern: /\bGitHub\s+token\b/i },
	{ type: 'cloudflare-token-keyword', pattern: /\bCloudflare\s+token\b/i },
	{ type: 'cloudflare-api-token-variable', pattern: /\bCLOUDFLARE_API_TOKEN\b/ },
	{ type: 'openai-api-key-variable', pattern: /\bOPENAI_API_KEY\b/ },
	{ type: 'ssh-private-key-variable', pattern: /\bSSH_PRIVATE_KEY\b/ },
];

const isoTimestampPattern =
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;

export const isInsidePath = (targetPath, directory) => {
	const relativePath = relative(resolve(directory), resolve(targetPath));
	return (
		relativePath === '' ||
		(Boolean(relativePath) &&
			!relativePath.startsWith('..') &&
			!isAbsolute(relativePath))
	);
};

export const assertInsidePath = (targetPath, directory, label = 'path') => {
	if (!isInsidePath(targetPath, directory)) {
		throw new Error(`${label} must stay inside ${toRelativePath(directory)}.`);
	}
};

export const toRelativePath = (targetPath) => {
	const resolvedPath = resolve(targetPath);
	if (!isInsidePath(resolvedPath, rootDir)) {
		throw new Error('path must stay inside the journal pipeline root.');
	}

	return relative(rootDir, resolvedPath).replaceAll('\\', '/');
};

export const ensureDir = (path) => {
	if (!existsSync(path)) mkdirSync(path, { recursive: true });
};

export const readJsonArray = (path, label) => {
	if (!existsSync(path)) return [];

	const parsed = JSON.parse(readFileSync(path, 'utf8'));
	if (!Array.isArray(parsed)) {
		throw new Error(`${label} must be a JSON array.`);
	}

	return parsed;
};

const writeAtomic = (path, content) => {
	ensureDir(dirname(path));
	const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;

	try {
		writeFileSync(tempPath, content, { flag: 'wx' });
		renameSync(tempPath, path);
	} catch (error) {
		if (existsSync(tempPath)) unlinkSync(tempPath);
		throw error;
	}
};

export const writeTextFileAtomic = (path, content) => {
	writeAtomic(path, content);
};

export const writeJsonArray = (path, value) => {
	writeAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
};

const parseFrontmatterBlock = (content) => {
	const normalizedContent = content.replace(/^\uFEFF/, '');
	const lines = normalizedContent.split(/\r?\n/);
	if (lines[0]?.trim() !== '---') {
		throw new Error('missing frontmatter block');
	}

	const endIndex = lines.findIndex(
		(line, index) => index > 0 && line.trim() === '---',
	);
	if (endIndex === -1) {
		throw new Error('unterminated frontmatter block');
	}

	return {
		body: lines.slice(endIndex + 1).join('\n'),
		frontmatterText: lines.slice(1, endIndex).join('\n'),
	};
};

const isPlainObject = (value) =>
	value !== null && typeof value === 'object' && !Array.isArray(value);

export const parseFrontmatter = (content) => {
	const { body, frontmatterText } = parseFrontmatterBlock(content);
	let data;

	try {
		data = yaml.load(frontmatterText, { schema: yaml.FAILSAFE_SCHEMA }) ?? {};
	} catch (error) {
		throw new Error(
			`invalid frontmatter YAML: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}

	if (!isPlainObject(data)) {
		throw new Error('frontmatter must be a YAML mapping');
	}

	return { body, data };
};

export const extractSections = (body) => {
	const sections = new Map();
	const lines = body.split(/\r?\n/);
	let currentSection = null;

	for (const line of lines) {
		const headingMatch = line.match(/^##\s+(.+?)\s*$/);
		if (headingMatch) {
			currentSection = headingMatch[1].trim();
			if (!sections.has(currentSection)) sections.set(currentSection, []);
			continue;
		}

		if (currentSection) {
			sections.get(currentSection).push(line);
		}
	}

	return new Map(
		Array.from(sections.entries()).map(([key, value]) => [
			key,
			value.join('\n').trim(),
		]),
	);
};

export const splitSectionItems = (content) =>
	content
		.split(/\r?\n/)
		.map((line) =>
			line
				.trim()
				.replace(/^[-*]\s+/, '')
				.replace(/^\d+[.)]\s+/, '')
				.trim(),
		)
		.filter(Boolean);

export const uniqueStrings = (items) =>
	Array.from(new Set(items.map((item) => String(item).trim()).filter(Boolean)));

export const sha256 = (content) =>
	createHash('sha256').update(content, 'utf8').digest('hex');

export const listPendingFiles = () => {
	if (!existsSync(paths.pending)) return [];

	return readdirSync(paths.pending)
		.filter((file) => file.endsWith('.md'))
		.map((file) => {
			const filePath = join(paths.pending, file);
			assertInsidePath(filePath, paths.pending, 'pending file');
			return filePath;
		})
		.filter((path) => statSync(path).isFile())
		.sort((a, b) => a.localeCompare(b));
};

export const checkSensitiveContent = (content) =>
	sensitivePatterns
		.filter(({ pattern }) => pattern.test(content))
		.map(({ type }) => type);

const validateRelativePath = (value, index, field) => {
	const errors = [];
	if (value === null || value === undefined) return errors;
	if (typeof value !== 'string') {
		errors.push(`processed.json entry ${index} ${field} must be a string or null.`);
		return errors;
	}
	if (isAbsolute(value) || value.includes('..') || value.includes('\\')) {
		errors.push(`processed.json entry ${index} ${field} must be a repository-relative path.`);
	}

	return errors;
};

const validateRecordShape = (record, index) => {
	const errors = [];
	if (!record || typeof record !== 'object') {
		errors.push(`processed.json entry ${index} must be an object.`);
		return errors;
	}
	if (!record.id || typeof record.id !== 'string') {
		errors.push(`processed.json entry ${index} is missing id.`);
	}
	if (!record.contentHash || typeof record.contentHash !== 'string') {
		errors.push(`processed.json entry ${index} is missing contentHash.`);
	}
	if (!record.sourceFile || typeof record.sourceFile !== 'string') {
		errors.push(`processed.json entry ${index} is missing sourceFile.`);
	}
	if (!record.processedAt || typeof record.processedAt !== 'string') {
		errors.push(`processed.json entry ${index} is missing processedAt.`);
	} else if (
		!isoTimestampPattern.test(record.processedAt) ||
		Number.isNaN(Date.parse(record.processedAt))
	) {
		errors.push(`processed.json entry ${index} processedAt must be an ISO timestamp.`);
	}
	errors.push(...validateRelativePath(record.sourceFile, index, 'sourceFile'));
	errors.push(...validateRelativePath(record.journalDraft, index, 'journalDraft'));
	if (
		record.journalDraft &&
		!String(record.journalDraft).startsWith('src/content/blog/generated/')
	) {
		errors.push(`processed.json entry ${index} journalDraft must point to generated blog content.`);
	}
	if (
		record.weeklyDraftWeek !== null &&
		record.weeklyDraftWeek !== undefined &&
		(typeof record.weeklyDraftWeek !== 'string' ||
			!/^\d{4}-W\d{2}$/.test(record.weeklyDraftWeek))
	) {
		errors.push(`processed.json entry ${index} weeklyDraftWeek must use YYYY-Www.`);
	}

	return errors;
};

const valueIsMissing = (value) =>
	value === undefined || value === null || String(value).trim() === '';

const validateBooleanLike = (value, key) => {
	if (value === undefined) return null;
	if (value === true || value === false) return null;
	if (value === 'true' || value === 'false') return null;

	return `${key} must be true or false`;
};

export const validateInbox = () => {
	const errors = [];
	const warnings = [];
	let processedRecords = [];

	try {
		processedRecords = readJsonArray(paths.processedJson, 'processed.json');
		const processedIdMap = new Map();
		const processedHashMap = new Map();

		processedRecords.forEach((record, index) => {
			for (const error of validateRecordShape(record, index)) {
				errors.push({ file: 'journal-inbox/processed.json', message: error });
			}

			if (record?.id) {
				const indexes = processedIdMap.get(record.id) ?? [];
				indexes.push(index);
				processedIdMap.set(record.id, indexes);
			}
			if (record?.contentHash) {
				const indexes = processedHashMap.get(record.contentHash) ?? [];
				indexes.push(index);
				processedHashMap.set(record.contentHash, indexes);
			}
		});

		for (const [id, indexes] of processedIdMap.entries()) {
			if (indexes.length > 1) {
				errors.push({
					file: 'journal-inbox/processed.json',
					message: `duplicate processed id: ${id}`,
				});
			}
		}
		for (const [hash, indexes] of processedHashMap.entries()) {
			if (indexes.length > 1) {
				errors.push({
					file: 'journal-inbox/processed.json',
					message: `duplicate processed contentHash: ${hash}`,
				});
			}
		}
	} catch (error) {
		errors.push({
			file: 'journal-inbox/processed.json',
			message: error instanceof Error ? error.message : String(error),
		});
	}

	const processedIds = new Set(
		processedRecords.map((record) => record.id).filter(Boolean),
	);
	const processedHashes = new Set(
		processedRecords.map((record) => record.contentHash).filter(Boolean),
	);

	const pendingFiles = listPendingFiles();
	const entries = [];
	const pendingIdMap = new Map();

	for (const filePath of pendingFiles) {
		const relativePath = toRelativePath(filePath);
		const content = readFileSync(filePath, 'utf8');
		const contentHash = sha256(content);

		let parsed;
		try {
			parsed = parseFrontmatter(content);
		} catch (error) {
			errors.push({
				file: relativePath,
				message: error instanceof Error ? error.message : String(error),
			});
			continue;
		}

		const { body, data } = parsed;
		const sections = extractSections(body);
		const entryErrors = [];
		const entryWarnings = [];

		for (const key of requiredFrontmatter) {
			if (valueIsMissing(data[key])) {
				entryErrors.push(`missing required frontmatter: ${key}`);
			}
		}

		if (data.id !== undefined && typeof data.id !== 'string') {
			entryErrors.push('id must be a string');
		}
		if (data.createdAt !== undefined && typeof data.createdAt !== 'string') {
			entryErrors.push('createdAt must be a string');
		}
		if (data.source !== undefined && typeof data.source !== 'string') {
			entryErrors.push('source must be a string');
		}
		if (data.privacy !== undefined && typeof data.privacy !== 'string') {
			entryErrors.push('privacy must be a string');
		}
		if (typeof data.source === 'string' && !allowedSources.has(data.source)) {
			entryErrors.push(`invalid source: ${data.source}`);
		}
		if (typeof data.privacy === 'string' && !allowedPrivacy.has(data.privacy)) {
			entryErrors.push(`invalid privacy: ${data.privacy}`);
		}
		if (typeof data.createdAt === 'string') {
			try {
				getDatePart(data.createdAt);
			} catch {
				entryErrors.push('invalid createdAt timestamp');
			}
		}
		if (data.topics !== undefined && !Array.isArray(data.topics)) {
			entryErrors.push('topics must be an array');
		}
		if (
			Array.isArray(data.topics) &&
			data.topics.some((topic) => typeof topic !== 'string')
		) {
			entryErrors.push('topics must contain only strings');
		}
		for (const key of ['createJournal', 'updateWeekly']) {
			const error = validateBooleanLike(data[key], key);
			if (error) entryErrors.push(error);
		}

		for (const section of requiredSections) {
			if (!sections.has(section)) {
				entryErrors.push(`missing required section: ${section}`);
			}
		}

		for (const issueType of checkSensitiveContent(content)) {
			entryErrors.push(`possible sensitive information: ${issueType}`);
		}

		if (data.id && processedIds.has(data.id)) {
			entryWarnings.push(`id already exists in processed.json: ${data.id}`);
		}
		if (processedHashes.has(contentHash)) {
			entryWarnings.push('content hash already exists in processed.json');
		}
		if (data.id) {
			const existingPaths = pendingIdMap.get(data.id) ?? [];
			existingPaths.push(relativePath);
			pendingIdMap.set(data.id, existingPaths);
		}

		for (const message of entryErrors) errors.push({ file: relativePath, message });
		for (const message of entryWarnings) {
			warnings.push({ file: relativePath, message });
		}

		entries.push({
			content,
			contentHash,
			filePath,
			frontmatter: data,
			relativePath,
			sections,
		});
	}

	for (const [id, files] of pendingIdMap.entries()) {
		if (files.length <= 1) continue;

		for (const file of files) {
			errors.push({
				file,
				message: `duplicate pending id: ${id}`,
			});
		}
	}

	return {
		entries,
		errors,
		pendingFiles,
		processedHashes,
		processedIds,
		processedRecords,
		warnings,
	};
};

export const printValidationReport = (result) => {
	if (result.pendingFiles.length === 0) {
		console.log('No pending journal handoff files.');
	}

	for (const warning of result.warnings) {
		console.warn(`[warning] ${warning.file}: ${warning.message}`);
	}

	for (const error of result.errors) {
		console.error(`[error] ${error.file}: ${error.message}`);
	}

	if (result.errors.length === 0) {
		console.log(
			`Journal inbox validation passed (${result.pendingFiles.length} pending file(s), ${result.warnings.length} warning(s)).`,
		);
		return;
	}

	console.error(
		`Journal inbox validation failed (${result.errors.length} error(s), ${result.warnings.length} warning(s)).`,
	);
};

export const getDatePart = (dateLike) => {
	const dateText = String(dateLike);
	const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!match || Number.isNaN(Date.parse(dateText))) {
		throw new Error(`Invalid date: ${dateLike}`);
	}

	const [, yearText, monthText, dayText] = match;
	const year = Number(yearText);
	const month = Number(monthText);
	const day = Number(dayText);
	const utcDate = new Date(Date.UTC(year, month - 1, day));
	if (
		utcDate.getUTCFullYear() !== year ||
		utcDate.getUTCMonth() !== month - 1 ||
		utcDate.getUTCDate() !== day
	) {
		throw new Error(`Invalid date: ${dateLike}`);
	}

	return `${yearText}-${monthText}-${dayText}`;
};

export const getIsoWeek = (dateLike) => {
	const dateText = getDatePart(dateLike);
	const [year, month, day] = dateText.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	const dayOfWeek = date.getUTCDay() || 7;
	date.setUTCDate(date.getUTCDate() + 4 - dayOfWeek);

	const weekYear = date.getUTCFullYear();
	const yearStart = new Date(Date.UTC(weekYear, 0, 1));
	const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);

	return `${weekYear}-W${String(week).padStart(2, '0')}`;
};

export const slugify = (value, fallback = 'conversation') => {
	const fallbackSlug = String(fallback || 'conversation')
		.normalize('NFKC')
		.toLowerCase()
		.replace(/[\u0000-\u001f\u007f\\/]+/g, ' ')
		.replace(/\.\.+/g, ' ')
		.replace(/[^\p{Letter}\p{Number}]+/gu, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
	const slug = String(value ?? '')
		.normalize('NFKC')
		.trim()
		.toLowerCase()
		.replace(/[\u0000-\u001f\u007f\\/]+/g, ' ')
		.replace(/\.\.+/g, ' ')
		.replace(/[^\p{Letter}\p{Number}]+/gu, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);

	return slug || fallbackSlug || 'conversation';
};

export const markdownToDescription = (value) => {
	const text = String(value || '')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/^[-*]\s+/gm, '')
		.replace(/\s+/g, ' ')
		.trim();

	if (!text) return '尚未提供對話摘要，需人工補寫。';
	if (text.length <= 120) return text;

	return `${text.slice(0, 117).trim()}...`;
};

export const escapeYamlString = (value) =>
	String(value ?? '')
		.replaceAll('\\', '\\\\')
		.replaceAll('"', '\\"')
		.replace(/\r?\n/g, ' ');

export const boolValue = (value, defaultValue = true) => {
	if (value === undefined) return defaultValue;
	return value === true || value === 'true';
};
