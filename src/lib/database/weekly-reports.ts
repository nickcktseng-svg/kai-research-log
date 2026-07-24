import type {
	DatabaseWeeklyReport,
	DatabaseWeeklyReportSection,
	WeeklyReportWithSections,
} from '../../types/database';

type ReportTagRow = {
	report_id: string;
	tag: string;
};

type ReportCategoryRow = {
	report_id: string;
	category: string;
};

const createReport = (report: DatabaseWeeklyReport): WeeklyReportWithSections => ({
	...report,
	completed: [],
	progress: [],
	problems: [],
	solutions: [],
	unfinished: [],
	next: [],
	categories: [],
	tags: [],
});

export const listDatabaseWeeklyReports = async (
	db: D1Database,
): Promise<WeeklyReportWithSections[]> => {
	const [reportsResult, sectionsResult, tagsResult, categoriesResult] =
		await db.batch([
			db.prepare(
				`SELECT *
				FROM weekly_reports
				ORDER BY week DESC, created_at DESC`,
			),
			db.prepare(
				`SELECT id, report_id, section_type, content, sort_order
				FROM weekly_report_sections
				ORDER BY report_id ASC, section_type ASC, sort_order ASC, id ASC`,
			),
			db.prepare(
				`SELECT report_id, tag
				FROM weekly_report_tags
				ORDER BY report_id ASC, tag ASC`,
			),
			db.prepare(
				`SELECT report_id, category
				FROM weekly_report_categories
				ORDER BY report_id ASC, category ASC`,
			),
		]);

	const reports = ((reportsResult.results ?? []) as DatabaseWeeklyReport[]).map(
		createReport,
	);
	const reportMap = new Map(reports.map((report) => [report.id, report]));

	for (const section of (sectionsResult.results ??
		[]) as DatabaseWeeklyReportSection[]) {
		const report = reportMap.get(section.report_id);
		if (report) report[section.section_type].push(section.content);
	}

	for (const row of (tagsResult.results ?? []) as ReportTagRow[]) {
		reportMap.get(row.report_id)?.tags.push(row.tag);
	}

	for (const row of (categoriesResult.results ?? []) as ReportCategoryRow[]) {
		reportMap.get(row.report_id)?.categories.push(row.category);
	}

	return reports;
};
