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

export type BlogEntryStatus = 'draft' | 'published';

export interface DatabaseBlogEntry {
	id: string;
	slug: string;
	title: string;
	summary: string;
	category: string;
	tags_json: string;
	content_html: string;
	status: BlogEntryStatus;
	entry_date: string;
	created_at: string;
	updated_at: string;
}

export interface BlogEntry extends Omit<DatabaseBlogEntry, 'tags_json'> {
	tags: string[];
}

export interface CreateBlogEntryInput {
	title: string;
	slug: string | null;
	summary: string;
	category: string;
	tags: string[];
	content_html: string;
	status: BlogEntryStatus;
	entry_date: string;
}

export interface UpdateBlogEntryInput {
	title?: string;
	slug?: string | null;
	summary?: string;
	category?: string;
	tags?: string[];
	content_html?: string;
	status?: BlogEntryStatus;
	entry_date?: string;
}

export type PaperSource = 'manual' | 'openalex' | 'doi' | 'url';
export type PaperReadingStatus =
	| 'to_read'
	| 'reading'
	| 'finished'
	| 'important';
export type PaperVisibility = 'private' | 'public';

export interface DatabasePaper {
	id: string;
	source_key: string;
	source: PaperSource;
	source_id: string;
	doi: string;
	title: string;
	authors_json: string;
	publication_year: number | null;
	journal: string;
	abstract: string;
	url: string;
	citation: string;
	cited_by_count: number;
	is_open_access: 0 | 1;
	reading_status: PaperReadingStatus;
	tags_json: string;
	notes: string;
	visibility: PaperVisibility;
	saved_at: string;
	created_at: string;
	updated_at: string;
}

export interface DatabasePaperAnalysis {
	id: string;
	paper_id: string;
	analysis_mode: string;
	analysis_title: string;
	analysis_markdown: string;
	source_excerpt: string;
	created_at: string;
	updated_at: string;
}

export interface PaperAnalysis extends DatabasePaperAnalysis {}

export interface Paper extends Omit<DatabasePaper, 'authors_json' | 'tags_json'> {
	authors: string[];
	tags: string[];
	analyses: PaperAnalysis[];
}

export interface CreatePaperAnalysisInput {
	analysis_mode: string;
	analysis_title: string;
	analysis_markdown: string;
	source_excerpt: string;
}

export interface CreatePaperInput {
	source: PaperSource;
	source_id: string;
	doi: string;
	title: string;
	authors: string[];
	publication_year: number | null;
	journal: string;
	abstract: string;
	url: string;
	citation: string;
	cited_by_count: number;
	is_open_access: boolean;
	reading_status: PaperReadingStatus;
	tags: string[];
	notes?: string;
	visibility: PaperVisibility;
	analysis?: CreatePaperAnalysisInput;
}

export interface UpdatePaperInput {
	reading_status?: PaperReadingStatus;
	tags?: string[];
	notes?: string;
	visibility?: PaperVisibility;
}
