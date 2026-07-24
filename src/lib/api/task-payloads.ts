import type {
	CreateDatabaseTaskInput,
	TaskPriority,
	TaskStatus,
	TaskType,
	UpdateDatabaseTaskInput,
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

const taskTypes = ['daily', 'weekly'] as const;
const taskStatuses = ['todo', 'doing', 'done'] as const;
const taskPriorities = ['low', 'medium', 'high'] as const;

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
	fallback: string,
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

const readNullableString = (
	payload: Record<string, unknown>,
	key: string,
	maxLength: number,
): ParseResult<string | null> => {
	const value = payload[key];
	if (value === undefined || value === null) {
		return { ok: true, value: null };
	}

	if (typeof value !== 'string') {
		return { ok: false, message: `${key} must be a string or null.` };
	}

	const trimmedValue = value.trim();
	if (trimmedValue.length > maxLength) {
		return { ok: false, message: `${key} is too long.` };
	}

	return { ok: true, value: trimmedValue || null };
};

const readTaskDate = (
	payload: Record<string, unknown>,
): ParseResult<string | null> => {
	const normalizedPayload = {
		task_date: payload.task_date ?? payload.taskDate ?? payload.date,
	};

	return readNullableString(normalizedPayload, 'task_date', 32);
};

const readTags = (payload: Record<string, unknown>): ParseResult<string[]> => {
	const value = payload.tags;
	if (value === undefined || value === null) {
		return { ok: true, value: [] };
	}

	if (!Array.isArray(value)) {
		return { ok: false, message: 'tags must be an array of strings.' };
	}

	const tags: string[] = [];

	for (const tag of value) {
		if (typeof tag !== 'string') {
			return { ok: false, message: 'tags must be an array of strings.' };
		}

		const trimmedTag = tag.trim();
		if (trimmedTag.length > 40) {
			return { ok: false, message: 'tag is too long.' };
		}

		if (trimmedTag && !tags.includes(trimmedTag)) {
			tags.push(trimmedTag);
		}
	}

	if (tags.length > 20) {
		return { ok: false, message: 'tags can contain at most 20 items.' };
	}

	return { ok: true, value: tags };
};

export const parseJsonObject = async (
	request: Request,
): Promise<ParseResult<Record<string, unknown>>> => {
	const contentLength = Number(request.headers.get('content-length') ?? 0);
	if (contentLength > 16_384) {
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

export const parseCreateTaskPayload = (
	payload: Record<string, unknown>,
): ParseResult<CreateDatabaseTaskInput> => {
	const title = readRequiredString(payload, 'title', 160);
	if (!title.ok) return title;

	const description = readOptionalString(payload, 'description', 2000, '');
	if (!description.ok) return description;

	if (!isOneOf(payload.type, taskTypes)) {
		return { ok: false, message: 'type must be daily or weekly.' };
	}

	const category = readOptionalString(payload, 'category', 80, '未分類');
	if (!category.ok) return category;

	const status: TaskStatus = isOneOf(payload.status, taskStatuses)
		? payload.status
		: 'todo';

	const priority: TaskPriority = isOneOf(payload.priority, taskPriorities)
		? payload.priority
		: 'medium';

	const taskDate = readTaskDate(payload);
	if (!taskDate.ok) return taskDate;

	const week = readNullableString(payload, 'week', 16);
	if (!week.ok) return week;

	const tags = readTags(payload);
	if (!tags.ok) return tags;

	return {
		ok: true,
		value: {
			title: title.value,
			description: description.value,
			type: payload.type,
			category: category.value,
			status,
			priority,
			task_date: taskDate.value,
			week: week.value,
			tags: tags.value,
		},
	};
};

export const parseUpdateTaskPayload = (
	payload: Record<string, unknown>,
): ParseResult<UpdateDatabaseTaskInput> => {
	const update: UpdateDatabaseTaskInput = {};

	if ('title' in payload) {
		const title = readRequiredString(payload, 'title', 160);
		if (!title.ok) return title;
		update.title = title.value;
	}

	if ('description' in payload) {
		const description = readOptionalString(payload, 'description', 2000, '');
		if (!description.ok) return description;
		update.description = description.value;
	}

	if ('type' in payload) {
		if (!isOneOf(payload.type, taskTypes)) {
			return { ok: false, message: 'type must be daily or weekly.' };
		}
		update.type = payload.type as TaskType;
	}

	if ('category' in payload) {
		const category = readOptionalString(payload, 'category', 80, '未分類');
		if (!category.ok) return category;
		update.category = category.value;
	}

	if ('status' in payload) {
		if (!isOneOf(payload.status, taskStatuses)) {
			return { ok: false, message: 'status must be todo, doing, or done.' };
		}
		update.status = payload.status;
	}

	if ('priority' in payload) {
		if (!isOneOf(payload.priority, taskPriorities)) {
			return { ok: false, message: 'priority must be low, medium, or high.' };
		}
		update.priority = payload.priority;
	}

	if ('task_date' in payload || 'taskDate' in payload || 'date' in payload) {
		const taskDate = readTaskDate(payload);
		if (!taskDate.ok) return taskDate;
		update.task_date = taskDate.value;
	}

	if ('week' in payload) {
		const week = readNullableString(payload, 'week', 16);
		if (!week.ok) return week;
		update.week = week.value;
	}

	if ('tags' in payload) {
		const tags = readTags(payload);
		if (!tags.ok) return tags;
		update.tags = tags.value;
	}

	if (Object.keys(update).length === 0) {
		return { ok: false, message: 'At least one task field is required.' };
	}

	return { ok: true, value: update };
};

export const parseTaskId = (id: string | undefined): ParseResult<string> => {
	if (!id || id.trim().length === 0) {
		return { ok: false, message: 'Task id is required.' };
	}

	const trimmedId = id.trim();
	if (trimmedId.length > 128) {
		return { ok: false, message: 'Task id is too long.' };
	}

	return { ok: true, value: trimmedId };
};
