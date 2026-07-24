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

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_week ON tasks(week);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_week ON weekly_reports(week);
