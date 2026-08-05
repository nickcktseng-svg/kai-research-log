import {
	existsSync,
	renameSync,
	writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';
import {
	boolValue,
	ensureDir,
	escapeYamlString,
	getIsoWeek,
	markdownToDescription,
	paths,
	printValidationReport,
	readJsonArray,
	rootDir,
	slugify,
	splitSectionItems,
	toRelativePath,
	uniqueStrings,
	validateInbox,
	writeJsonArray,
} from './journal-pipeline-utils.mjs';

const dryRun = process.argv.includes('--dry-run');

const normalizeTopics = (value) =>
	Array.isArray(value)
		? uniqueStrings(value.map((item) => String(item).trim()).filter(Boolean))
		: [];

const yamlArray = (key, items) => {
	if (items.length === 0) return `${key}: []`;

	return [
		`${key}:`,
		...items.map((item) => `  - "${escapeYamlString(item)}"`),
	].join('\n');
};

const classifyCategory = (topics) => {
	const source = topics.join(' ').toLowerCase();
	const hasChem = [
		'化學',
		'計算化學',
		'vasp',
		'dft',
		'ase',
		'hpc',
		'slab',
		'slab builder',
		'實驗',
		'研究流程',
	].some((term) => source.includes(term.toLowerCase()));
	const hasWeb = [
		'網頁',
		'網站',
		'astro',
		'cloudflare',
		'github',
		'資料庫',
		'database',
		'api',
	].some((term) => source.includes(term.toLowerCase()));

	if (hasChem && hasWeb) return '研究工具開發';
	if (hasChem) return '計算化學';
	if (hasWeb) return '網站開發';

	return '研究紀錄';
};

const addSection = (parts, title, content) => {
	const trimmed = String(content || '').trim();
	if (!trimmed) return;

	parts.push(`${title}\n\n${trimmed}`);
};

const uniqueOutputPath = (directory, fileName) => {
	const extensionIndex = fileName.lastIndexOf('.');
	const base = extensionIndex === -1 ? fileName : fileName.slice(0, extensionIndex);
	const extension = extensionIndex === -1 ? '' : fileName.slice(extensionIndex);
	let candidate = join(directory, fileName);
	let suffix = 2;

	while (existsSync(candidate)) {
		candidate = join(directory, `${base}-${suffix}${extension}`);
		suffix += 1;
	}

	return candidate;
};

const buildJournalDraft = (entry) => {
	const { frontmatter, sections } = entry;
	const date = String(frontmatter.createdAt).slice(0, 10);
	const dateSlug = date.replaceAll('-', '');
	const topics = normalizeTopics(frontmatter.topics);
	const category = classifyCategory(topics);
	const title =
		String(frontmatter.sourceTitle || '').trim() ||
		`對話整理：${topics[0] || date}`;
	const description = markdownToDescription(sections.get('對話摘要') || '');
	const slug = slugify(title, slugify(frontmatter.id, 'conversation'));
	const fileName = `${dateSlug}-${slug}.md`;
	const outputPath = uniqueOutputPath(paths.blogGenerated, fileName);

	const bodyParts = [
		[
			'> 這份草稿由 Conversation Journal Pipeline v1 依據 handoff 摘要產生。',
			'> 發布前請人工檢查；`draft: true` 不代表 GitHub Repository 中的檔案是私密的。',
		].join('\n'),
	];

	if (frontmatter.privacy === 'needs-review') {
		bodyParts.push(
			'> 來源隱私狀態為 `needs-review`，所有內容都需要人工確認後才可發布。',
		);
	}

	addSection(bodyParts, '# 本次目標', sections.get('本次目標'));
	addSection(bodyParts, '# 完成事項', sections.get('完成事項'));

	const chemistryContent = sections.get('化學／計算化學內容');
	const webContent = sections.get('網頁開發內容');
	if (chemistryContent || webContent) {
		const learningParts = ['# 學到的內容'];
		addSection(learningParts, '## 化學／計算化學', chemistryContent);
		addSection(learningParts, '## 網頁開發', webContent);
		bodyParts.push(learningParts.join('\n\n'));
	}

	addSection(bodyParts, '# 重要決策', sections.get('重要決策'));
	addSection(bodyParts, '# 遇到的問題', sections.get('遇到的問題'));
	addSection(bodyParts, '# 解決方式', sections.get('解決方式'));
	addSection(bodyParts, '# 待確認事項', sections.get('待確認事項'));
	addSection(bodyParts, '# 下一步', sections.get('下一步'));

	const frontmatterText = [
		'---',
		`title: "${escapeYamlString(title)}"`,
		`description: "${escapeYamlString(description)}"`,
		`pubDate: "${date}"`,
		`category: "${escapeYamlString(category)}"`,
		yamlArray('tags', topics),
		'draft: true',
		'generated: true',
		'reviewStatus: "needs-review"',
		yamlArray('sourceConversationIds', [frontmatter.id]),
		'---',
	].join('\n');

	return {
		category,
		content: `${frontmatterText}\n\n${bodyParts.join('\n\n')}\n`,
		description,
		outputPath,
		relativeOutputPath: toRelativePath(outputPath),
		title,
	};
};

const createWeeklyItems = (entry) => {
	const { sections } = entry;

	return {
		completed: splitSectionItems(sections.get('完成事項') || ''),
		progress: [
			...splitSectionItems(sections.get('化學／計算化學內容') || ''),
			...splitSectionItems(sections.get('網頁開發內容') || ''),
			...splitSectionItems(sections.get('重要決策') || ''),
		],
		problems: splitSectionItems(sections.get('遇到的問題') || ''),
		solutions: splitSectionItems(sections.get('解決方式') || ''),
		unfinished: splitSectionItems(sections.get('待確認事項') || ''),
		next: splitSectionItems(sections.get('下一步') || ''),
	};
};

const ensureWeeklyDraftShape = (draft, week) => ({
	id: draft.id || `weekly-draft-${week}`,
	week,
	sourceConversationIds: Array.isArray(draft.sourceConversationIds)
		? draft.sourceConversationIds
		: [],
	completed: Array.isArray(draft.completed) ? draft.completed : [],
	progress: Array.isArray(draft.progress) ? draft.progress : [],
	problems: Array.isArray(draft.problems) ? draft.problems : [],
	solutions: Array.isArray(draft.solutions) ? draft.solutions : [],
	unfinished: Array.isArray(draft.unfinished) ? draft.unfinished : [],
	next: Array.isArray(draft.next) ? draft.next : [],
	reviewStatus: 'needs-review',
	generatedAt: draft.generatedAt || new Date().toISOString(),
});

const mergeWeeklyDraft = (drafts, entry, generatedAt) => {
	const week = getIsoWeek(entry.frontmatter.createdAt);
	const existingIndex = drafts.findIndex((draft) => draft.week === week);
	const baseDraft =
		existingIndex >= 0
			? ensureWeeklyDraftShape(drafts[existingIndex], week)
			: ensureWeeklyDraftShape({}, week);
	const items = createWeeklyItems(entry);

	const mergedDraft = {
		...baseDraft,
		sourceConversationIds: uniqueStrings([
			...baseDraft.sourceConversationIds,
			entry.frontmatter.id,
		]),
		completed: uniqueStrings([...baseDraft.completed, ...items.completed]),
		progress: uniqueStrings([...baseDraft.progress, ...items.progress]),
		problems: uniqueStrings([...baseDraft.problems, ...items.problems]),
		solutions: uniqueStrings([...baseDraft.solutions, ...items.solutions]),
		unfinished: uniqueStrings([...baseDraft.unfinished, ...items.unfinished]),
		next: uniqueStrings([...baseDraft.next, ...items.next]),
		reviewStatus: 'needs-review',
		generatedAt,
	};

	if (existingIndex >= 0) {
		drafts[existingIndex] = mergedDraft;
	} else {
		drafts.push(mergedDraft);
	}

	return week;
};

const uniqueProcessedPath = (sourcePath) => {
	const originalName = basename(sourcePath);
	const extensionIndex = originalName.lastIndexOf('.');
	const base =
		extensionIndex === -1 ? originalName : originalName.slice(0, extensionIndex);
	const extension = extensionIndex === -1 ? '' : originalName.slice(extensionIndex);
	let candidate = join(paths.processed, originalName);
	let suffix = 2;

	while (existsSync(candidate)) {
		candidate = join(paths.processed, `${base}-${suffix}${extension}`);
		suffix += 1;
	}

	return candidate;
};

const result = validateInbox();
printValidationReport(result);

if (result.errors.length > 0) {
	process.exit(1);
}

let weeklyDrafts = [];
try {
	weeklyDrafts = readJsonArray(paths.weeklyDrafts, 'generated-weekly-report-drafts.json');
} catch (error) {
	console.error(
		`[error] src/data/generated-weekly-report-drafts.json: ${
			error instanceof Error ? error.message : String(error)
		}`,
	);
	process.exit(1);
}

const generatedAt = new Date().toISOString();
const processedRecords = [...result.processedRecords];
const actions = [];
const seenProcessedHashes = new Set(result.processedHashes);
const seenProcessedIds = new Set(result.processedIds);
let weeklyDraftsChanged = false;

for (const entry of result.entries) {
	const { frontmatter } = entry;

	if (frontmatter.privacy === 'private') {
		actions.push({
			file: entry.relativePath,
			reason: 'privacy is private',
			type: 'skip',
		});
		continue;
	}

	if (
		seenProcessedIds.has(frontmatter.id) ||
		seenProcessedHashes.has(entry.contentHash)
	) {
		actions.push({
			file: entry.relativePath,
			reason: 'already processed id or content hash',
			type: 'skip',
		});
		continue;
	}

	let journalDraft = null;
	let weeklyDraftWeek = null;

	if (boolValue(frontmatter.createJournal, true)) {
		const draft = buildJournalDraft(entry);
		journalDraft = draft.relativeOutputPath;
		actions.push({
			file: entry.relativePath,
			output: journalDraft,
			title: draft.title,
			type: 'journal',
		});

		if (!dryRun) {
			ensureDir(paths.blogGenerated);
			writeFileSync(draft.outputPath, draft.content);
		}
	}

	if (boolValue(frontmatter.updateWeekly, true)) {
		weeklyDraftWeek = mergeWeeklyDraft(weeklyDrafts, entry, generatedAt);
		weeklyDraftsChanged = true;
		actions.push({
			file: entry.relativePath,
			type: 'weekly',
			week: weeklyDraftWeek,
		});
	}

	if (!dryRun) {
		ensureDir(paths.processed);
		const processedPath = uniqueProcessedPath(entry.filePath);
		renameSync(entry.filePath, processedPath);
		processedRecords.push({
			id: frontmatter.id,
			sourceFile: toRelativePath(processedPath),
			contentHash: entry.contentHash,
			processedAt: generatedAt,
			journalDraft,
			weeklyDraftWeek,
		});
	}

	seenProcessedIds.add(frontmatter.id);
	seenProcessedHashes.add(entry.contentHash);
}

if (!dryRun && weeklyDraftsChanged) {
	ensureDir(join(rootDir, 'src/data'));
	writeJsonArray(
		paths.weeklyDrafts,
		weeklyDrafts.sort((a, b) => a.week.localeCompare(b.week)),
	);
}

if (!dryRun) {
	writeJsonArray(paths.processedJson, processedRecords);
}

if (dryRun) {
	console.log('Dry run only. No files were written or moved.');
}

if (actions.length === 0) {
	console.log('No journal inbox entries to process.');
} else {
	for (const action of actions) {
		if (action.type === 'skip') {
			console.log(`[skip] ${action.file}: ${action.reason}`);
		}
		if (action.type === 'journal') {
			console.log(`[journal] ${action.file} -> ${action.output}`);
		}
		if (action.type === 'weekly') {
			console.log(`[weekly] ${action.file} -> ${action.week}`);
		}
	}
}
