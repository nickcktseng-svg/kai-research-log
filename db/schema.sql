CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly')),
  category TEXT NOT NULL DEFAULT '未分類',
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'doing', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  task_date TEXT,
  week TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (task_id, tag),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS weekly_reports (
  id TEXT PRIMARY KEY,
  week TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  date_range TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weekly_report_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id TEXT NOT NULL,
  section_type TEXT NOT NULL
    CHECK (
      section_type IN (
        'completed',
        'progress',
        'problems',
        'solutions',
        'unfinished',
        'next'
      )
    ),
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS weekly_report_tags (
  report_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (report_id, tag),
  FOREIGN KEY (report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS weekly_report_categories (
  report_id TEXT NOT NULL,
  category TEXT NOT NULL,
  PRIMARY KEY (report_id, category),
  FOREIGN KEY (report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '研究日誌',
  tags_json TEXT NOT NULL DEFAULT '[]',
  content_html TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  entry_date TEXT NOT NULL DEFAULT CURRENT_DATE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS papers (
  id TEXT PRIMARY KEY,
  source_key TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'openalex', 'doi', 'url')),
  source_id TEXT NOT NULL DEFAULT '',
  doi TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  authors_json TEXT NOT NULL DEFAULT '[]',
  publication_year INTEGER,
  journal TEXT NOT NULL DEFAULT '',
  abstract TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  citation TEXT NOT NULL DEFAULT '',
  cited_by_count INTEGER NOT NULL DEFAULT 0,
  is_open_access INTEGER NOT NULL DEFAULT 0
    CHECK (is_open_access IN (0, 1)),
  reading_status TEXT NOT NULL DEFAULT 'to_read'
    CHECK (reading_status IN ('to_read', 'reading', 'finished', 'important')),
  tags_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'public')),
  saved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS paper_analyses (
  id TEXT PRIMARY KEY,
  paper_id TEXT NOT NULL,
  analysis_mode TEXT NOT NULL DEFAULT 'quick',
  analysis_title TEXT NOT NULL DEFAULT '',
  analysis_markdown TEXT NOT NULL DEFAULT '',
  source_excerpt TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_week ON tasks(week);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_week ON weekly_reports(week);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_category ON journal_entries(category);
CREATE INDEX IF NOT EXISTS idx_journal_entries_slug ON journal_entries(slug);
CREATE INDEX IF NOT EXISTS idx_papers_source_key ON papers(source_key);
CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(publication_year);
CREATE INDEX IF NOT EXISTS idx_papers_status ON papers(reading_status);
CREATE INDEX IF NOT EXISTS idx_papers_visibility ON papers(visibility);
CREATE INDEX IF NOT EXISTS idx_papers_cited_by ON papers(cited_by_count);
CREATE INDEX IF NOT EXISTS idx_papers_saved_at ON papers(saved_at);
CREATE INDEX IF NOT EXISTS idx_paper_analyses_paper ON paper_analyses(paper_id);
