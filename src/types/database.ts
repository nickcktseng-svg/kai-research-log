export type TaskType = 'daily' | 'weekly';
export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface DatabaseTask {
	id: string;
	title: string;
	description: string;
	type: TaskType;
	category: string;
	status: TaskStatus;
	priority: TaskPriority;
	task_date: string | null;
	week: string | null;
	created_at: string;
	updated_at: string;
}

export interface TaskWithTags extends DatabaseTask {
	tags: string[];
}

export interface CreateDatabaseTaskInput {
	title: string;
	description: string;
	type: TaskType;
	category: string;
	status: TaskStatus;
	priority: TaskPriority;
	task_date: string | null;
	week: string | null;
	tags: string[];
}

export interface UpdateDatabaseTaskInput {
	title?: string;
	description?: string;
	type?: TaskType;
	category?: string;
	status?: TaskStatus;
	priority?: TaskPriority;
	task_date?: string | null;
	week?: string | null;
	tags?: string[];
}

export interface DatabaseWeeklyReport {
	id: string;
	week: string;
	title: string;
	date_range: string;
	summary: string;
	created_at: string;
	updated_at: string;
}

export type WeeklyReportSectionType =
	| 'completed'
	| 'progress'
	| 'problems'
	| 'solutions'
	| 'unfinished'
	| 'next';

export interface DatabaseWeeklyReportSection {
	id: number;
	report_id: string;
	section_type: WeeklyReportSectionType;
	content: string;
	sort_order: number;
}

export interface WeeklyReportWithSections extends DatabaseWeeklyReport {
	completed: string[];
	progress: string[];
	problems: string[];
	solutions: string[];
	unfinished: string[];
	next: string[];
	categories: string[];
	tags: string[];
}
