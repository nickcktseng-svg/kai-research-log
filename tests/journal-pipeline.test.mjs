import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
	mkdtemp,
	mkdir,
	readFile,
	readdir,
	rm,
	stat,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const validateScript = join(repoRoot, 'scripts/validate-journal-inbox.mjs');
const generateScript = join(repoRoot, 'scripts/generate-journal-drafts.mjs');

const requiredSectionTitles = [
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

const yamlString = (value) => `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

const buildTopicsYaml = (topics) => {
	if (topics === 'inline') return 'topics: ["Astro", "文章分類與標籤", "Cloudflare"]';
	if (topics === 'empty') return 'topics: []';
	if (Array.isArray(topics) && topics.length === 0) return 'topics: []';
	if (Array.isArray(topics)) {
		return ['topics:', ...topics.map((topic) => `  - ${yamlString(topic)}`)].join('\n');
	}

	return 'topics: []';
};

const buildHandoff = ({
	id = 'conversation-20260805-001',
	createdAt = '2026-08-05T10:30:00+08:00',
	source = 'manual',
	sourceTitle = 'Astro: 分類與標籤整理',
	topics = ['Astro', '文章分類與標籤'],
	privacy = 'needs-review',
	createJournal = true,
	updateWeekly = true,
	omitId = false,
	sections = {},
	extraBody = '',
} = {}) => {
	const bodySections = requiredSectionTitles
		.map((title) => {
			const content =
				sections[title] ??
				({
					對話摘要: '本次整理 Astro 網站開發流程，包含分類、標籤與後續檢查。',
					本次目標: '- 確認 pipeline 可以產生安全草稿',
					完成事項: '- 完成分類與標籤入口檢查',
					'化學／計算化學內容': '',
					網頁開發內容: '- Astro Blog 的分類與標籤需要維持 draft 排除',
					重要決策: '- 自動產生內容一律保持 draft',
					遇到的問題: '- 需要避免重複檔名覆蓋',
					解決方式: '- 使用 conversation id 與 hash 作為穩定後綴',
					修改的檔案: '- scripts/generate-journal-drafts.mjs',
					待確認事項: '- 人工檢查草稿是否適合公開',
					下一步: '- 執行 validate、dry-run、test 與 build',
				}[title] ?? '');

			return `## ${title}\n\n${content}`;
		})
		.join('\n\n');

	return [
		'---',
		omitId ? null : `id: ${yamlString(id)}`,
		`createdAt: ${yamlString(createdAt)}`,
		`source: ${yamlString(source)}`,
		`sourceTitle: ${yamlString(sourceTitle)}`,
		buildTopicsYaml(topics),
		`privacy: ${yamlString(privacy)}`,
		`createJournal: ${createJournal}`,
		`updateWeekly: ${updateWeekly}`,
		'---',
		'',
		bodySections,
		extraBody,
	]
		.filter((line) => line !== null)
		.join('\n');
};

const createTempRoot = async (t) => {
	const root = await mkdtemp(join(tmpdir(), 'journal-pipeline-test-'));
	t.after(() => rm(root, { recursive: true, force: true }));

	await mkdir(join(root, 'journal-inbox/pending'), { recursive: true });
	await mkdir(join(root, 'journal-inbox/processed'), { recursive: true });
	await mkdir(join(root, 'src/content/blog/generated'), { recursive: true });
	await mkdir(join(root, 'src/data'), { recursive: true });
	await writeFile(join(root, 'journal-inbox/processed.json'), '[]\n');
	await writeFile(join(root, 'src/data/generated-weekly-report-drafts.json'), '[]\n');
	await writeFile(join(root, 'src/data/weekly-reports.json'), '[{"id":"formal"}]\n');

	return root;
};

const writePending = async (root, fileName, content) => {
	const filePath = join(root, 'journal-inbox/pending', fileName);
	await writeFile(filePath, content);
	return filePath;
};

const runScript = (script, root, args = []) =>
	spawnSync(process.execPath, [script, ...args], {
		cwd: repoRoot,
		encoding: 'utf8',
		env: {
			...process.env,
			JOURNAL_PIPELINE_ROOT: root,
		},
	});

const runValidate = (root) => runScript(validateScript, root);
const runGenerate = (root, args = []) => runScript(generateScript, root, args);

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const sha256 = (content) => createHash('sha256').update(content, 'utf8').digest('hex');

test('valid handoff frontmatter supports colon strings, arrays, empty arrays, booleans, and timezone', async (t) => {
	const root = await createTempRoot(t);
	await writePending(
		root,
		'valid.md',
		buildHandoff({
			sourceTitle: 'Astro: 分類: 標籤檢查',
			topics: 'inline',
			createJournal: false,
			updateWeekly: false,
		}),
	);

	const result = runValidate(root);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /validation passed/);

	await writePending(
		root,
		'valid-empty-array.md',
		buildHandoff({
			id: 'conversation-20260805-002',
			topics: 'empty',
			privacy: 'public-safe',
		}),
	);
	const secondResult = runValidate(root);
	assert.equal(secondResult.status, 0, secondResult.stderr);
});

test('missing id, invalid source, and invalid privacy fail validation clearly', async (t) => {
	const root = await createTempRoot(t);
	await writePending(root, 'missing-id.md', buildHandoff({ omitId: true }));
	await writePending(
		root,
		'invalid-source.md',
		buildHandoff({ id: 'conversation-invalid-source', source: 'browser' }),
	);
	await writePending(
		root,
		'invalid-privacy.md',
		buildHandoff({ id: 'conversation-invalid-privacy', privacy: 'shared' }),
	);

	const result = runValidate(root);
	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /missing required frontmatter: id/);
	assert.match(result.stderr, /invalid source: browser/);
	assert.match(result.stderr, /invalid privacy: shared/);
});

test('privacy private is skipped without generating, moving, or recording content', async (t) => {
	const root = await createTempRoot(t);
	await writePending(
		root,
		'private.md',
		buildHandoff({ privacy: 'private', sections: { 對話摘要: '私人摘要不應輸出。' } }),
	);

	const result = runGenerate(root);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /已跳過 private/);
	assert.equal((await readdir(join(root, 'src/content/blog/generated'))).length, 0);
	assert.equal((await readdir(join(root, 'journal-inbox/pending'))).length, 1);
	assert.deepEqual(await readJson(join(root, 'journal-inbox/processed.json')), []);
	assert.deepEqual(await readJson(join(root, 'src/data/generated-weekly-report-drafts.json')), []);
	assert.doesNotMatch(result.stdout, /私人摘要/);
});

test('sensitive content is blocked without printing complete secret-like values', async (t) => {
	const root = await createTempRoot(t);
	const fakeGithubToken = ['ghp', 'FAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE'].join('_');
	const fakeBearer = ['Bearer', 'FAKE_BEARER_VALUE_1234567890'].join(' ');
	const fakeOpenAiVariable = ['OPENAI_API', 'KEY=TEST_VALUE_DO_NOT_USE'].join('_');
	const fakeCloudflareVariable = ['CLOUDFLARE_API', 'TOKEN=TEST_VALUE_DO_NOT_USE'].join('_');
	const fakePassword = ['password', 'TEST_VALUE_DO_NOT_USE'].join('=');
	const fakeSecret = ['secret', 'TEST_VALUE_DO_NOT_USE'].join('=');
	const sensitiveBody = [
		'BEGIN PRIVATE KEY',
		fakeGithubToken,
		fakeBearer,
		fakeOpenAiVariable,
		fakeCloudflareVariable,
		fakePassword,
		fakeSecret,
		['SSH_PRIVATE', 'KEY=TEST_VALUE_DO_NOT_USE'].join('_'),
	].join('\n');
	await writePending(root, 'sensitive.md', buildHandoff({ extraBody: sensitiveBody }));

	const result = runGenerate(root);
	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /possible sensitive information/);
	assert.doesNotMatch(result.stderr, /TEST_VALUE_DO_NOT_USE/);
	assert.doesNotMatch(result.stderr, /FAKEFAKEFAKE/);
	assert.equal((await readdir(join(root, 'src/content/blog/generated'))).length, 0);
	assert.equal((await readdir(join(root, 'journal-inbox/pending'))).length, 1);
	assert.deepEqual(await readJson(join(root, 'journal-inbox/processed.json')), []);
});

test('dry-run does not write Blog, weekly draft, processed record, or move pending files', async (t) => {
	const root = await createTempRoot(t);
	await writePending(root, 'dry-run.md', buildHandoff());
	const weeklyBefore = await readFile(
		join(root, 'src/data/generated-weekly-report-drafts.json'),
		'utf8',
	);
	const processedBefore = await readFile(join(root, 'journal-inbox/processed.json'), 'utf8');

	const result = runGenerate(root, ['--dry-run']);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /Dry run only/);
	assert.equal((await readdir(join(root, 'src/content/blog/generated'))).length, 0);
	assert.equal((await readdir(join(root, 'journal-inbox/pending'))).length, 1);
	assert.equal(
		await readFile(join(root, 'src/data/generated-weekly-report-drafts.json'), 'utf8'),
		weeklyBefore,
	);
	assert.equal(await readFile(join(root, 'journal-inbox/processed.json'), 'utf8'), processedBefore);
});

test('processed id and processed content hash are skipped instead of duplicated', async (t) => {
	const root = await createTempRoot(t);
	const content = buildHandoff({ id: 'conversation-duplicate-hash' });
	await writePending(root, 'already-id.md', buildHandoff({ id: 'conversation-already-id' }));
	await writePending(root, 'already-hash.md', content);
	await writeFile(
		join(root, 'journal-inbox/processed.json'),
		JSON.stringify(
			[
				{
					id: 'conversation-already-id',
					sourceFile: 'journal-inbox/processed/already-id.md',
					contentHash: 'a'.repeat(64),
					processedAt: '2026-08-05T00:00:00.000Z',
					journalDraft: null,
					weeklyDraftWeek: null,
				},
				{
					id: 'conversation-previous-hash',
					sourceFile: 'journal-inbox/processed/already-hash.md',
					contentHash: sha256(content),
					processedAt: '2026-08-05T00:00:00.000Z',
					journalDraft: null,
					weeklyDraftWeek: null,
				},
			],
			null,
			2,
		),
	);

	const result = runGenerate(root);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /已處理過的 id 或 content hash/);
	assert.equal((await readdir(join(root, 'src/content/blog/generated'))).length, 0);
	assert.equal((await readdir(join(root, 'journal-inbox/pending'))).length, 2);
});

test('duplicate pending id fails validation', async (t) => {
	const root = await createTempRoot(t);
	await writePending(root, 'a.md', buildHandoff({ id: 'conversation-duplicate-id' }));
	await writePending(root, 'b.md', buildHandoff({ id: 'conversation-duplicate-id' }));

	const result = runValidate(root);
	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /duplicate pending id: conversation-duplicate-id/);
});

test('same-day matching slugs do not overwrite each other and generated Blog remains draft', async (t) => {
	const root = await createTempRoot(t);
	await writePending(
		root,
		'a.md',
		buildHandoff({
			id: 'conversation-slug-a',
			sourceTitle: '相同標題',
			createdAt: '2026-08-05T09:00:00+08:00',
		}),
	);
	await writePending(
		root,
		'b.md',
		buildHandoff({
			id: 'conversation-slug-b',
			sourceTitle: '相同標題',
			createdAt: '2026-08-05T11:00:00+08:00',
		}),
	);

	const result = runGenerate(root);
	assert.equal(result.status, 0, result.stderr);
	const generatedFiles = await readdir(join(root, 'src/content/blog/generated'));
	assert.equal(generatedFiles.length, 2);
	assert.equal(new Set(generatedFiles).size, 2);

	for (const file of generatedFiles) {
		const content = await readFile(join(root, 'src/content/blog/generated', file), 'utf8');
		assert.match(content, /draft: true/);
		assert.match(content, /generated: true/);
		assert.match(content, /reviewStatus: "needs-review"/);
		assert.match(content, /sourceConversationIds:/);
	}
});

test('weekly drafts merge same-week content, remove duplicate strings, and preserve formal weekly-reports.json', async (t) => {
	const root = await createTempRoot(t);
	const formalBefore = await readFile(join(root, 'src/data/weekly-reports.json'), 'utf8');
	await writePending(
		root,
		'one.md',
		buildHandoff({
			id: 'conversation-weekly-one',
			createdAt: '2026-08-05T09:00:00+08:00',
			sections: {
				完成事項: '- 完成分類與標籤入口檢查',
				下一步: '- 補上測試',
			},
		}),
	);
	await writePending(
		root,
		'two.md',
		buildHandoff({
			id: 'conversation-weekly-two',
			createdAt: '2026-08-06T09:00:00+08:00',
			sections: {
				完成事項: '- 完成分類與標籤入口檢查\n- 加入 journal:test',
				下一步: '- 補上測試',
			},
		}),
	);

	const result = runGenerate(root);
	assert.equal(result.status, 0, result.stderr);
	assert.equal(await readFile(join(root, 'src/data/weekly-reports.json'), 'utf8'), formalBefore);
	const drafts = await readJson(join(root, 'src/data/generated-weekly-report-drafts.json'));
	assert.equal(drafts.length, 1);
	assert.equal(drafts[0].week, '2026-W32');
	assert.deepEqual(drafts[0].sourceConversationIds.sort(), [
		'conversation-weekly-one',
		'conversation-weekly-two',
	]);
	assert.equal(
		drafts[0].completed.filter((item) => item === '完成分類與標籤入口檢查').length,
		1,
	);
	assert.equal(drafts[0].reviewStatus, 'needs-review');
	assert.match(drafts[0].generatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('ISO week uses the handoff createdAt date and handles cross-year dates', async () => {
	const utilsUrl = pathToFileURL(join(repoRoot, 'scripts/journal-pipeline-utils.mjs')).href;
	const { getIsoWeek } = await import(`${utilsUrl}?iso-week-test=${Date.now()}`);

	assert.equal(getIsoWeek('2024-12-30T00:30:00+08:00'), '2025-W01');
	assert.equal(getIsoWeek('2027-01-01T00:30:00+08:00'), '2026-W53');
	assert.equal(getIsoWeek('2026-01-01T00:30:00+08:00'), '2026-W01');
	assert.equal(getIsoWeek('2026-01-01T00:30:00Z'), '2026-W01');
	assert.equal(getIsoWeek('2021-01-01T12:00:00Z'), '2020-W53');
});

test('generate failure before output keeps pending source unmoved and processed untouched', async (t) => {
	const root = await createTempRoot(t);
	await writePending(root, 'failure.md', buildHandoff());
	await writeFile(join(root, 'src/data/generated-weekly-report-drafts.json'), '{ broken json');

	const result = runGenerate(root);
	assert.notEqual(result.status, 0);
	assert.equal((await readdir(join(root, 'journal-inbox/pending'))).length, 1);
	assert.equal((await readdir(join(root, 'journal-inbox/processed'))).length, 0);
	assert.equal((await readdir(join(root, 'src/content/blog/generated'))).length, 0);
	assert.deepEqual(await readJson(join(root, 'journal-inbox/processed.json')), []);
});

test('end-to-end simulation writes draft Blog, weekly draft, processed record, and moves source', async (t) => {
	const root = await createTempRoot(t);
	await writePending(
		root,
		'e2e.md',
		buildHandoff({
			id: 'conversation-e2e-001',
			createdAt: '2026-08-05T15:20:00+08:00',
			sourceTitle: 'Astro: Blog 分類與標籤端到端檢查',
			topics: ['Astro', '文章分類與標籤', 'Cloudflare'],
			sections: {
				遇到的問題: '- 搜尋與分類篩選需要一起運作',
				解決方式: '- 統一透過同一個可見性更新函式處理',
				下一步: '- 人工審查 generated Blog 草稿',
			},
		}),
	);

	const result = runGenerate(root);
	assert.equal(result.status, 0, result.stderr);
	const generatedFiles = await readdir(join(root, 'src/content/blog/generated'));
	assert.equal(generatedFiles.length, 1);
	const generated = await readFile(
		join(root, 'src/content/blog/generated', generatedFiles[0]),
		'utf8',
	);
	assert.match(generated, /draft: true/);
	assert.match(generated, /generated: true/);
	assert.match(generated, /sourceConversationIds:\n  - "conversation-e2e-001"/);

	const drafts = await readJson(join(root, 'src/data/generated-weekly-report-drafts.json'));
	assert.equal(drafts.length, 1);
	assert.equal(drafts[0].week, '2026-W32');
	assert.deepEqual(drafts[0].sourceConversationIds, ['conversation-e2e-001']);

	const processed = await readJson(join(root, 'journal-inbox/processed.json'));
	assert.equal(processed.length, 1);
	assert.equal(processed[0].id, 'conversation-e2e-001');
	assert.match(processed[0].sourceFile, /^journal-inbox\/processed\//);
	assert.match(processed[0].journalDraft, /^src\/content\/blog\/generated\//);
	assert.equal(processed[0].weeklyDraftWeek, '2026-W32');
	assert.match(processed[0].processedAt, /^\d{4}-\d{2}-\d{2}T/);
	await stat(join(root, processed[0].sourceFile));
	assert.equal((await readdir(join(root, 'journal-inbox/pending'))).length, 0);
});
