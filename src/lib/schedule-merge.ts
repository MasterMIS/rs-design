import {
  computeProgress,
  isDrawingCompleted,
  isTrackerCompleted,
  type ProgressItem,
  type ProgressStats,
} from './progressStats';

export interface DrawingTemplateRow {
  drawingNo: string;
  category: string;
}

export interface DrawingScheduleRow {
  project?: string;
  drawingNo: string;
  actualDate?: string;
  clientStatus?: string;
}

export interface TrackerTemplateRow {
  trackerId: string;
  category: string;
}

export interface TrackerScheduleRow {
  project?: string;
  trackerId: string;
  actualDate?: string;
}

function matchesProjectName(a?: string, b?: string) {
  return a?.trim().toLowerCase() === b?.trim().toLowerCase();
}

export function buildDrawingProgressItems(
  projectNames: string[],
  templates: DrawingTemplateRow[],
  schedule: DrawingScheduleRow[]
): ProgressItem[] {
  const items: ProgressItem[] = [];

  for (const projectName of projectNames) {
    for (const tpl of templates) {
      const row = schedule.find(
        (s) =>
          matchesProjectName(s.project, projectName) &&
          s.drawingNo === tpl.drawingNo
      );
      items.push({
        category: tpl.category,
        completed: isDrawingCompleted({
          actualDate: row?.actualDate,
          clientStatus: row?.clientStatus,
        }),
      });
    }
  }

  return items;
}

export function buildTrackerProgressItems(
  projectNames: string[],
  templates: TrackerTemplateRow[],
  schedule: TrackerScheduleRow[]
): ProgressItem[] {
  const items: ProgressItem[] = [];

  for (const projectName of projectNames) {
    for (const tpl of templates) {
      const row = schedule.find(
        (s) =>
          matchesProjectName(s.project, projectName) &&
          s.trackerId === tpl.trackerId
      );
      items.push({
        category: tpl.category,
        completed: isTrackerCompleted(row?.actualDate),
      });
    }
  }

  return items;
}

export function getDrawingProgressForProjects(
  projectNames: string[],
  templates: DrawingTemplateRow[],
  schedule: DrawingScheduleRow[]
): ProgressStats {
  return computeProgress(
    buildDrawingProgressItems(projectNames, templates, schedule)
  );
}

export function getTrackerProgressForProjects(
  projectNames: string[],
  templates: TrackerTemplateRow[],
  schedule: TrackerScheduleRow[]
): ProgressStats {
  return computeProgress(
    buildTrackerProgressItems(projectNames, templates, schedule)
  );
}
