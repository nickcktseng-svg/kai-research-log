import type {
	CreateDatabaseTaskInput,
	DatabaseTask,
	TaskWithTags,
	UpdateDatabaseTaskInput,
} from '../../types/database';

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

export const getDatabaseTaskById = async (
	db: D1Database,
	id: string,
): Promise<TaskWithTags | null> => {
	const [taskResult, tagsResult] = await db.batch([
		db.prepare('SELECT * FROM tasks WHERE id = ?').bind(id),
		db
			.prepare(
				`SELECT task_id, tag
				FROM task_tags
				WHERE task_id = ?
				ORDER BY tag ASC`,
			)
			.bind(id),
	]);

	const task = (taskResult.results?.[0] ?? null) as DatabaseTask | null;
	if (!task) return null;

	return {
		...task,
		tags: ((tagsResult.results ?? []) as TaskTagRow[]).map((row) => row.tag),
	};
};

export const createDatabaseTask = async (
	db: D1Database,
	input: CreateDatabaseTaskInput,
): Promise<TaskWithTags> => {
	const id = `task-${crypto.randomUUID()}`;
	const now = new Date().toISOString();

	await db.batch([
		db
			.prepare(
				`INSERT INTO tasks (
					id,
					title,
					description,
					type,
					category,
					status,
					priority,
					task_date,
					week,
					created_at,
					updated_at
				)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				id,
				input.title,
				input.description,
				input.type,
				input.category,
				input.status,
				input.priority,
				input.task_date,
				input.week,
				now,
				now,
			),
		...input.tags.map((tag) =>
			db.prepare('INSERT INTO task_tags (task_id, tag) VALUES (?, ?)').bind(id, tag),
		),
	]);

	const task = await getDatabaseTaskById(db, id);
	if (!task) {
		throw new Error('Created task could not be read back from D1.');
	}

	return task;
};

export const updateDatabaseTask = async (
	db: D1Database,
	id: string,
	input: UpdateDatabaseTaskInput,
): Promise<TaskWithTags | null> => {
	const existingTask = await db
		.prepare('SELECT id FROM tasks WHERE id = ?')
		.bind(id)
		.first<{ id: string }>();

	if (!existingTask) return null;

	const now = new Date().toISOString();
	const assignments: string[] = [];
	const values: (string | null)[] = [];

	const addAssignment = (column: string, value: string | null) => {
		assignments.push(`${column} = ?`);
		values.push(value);
	};

	if (input.title !== undefined) addAssignment('title', input.title);
	if (input.description !== undefined) addAssignment('description', input.description);
	if (input.type !== undefined) addAssignment('type', input.type);
	if (input.category !== undefined) addAssignment('category', input.category);
	if (input.status !== undefined) addAssignment('status', input.status);
	if (input.priority !== undefined) addAssignment('priority', input.priority);
	if (input.task_date !== undefined) addAssignment('task_date', input.task_date);
	if (input.week !== undefined) addAssignment('week', input.week);

	const statements: D1PreparedStatement[] = [];

	if (assignments.length > 0) {
		statements.push(
			db
				.prepare(
					`UPDATE tasks
					SET ${assignments.join(', ')}, updated_at = ?
					WHERE id = ?`,
				)
				.bind(...values, now, id),
		);
	} else {
		statements.push(
			db.prepare('UPDATE tasks SET updated_at = ? WHERE id = ?').bind(now, id),
		);
	}

	if (input.tags !== undefined) {
		statements.push(db.prepare('DELETE FROM task_tags WHERE task_id = ?').bind(id));
		statements.push(
			...input.tags.map((tag) =>
				db.prepare('INSERT INTO task_tags (task_id, tag) VALUES (?, ?)').bind(id, tag),
			),
		);
	}

	await db.batch(statements);
	return getDatabaseTaskById(db, id);
};

export const completeDatabaseTask = async (
	db: D1Database,
	id: string,
): Promise<TaskWithTags | null> => updateDatabaseTask(db, id, { status: 'done' });
