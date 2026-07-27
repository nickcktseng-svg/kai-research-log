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

export type JournalStatus = 'draft' | 'published';

export interface DatabaseJournalEntry {
	id: string;
	slug: string;
	title: string;
	summary: string;
	category: string;
	tags_json: string;
	content_html: string;
	status: JournalStatus;
	entry_date: string;
	created_at: string;
	updated_at: string;
}

export interface JournalEntry
	extends Omit<DatabaseJournalEntry, 'tags_json'> {
	tags: string[];
}

export interface CreateJournalEntryInput {
	title: string;
	slug: string | null;
	summary: string;
	category: string;
	tags: string[];
	content_html: string;
	status: JournalStatus;
	entry_date: string;
}

export interface UpdateJournalEntryInput {
	title?: string;
	slug?: string | null;
	summary?: string;
	category?: string;
	tags?: string[];
	content_html?: string;
	status?: JournalStatus;
	entry_date?: string;
}
