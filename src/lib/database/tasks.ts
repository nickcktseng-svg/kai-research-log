import type { DatabaseTask, TaskWithTags } from '../../types/database';

type TaskTagRow = {
	task_id: string;
	tag: string;
};

export const listDatabaseTasks = async (db: D1Database): Promise<TaskWithTags[]> => {
	const [tasksResult, tagsResult] = await db.batch([
		db
			.prepare(
				`SELECT *
				FROM tasks
				ORDER BY COALESCE(task_date, week, created_at) DESC, id DESC`,
			),
		db
			.prepare(
				`SELECT task_id, tag
				FROM task_tags
				ORDER BY task_id ASC, tag ASC`,
			),
	]);

	const tagMap = new Map<string, string[]>();

	for (const row of (tagsResult.results ?? []) as TaskTagRow[]) {
		const tags = tagMap.get(row.task_id) ?? [];
		tags.push(row.tag);
		tagMap.set(row.task_id, tags);
	}

	return ((tasksResult.results ?? []) as DatabaseTask[]).map((task) => ({
		...task,
		tags: tagMap.get(task.id) ?? [],
	}));
};
