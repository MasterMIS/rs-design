import {
  computeProgress,
  isDrawingCompleted,
  isDrawingInProgress,
  isTrackerCompleted,
  isTrackerInProgress,
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
  actualStartDate?: string;
  actualEndDate?: string;
  clientStatus?: string;
  rsDesignStatus?: string;
  drawingImage?: string;
  rowIndex?: number;
  revisionNo?: string;
}

export interface DrawingTemplateFull extends DrawingTemplateRow {
  id: string;
  areaName?: string;
  drawingName?: string;
  resourceName?: string;
  doerName?: string;
}

export interface DrawingPlannedRow {
  project?: string;
  category: string;
  planStartDate?: string;
  planEndDate?: string;
}

export interface MergedDrawingDoerTask {
  key: string;
  tplId: string;
  project: string;
  drawingNo: string;
  drawingName: string;
  areaName: string;
  category: string;
  resourceName: string;
  doerName: string;
  planStartDate: string;
  planEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  rsDesignStatus: string;
  clientStatus: string;
  revisionNo: string;
  drawingImage: string;
  completed: boolean;
}

export interface TrackerTemplateRow {
  trackerId: string;
  category: string;
}

export interface TrackerScheduleRow {
  project?: string;
  trackerId: string;
  actualStartDate?: string;
  actualEndDate?: string;
  rowIndex?: number;
}

export interface TrackerTemplateFull extends TrackerTemplateRow {
  id: string;
  areaName?: string;
  taskName?: string;
  resourceName?: string;
  doerName?: string;
  tat?: string;
}

export interface TrackerPlannedRow {
  project?: string;
  category: string;
  startDate?: string;
  endDate?: string;
}

export interface MergedTrackerDoerTask {
  key: string;
  tplId: string;
  project: string;
  trackerId: string;
  taskName: string;
  areaName: string;
  category: string;
  resourceName: string;
  doerName: string;
  tat: string;
  planStartDate: string;
  planEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  rowIndex?: number;
  completed: boolean;
}

function matchesProjectName(a?: string, b?: string) {
  return a?.trim().toLowerCase() === b?.trim().toLowerCase();
}

function firstNonEmptyDate(
  entries: Array<{ actualStartDate?: string }>
): string | undefined {
  return entries.find((entry) => entry.actualStartDate?.trim())?.actualStartDate;
}

function lastNonEmptyDate(
  entries: Array<{ actualEndDate?: string }>
): string | undefined {
  return [...entries]
    .reverse()
    .find((entry) => entry.actualEndDate?.trim())?.actualEndDate;
}

/** Merge revision history: first actual start, latest actual end and status. */
export function mergeDrawingScheduleEntries(
  entries: DrawingScheduleRow[]
): DrawingScheduleRow | undefined {
  if (entries.length === 0) return undefined;
  if (entries.length === 1) return entries[0];

  const first = entries[0];
  const last = entries[entries.length - 1];
  return {
    ...last,
    actualStartDate: firstNonEmptyDate(entries) || first.actualStartDate,
    actualEndDate: lastNonEmptyDate(entries) || last.actualEndDate,
    clientStatus: last.clientStatus,
    rsDesignStatus: last.rsDesignStatus,
    drawingImage: last.drawingImage || [...entries].reverse().find((e) => e.drawingImage)?.drawingImage,
    revisionNo: last.revisionNo,
  };
}

export function mergeTrackerScheduleEntries(
  entries: TrackerScheduleRow[]
): TrackerScheduleRow | undefined {
  if (entries.length === 0) return undefined;
  if (entries.length === 1) return entries[0];

  const first = entries[0];
  const last = entries[entries.length - 1];
  return {
    ...last,
    actualStartDate: firstNonEmptyDate(entries) || first.actualStartDate,
    actualEndDate: lastNonEmptyDate(entries) || last.actualEndDate,
    rowIndex: last.rowIndex,
  };
}

export function buildDrawingProgressItems(
  projectNames: string[],
  templates: DrawingTemplateRow[],
  schedule: DrawingScheduleRow[]
): ProgressItem[] {
  const items: ProgressItem[] = [];

  for (const projectName of projectNames) {
    for (const tpl of templates) {
      const entries = schedule.filter(
        (s) =>
          matchesProjectName(s.project, projectName) &&
          s.drawingNo === tpl.drawingNo
      );
      const row = mergeDrawingScheduleEntries(entries);
      const statusRow = {
        actualStartDate: row?.actualStartDate,
        actualEndDate: row?.actualEndDate,
        clientStatus: row?.clientStatus,
      };
      items.push({
        category: tpl.category,
        completed: isDrawingCompleted(statusRow),
        inProgress: isDrawingInProgress(statusRow),
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
      const entries = schedule.filter(
        (s) =>
          matchesProjectName(s.project, projectName) &&
          s.trackerId === tpl.trackerId
      );
      const row = mergeTrackerScheduleEntries(entries);
      const statusRow = {
        actualStartDate: row?.actualStartDate,
        actualEndDate: row?.actualEndDate,
      };
      items.push({
        category: tpl.category,
        completed: isTrackerCompleted(statusRow),
        inProgress: isTrackerInProgress(statusRow),
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

export function buildDrawingDoerTasks(
  projectNames: string[],
  templates: DrawingTemplateFull[],
  schedule: DrawingScheduleRow[],
  planned: DrawingPlannedRow[]
): MergedDrawingDoerTask[] {
  const rows: MergedDrawingDoerTask[] = [];

  for (const projectName of projectNames) {
    for (const tpl of templates) {
      const entries = schedule.filter(
        (s) =>
          matchesProjectName(s.project, projectName) &&
          s.drawingNo === tpl.drawingNo
      );
      const merged = mergeDrawingScheduleEntries(entries);
      const catPlan = planned.find(
        (p) =>
          matchesProjectName(p.project, projectName) &&
          p.category === tpl.category
      );

      const statusRow = {
        actualStartDate: merged?.actualStartDate,
        actualEndDate: merged?.actualEndDate,
        clientStatus: merged?.clientStatus,
      };

      rows.push({
        key: `${projectName}-${tpl.drawingNo}`,
        tplId: tpl.id,
        project: projectName,
        drawingNo: tpl.drawingNo,
        drawingName: tpl.drawingName || tpl.drawingNo,
        areaName: tpl.areaName || '',
        category: tpl.category,
        resourceName: tpl.resourceName || '',
        doerName: tpl.doerName || '',
        planStartDate: catPlan?.planStartDate || '',
        planEndDate: catPlan?.planEndDate || '',
        actualStartDate: merged?.actualStartDate || '',
        actualEndDate: merged?.actualEndDate || '',
        rsDesignStatus: merged?.rsDesignStatus || 'Pending',
        clientStatus: merged?.clientStatus || 'Pending',
        revisionNo: merged?.revisionNo || '0',
        drawingImage: merged?.drawingImage || '',
        completed: isDrawingCompleted(statusRow),
      });
    }
  }

  return rows;
}

export function buildTrackerDoerTasks(
  projectNames: string[],
  templates: TrackerTemplateFull[],
  schedule: TrackerScheduleRow[],
  planned: TrackerPlannedRow[]
): MergedTrackerDoerTask[] {
  const rows: MergedTrackerDoerTask[] = [];

  for (const projectName of projectNames) {
    for (const tpl of templates) {
      const entries = schedule.filter(
        (s) =>
          matchesProjectName(s.project, projectName) &&
          s.trackerId === tpl.trackerId
      );
      const merged = mergeTrackerScheduleEntries(entries);
      const catPlan = planned.find(
        (p) =>
          matchesProjectName(p.project, projectName) &&
          p.category === tpl.category
      );

      const statusRow = {
        actualStartDate: merged?.actualStartDate,
        actualEndDate: merged?.actualEndDate,
      };

      rows.push({
        key: `${projectName}-${tpl.trackerId}`,
        tplId: tpl.id,
        project: projectName,
        trackerId: tpl.trackerId,
        taskName: tpl.taskName || tpl.trackerId,
        areaName: tpl.areaName || '',
        category: tpl.category,
        resourceName: tpl.resourceName || '',
        doerName: tpl.doerName || '',
        tat: tpl.tat || '',
        planStartDate: catPlan?.startDate || '',
        planEndDate: catPlan?.endDate || '',
        actualStartDate: merged?.actualStartDate || '',
        actualEndDate: merged?.actualEndDate || '',
        rowIndex: merged?.rowIndex,
        completed: isTrackerCompleted(statusRow),
      });
    }
  }

  return rows;
}
