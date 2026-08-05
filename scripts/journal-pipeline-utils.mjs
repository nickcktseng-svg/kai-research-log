import { createHash } from 'node:crypto';
import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
	{ type: 'api-key-keyword', pattern: /\bAPI[\s_-]*key\b/i },
	{ type: 'bearer-token-keyword', pattern: /\bBearer\s+token\b/i },
	{ type: 'password-keyword', pattern: /\bpassword\b/i },
	{ type: 'secret-keyword', pattern: /\bsecret\b/i },
	{ type: 'github-token-keyword', pattern: /\bGitHub\s+token\b/i },
	{ type: 'cloudflare-token-keyword', pattern: /\bCloudflare\s+token\b/i },
	{ type: 'openai-api-key-variable', pattern: /\bOPENAI_API_KEY\b/ },
	{ type: 'ssh-private-key-variable', pattern: /\bSSH_PRIVATE_KEY\b/ },
];

export const toRelativePath = (path) => relative(rootDir, path).replaceAll('\\', '/');

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

export const writeJsonArray = (path, value) => {
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

const parseScalar = (value) => {
	const trimmed = value.trim();

	if (trimmed === '[]') return [];
	if (trimmed === 'true') return true;
	if (trimmed === 'false') return false;
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1);
	}
	if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
		const inside = trimmed.slice(1, -1).trim();
		if (!inside) return [];

		return inside
			.split(',')
			.map((item) => parseScalar(item))
			.filter((item) => typeof item === 'string' && item.trim().length > 0);
	}

	return trimmed;
};

export const parseFrontmatter = (content) => {
	const lines = content.split(/\r?\n/);
	if (lines[0]?.trim() !== '---') {
		throw new Error('missing frontmatter block');
	}

	const endIndex = lines.findIndex(
		(line, index) => index > 0 && line.trim() === '---',
	);
	if (endIndex === -1) {
		throw new Error('unterminated frontmatter block');
	}

	const frontmatterLines = lines.slice(1, endIndex);
	const data = {};

	for (let index = 0; index < frontmatterLines.length; index++) {
		const line = frontmatterLines[index];
		if (!line.trim() || line.trim().startsWith('#')) continue;

		const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$/);
		if (!match) continue;

		const [, key, rawValue = ''] = match;
		if (rawValue.trim() === '') {
			const blockItems = [];
			while (index + 1 < frontmatterLines.length) {
				const nextLine = frontmatterLines[index + 1];
				const itemMatch = nextLine.match(/^\s*-\s*(.*)$/);
				if (!itemMatch) break;

				blockItems.push(parseScalar(itemMatch[1]));
				index++;
			}

			data[key] = blockItems;
			continue;
		}

		data[key] = parseScalar(rawValue);
	}

	return {
		body: lines.slice(endIndex + 1).join('\n'),
		data,
	};
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

export const uniqueStrings = (items) => Array.from(new Set(items.filter(Boolean)));

export const sha256 = (content) =>
	createHash('sha256').update(content, 'utf8').digest('hex');

export const listPendingFiles = () => {
	if (!existsSync(paths.pending)) return [];

	return readdirSync(paths.pending)
		.filter((file) => file.endsWith('.md'))
		.map((file) => join(paths.pending, file))
		.filter((path) => statSync(path).isFile())
		.sort((a, b) => a.localeCompare(b));
};

const checkSensitiveContent = (content) =>
	sensitivePatterns
		.filter(({ pattern }) => pattern.test(content))
		.map(({ type }) => type);

const validateRecordShape = (record, index) => {
	const errors = [];
	if (!record || typeof record !== 'object') {
		errors.push(`processed.json entry ${index} must be an object.`);
		return errors;
	}
	if (!record.id) errors.push(`processed.json entry ${index} is missing id.`);
	if (!record.contentHash) {
		errors.push(`processed.json entry ${index} is missing contentHash.`);
	}

	return errors;
};

export const validateInbox = () => {
	const errors = [];
	const warnings = [];
	let processedRecords = [];

	try {
		processedRecords = readJsonArray(paths.processedJson, 'processed.json');
		processedRecords.forEach((record, index) => {
			for (const error of validateRecordShape(record, index)) {
				errors.push({ file: 'journal-inbox/processed.json', message: error });
			}
		});
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
			if (data[key] === undefined || data[key] === '') {
				entryErrors.push(`missing required frontmatter: ${key}`);
			}
		}

		if (data.source && !allowedSources.has(data.source)) {
			entryErrors.push(`invalid source: ${data.source}`);
		}
		if (data.privacy && !allowedPrivacy.has(data.privacy)) {
			entryErrors.push(`invalid privacy: ${data.privacy}`);
		}
		if (data.createdAt && Number.isNaN(Date.parse(data.createdAt))) {
			entryErrors.push('invalid createdAt timestamp');
		}
		if (data.topics !== undefined && !Array.isArray(data.topics)) {
			entryErrors.push('topics must be an array');
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

export const getIsoWeek = (dateLike) => {
	const dateText = String(dateLike).slice(0, 10);
	const [year, month, day] = dateText.split('-').map(Number);
	if (!year || !month || !day) {
		throw new Error(`Invalid date for ISO week: ${dateLike}`);
	}

	const date = new Date(Date.UTC(year, month - 1, day));
	const dayOfWeek = date.getUTCDay() || 7;
	date.setUTCDate(date.getUTCDate() + 4 - dayOfWeek);

	const weekYear = date.getUTCFullYear();
	const yearStart = new Date(Date.UTC(weekYear, 0, 1));
	const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);

	return `${weekYear}-W${String(week).padStart(2, '0')}`;
};

export const slugify = (value, fallback = 'conversation') => {
	const slug = String(value)
		.trim()
		.toLowerCase()
		.replace(/[^\p{Letter}\p{Number}]+/gu, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);

	return slug || fallback;
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
