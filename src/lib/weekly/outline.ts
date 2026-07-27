import type { JournalEntry, TaskWithTags } from '../../types/database';

export type WeeklyOutline = {
	week: string;
	dateRange: string;
	title: string;
	summary: string;
	completed: string[];
	progress: string[];
	problems: string[];
	solutions: string[];
	unfinished: string[];
	next: string[];
	categories: string[];
	tags: string[];
};

const unique = (items: string[]): string[] =>
	items
		.map((item) => item.trim())
		.filter((item, index, list) => item && list.indexOf(item) === index);

export const getIsoWeek = (date: Date): string => {
	const utcDate = new Date(
		Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
	);
	const dayNumber = utcDate.getUTCDay() || 7;
	utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
	const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
	const weekNumber = Math.ceil(
		((utcDate.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
	);

	return `${utcDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
};

const getDateRange = (week: string): { start: string; end: string } => {
	const match = week.match(/^(\d{4})-W(\d{2})$/);
	if (!match) {
		const today = new Date().toISOString().slice(0, 10);
		return { start: today, end: today };
	}

	const year = Number(match[1]);
	const weekNumber = Number(match[2]);
	const januaryFourth = new Date(Date.UTC(year, 0, 4));
	const januaryFourthDay = januaryFourth.getUTCDay() || 7;
	const monday = new Date(januaryFourth);
	monday.setUTCDate(januaryFourth.getUTCDate() - januaryFourthDay + 1 + (weekNumber - 1) * 7);
	const sunday = new Date(monday);
	sunday.setUTCDate(monday.getUTCDate() + 6);

	return {
		start: monday.toISOString().slice(0, 10),
		end: sunday.toISOString().slice(0, 10),
	};
};

const taskBelongsToWeek = (
	task: TaskWithTags,
	week: string,
	start: string,
	end: string,
): boolean => {
	if (task.week === week) return true;
	if (!task.task_date) return false;

	return task.task_date >= start && task.task_date <= end;
};

const journalBelongsToWeek = (
	entry: JournalEntry,
	start: string,
	end: string,
): boolean => entry.entry_date >= start && entry.entry_date <= end;

const describeTask = (task: TaskWithTags): string => {
	const meta = [task.category, task.priority === 'high' ? '高優先' : '']
		.filter(Boolean)
		.join('，');
	return meta ? `${task.title}（${meta}）` : task.title;
};

export const buildWeeklyOutline = ({
	journals,
	now = new Date(),
	tasks,
	week = getIsoWeek(now),
}: {
	journals: JournalEntry[];
	now?: Date;
	tasks: TaskWithTags[];
	week?: string;
}): WeeklyOutline => {
	const range = getDateRange(week);
	const weekTasks = tasks.filter((task) =>
		taskBelongsToWeek(task, week, range.start, range.end),
	);
	const weekJournals = journals.filter((entry) =>
		journalBelongsToWeek(entry, range.start, range.end),
	);

	const completedTasks = weekTasks
		.filter((task) => task.status === 'done')
		.map(describeTask);
	const doingTasks = weekTasks
		.filter((task) => task.status === 'doing')
		.map(describeTask);
	const todoTasks = weekTasks
		.filter((task) => task.status === 'todo')
		.map(describeTask);
	const highPendingTasks = weekTasks
		.filter((task) => task.priority === 'high' && task.status !== 'done')
		.map(describeTask);

	const journalSummaries = weekJournals.map((entry) =>
		entry.summary ? `${entry.title}：${entry.summary}` : entry.title,
	);

	const completed = completedTasks.length
		? completedTasks
		: ['本週尚未標記完成任務，可從任務管理頁更新完成狀態。'];
	const progress = unique([...doingTasks, ...journalSummaries]).slice(0, 6);
	const unfinished = todoTasks.length
		? todoTasks
		: ['目前沒有本週未開始任務。'];
	const next = highPendingTasks.length
		? highPendingTasks
		: todoTasks.length
			? todoTasks.slice(0, 3)
			: ['從本週日誌挑選下一個可執行的小任務。'];

	const categories = unique([
		...weekTasks.map((task) => task.category),
		...weekJournals.map((entry) => entry.category),
	]);
	const tags = unique([
		...weekTasks.flatMap((task) => task.tags),
		...weekJournals.flatMap((entry) => entry.tags),
	]);

	return {
		week,
		dateRange: `${range.start} ~ ${range.end}`,
		title: `${week} 自動週報大綱`,
		summary:
			weekTasks.length || weekJournals.length
				? `本週共有 ${completedTasks.length} 項完成任務、${doingTasks.length} 項進行中任務，並整理 ${weekJournals.length} 篇研究日誌。`
				: '本週尚未累積任務或研究日誌，新增內容後這裡會自動整理大綱。',
		completed,
		progress: progress.length ? progress : ['目前沒有進行中任務或本週日誌摘要。'],
		problems:
			highPendingTasks.length > 0
				? ['高優先任務尚未完成，週末回顧時可優先拆解阻礙。']
				: ['尚未從任務或日誌中偵測到明確問題。'],
		solutions:
			weekJournals.length > 0
				? ['回到本週日誌補齊關鍵決策、計算條件與後續驗證方式。']
				: ['新增研究日誌後，可把解法與判斷依據整理進週報。'],
		unfinished,
		next,
		categories,
		tags,
	};
};
