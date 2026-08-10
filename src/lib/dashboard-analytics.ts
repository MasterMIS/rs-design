import { getDoerLabel, parseFlexibleDate } from '@/lib/em-access';
import type { PcTask } from '@/lib/pc-dashboard';
import {
  computeProgress,
  computeProgressPercent,
  isDrawingCompleted,
  isDrawingInProgress,
  isTrackerCompleted,
  isTrackerInProgress,
} from '@/lib/progressStats';
import {
  buildDrawingDoerTasksFromProjects,
  buildDrawingProgressItemsFromProjects,
  buildTrackerDoerTasksFromProjects,
  buildTrackerProgressItemsFromProjects,
  type DrawingProjectBundle,
  type MergedDrawingDoerTask,
  type MergedTrackerDoerTask,
  type TrackerProjectBundle,
} from '@/lib/schedule-merge';

export type HealthStatus = 'good' | 'warning' | 'critical';

export interface SummaryStatsRow {
  name: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  dueToday: number;
  overdue: number;
  percent: number;
}

export interface ZoneCategoryRow {
  zone: string;
  category: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  dueToday: number;
  overdue: number;
  percent: number;
}

export interface ProjectZoneCategoryBlock {
  project: string;
  drawingRows: ZoneCategoryRow[];
  trackerRows: ZoneCategoryRow[];
}

export interface ProjectHealthRow {
  project: string;
  progressPercent: number;
  scheduleStatus: HealthStatus;
  drawingsStatus: HealthStatus;
  selectionsStatus: HealthStatus;
  siteStatus: HealthStatus;
}

export interface DashboardKpis {
  activeProjects: number;
  onTrack: number;
  delayedProjects: number;
  overdueTasks: number;
  approvalsPending: number;
  drawingsOverdue: number;
}

export interface NeedsAttentionRow {
  project: string;
  issue: string;
  owner: string;
  delayDays: number;
  linkHref: string;
}

export interface TeamWorkloadRow {
  doer: string;
  openTasks: number;
  dueToday: number;
  overdue: number;
}

export interface TodayPlanCounts {
  siteVisits: number;
  clientMeetings: number;
  drawingsDue: number;
  selectionsDue: number;
}

export interface TodayPlanRow {
  type: 'Site Visit' | 'Client Meeting';
  project: string;
  detail: string;
  owner: string;
}

export interface Upcoming7DayCounts {
  drawingsDue: number;
  selections: number;
}

export interface SiteVisitRecord {
  visitDate?: string;
  project?: string;
  purpose?: string;
  visitedBy?: string;
}

export interface MomRecord {
  meetingDate?: string;
  project?: string;
  purpose?: string;
  location?: string;
}

export interface QuotationRecord {
  project?: string;
  statusRSDesign?: string;
  statusClient?: string;
}

type ScheduleRow = {
  project?: string;
  zone?: string;
  category?: string;
  planStartDate?: string;
  planEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  completed?: boolean;
};

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function isFuturePlanStart(planStart: string | undefined, today: Date): boolean {
  if (!planStart?.trim()) return false;
  const start = parseFlexibleDate(planStart);
  if (!start) return false;
  return start.getTime() > startOfDay(today).getTime();
}

function resolveDueDate(planEnd?: string, planStart?: string): Date | null {
  return parseFlexibleDate(planEnd) || parseFlexibleDate(planStart);
}

function classifyOpenTaskDue(
  row: ScheduleRow,
  today: Date
): 'dueToday' | 'overdue' | null {
  if (row.actualEndDate?.trim()) return null;
  if (isFuturePlanStart(row.planStartDate, today)) return null;

  const dueDate = resolveDueDate(row.planEndDate, row.planStartDate);
  if (!dueDate) return null;

  const due = startOfDay(dueDate);
  const now = startOfDay(today);
  if (due.getTime() > now.getTime()) return null;
  if (due.getTime() === now.getTime()) return 'dueToday';
  return 'overdue';
}

function normalizeZone(zone?: string): string {
  return zone?.trim() || 'Unassigned Zone';
}

function normalizeCategory(category?: string): string {
  return category?.trim() || 'Uncategorized';
}

function isSelectionCategory(category?: string): boolean {
  return normalizeCategory(category).toUpperCase() === 'SELECTION';
}

function sortZoneCategoryRows(rows: ZoneCategoryRow[]): ZoneCategoryRow[] {
  return [...rows].sort((a, b) => {
    const zoneCmp = a.zone.localeCompare(b.zone, undefined, { numeric: true });
    if (zoneCmp !== 0) return zoneCmp;
    return a.category.localeCompare(b.category, undefined, { numeric: true });
  });
}

function sortZones(zones: string[]): string[] {
  return [...zones].sort((a, b) => {
    if (a === 'Unassigned Zone') return 1;
    if (b === 'Unassigned Zone') return -1;
    return a.localeCompare(b, undefined, { numeric: true });
  });
}

function sortSummaryRows(rows: SummaryStatsRow[]): SummaryStatsRow[] {
  return [...rows].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );
}

function aggregateByLabel(
  rows: ScheduleRow[],
  getLabel: (row: ScheduleRow) => string,
  today: Date
): SummaryStatsRow[] {
  const map = new Map<
    string,
    {
      name: string;
      total: number;
      completed: number;
      inProgress: number;
      dueToday: number;
      overdue: number;
    }
  >();

  for (const row of rows) {
    const name = getLabel(row);
    const entry = map.get(name) || {
      name,
      total: 0,
      completed: 0,
      inProgress: 0,
      dueToday: 0,
      overdue: 0,
    };

    entry.total += 1;

    const statusRow = {
      actualStartDate: row.actualStartDate,
      actualEndDate: row.actualEndDate,
    };

    const completed =
      row.completed ??
      (isDrawingCompleted(statusRow) || isTrackerCompleted(statusRow));
    const inProgress =
      !completed &&
      (isDrawingInProgress(statusRow) || isTrackerInProgress(statusRow));

    if (completed) entry.completed += 1;
    else if (inProgress) entry.inProgress += 1;

    const dueClass = classifyOpenTaskDue(row, today);
    if (dueClass === 'dueToday') entry.dueToday += 1;
    if (dueClass === 'overdue') entry.overdue += 1;

    map.set(name, entry);
  }

  return sortSummaryRows(
    Array.from(map.values()).map((entry) => {
      const pending = entry.total - entry.completed - entry.inProgress;
      const percent = computeProgressPercent(entry.completed, entry.total);
      return {
        name: entry.name,
        total: entry.total,
        completed: entry.completed,
        inProgress: entry.inProgress,
        pending,
        dueToday: entry.dueToday,
        overdue: entry.overdue,
        percent,
      };
    })
  );
}

function aggregateScheduleRows(rows: ScheduleRow[], today: Date): ZoneCategoryRow[] {
  const map = new Map<
    string,
    {
      zone: string;
      category: string;
      total: number;
      completed: number;
      inProgress: number;
      dueToday: number;
      overdue: number;
    }
  >();

  for (const row of rows) {
    const zone = normalizeZone(row.zone);
    const category = normalizeCategory(row.category);
    const key = `${zone}::${category}`;
    const entry = map.get(key) || {
      zone,
      category,
      total: 0,
      completed: 0,
      inProgress: 0,
      dueToday: 0,
      overdue: 0,
    };

    entry.total += 1;

    const statusRow = {
      actualStartDate: row.actualStartDate,
      actualEndDate: row.actualEndDate,
    };

    const completed =
      row.completed ??
      (isDrawingCompleted(statusRow) || isTrackerCompleted(statusRow));
    const inProgress =
      !completed &&
      (isDrawingInProgress(statusRow) || isTrackerInProgress(statusRow));

    if (completed) entry.completed += 1;
    else if (inProgress) entry.inProgress += 1;

    const dueClass = classifyOpenTaskDue(row, today);
    if (dueClass === 'dueToday') entry.dueToday += 1;
    if (dueClass === 'overdue') entry.overdue += 1;

    map.set(key, entry);
  }

  return sortZoneCategoryRows(
    Array.from(map.values()).map((entry) => {
      const pending = entry.total - entry.completed - entry.inProgress;
      const percent = computeProgressPercent(entry.completed, entry.total);
      return {
        zone: entry.zone,
        category: entry.category,
        total: entry.total,
        completed: entry.completed,
        inProgress: entry.inProgress,
        pending,
        dueToday: entry.dueToday,
        overdue: entry.overdue,
        percent,
      };
    })
  );
}

export function buildProjectSummaryRowsFromDrawingTasks(
  tasks: MergedDrawingDoerTask[],
  today = new Date()
): SummaryStatsRow[] {
  return aggregateByLabel(tasks, (row) => row.project?.trim() || 'Unknown', today);
}

export function buildProjectSummaryRowsFromTrackerTasks(
  tasks: MergedTrackerDoerTask[],
  today = new Date()
): SummaryStatsRow[] {
  return aggregateByLabel(tasks, (row) => row.project?.trim() || 'Unknown', today);
}

export function buildCategorySummaryRowsFromDrawingTasks(
  tasks: MergedDrawingDoerTask[],
  today = new Date()
): SummaryStatsRow[] {
  return aggregateByLabel(tasks, (row) => normalizeCategory(row.category), today);
}

export function buildCategorySummaryRowsFromTrackerTasks(
  tasks: MergedTrackerDoerTask[],
  today = new Date()
): SummaryStatsRow[] {
  return aggregateByLabel(tasks, (row) => normalizeCategory(row.category), today);
}

export function buildZoneSummaryRowsFromDrawingTasks(
  tasks: MergedDrawingDoerTask[],
  today = new Date()
): SummaryStatsRow[] {
  return aggregateByLabel(tasks, (row) => normalizeZone(row.zone), today);
}

export function buildZoneSummaryRowsFromTrackerTasks(
  tasks: MergedTrackerDoerTask[],
  today = new Date()
): SummaryStatsRow[] {
  return aggregateByLabel(tasks, (row) => normalizeZone(row.zone), today);
}

export function buildZoneCategoryRowsFromDrawingTasks(
  tasks: MergedDrawingDoerTask[],
  today = new Date()
): ZoneCategoryRow[] {
  return aggregateScheduleRows(tasks, today);
}

export function buildZoneCategoryRowsFromTrackerTasks(
  tasks: MergedTrackerDoerTask[],
  today = new Date()
): ZoneCategoryRow[] {
  return aggregateScheduleRows(tasks, today);
}

export function buildProjectZoneCategoryBlocks(
  projectNames: string[],
  drawingBundles: DrawingProjectBundle[],
  trackerBundles: TrackerProjectBundle[],
  today = new Date()
): ProjectZoneCategoryBlock[] {
  return projectNames.map((project) => ({
    project,
    drawingRows: buildZoneCategoryRowsFromDrawingTasks(
      buildDrawingDoerTasksFromProjects(drawingBundles, [project]),
      today
    ),
    trackerRows: buildZoneCategoryRowsFromTrackerTasks(
      buildTrackerDoerTasksFromProjects(trackerBundles, [project]),
      today
    ),
  }));
}

function deriveHealthStatus(
  tasks: ScheduleRow[],
  today: Date,
  filter?: (row: ScheduleRow) => boolean
): HealthStatus {
  const filtered = filter ? tasks.filter(filter) : tasks;
  let hasOverdue = false;
  let hasDueToday = false;

  for (const row of filtered) {
    const dueClass = classifyOpenTaskDue(row, today);
    if (dueClass === 'overdue') hasOverdue = true;
    if (dueClass === 'dueToday') hasDueToday = true;
  }

  if (hasOverdue) return 'critical';
  if (hasDueToday) return 'warning';
  return 'good';
}

function isDateBeforeToday(dateStr: string | undefined, today: Date): boolean {
  if (!dateStr?.trim()) return false;
  const date = parseFlexibleDate(dateStr);
  if (!date) return false;
  return startOfDay(date).getTime() < startOfDay(today).getTime();
}

function isDateOnToday(dateStr: string | undefined, today: Date): boolean {
  if (!dateStr?.trim()) return false;
  const date = parseFlexibleDate(dateStr);
  if (!date) return false;
  return isSameDay(date, today);
}

function isDateInNext7Days(dateStr: string | undefined, today: Date): boolean {
  if (!dateStr?.trim()) return false;
  const date = parseFlexibleDate(dateStr);
  if (!date) return false;
  const start = startOfDay(today);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const d = startOfDay(date);
  return d.getTime() > start.getTime() && d.getTime() <= end.getTime();
}

export function buildProjectHealthRows(
  projectNames: string[],
  drawingBundles: DrawingProjectBundle[],
  trackerBundles: TrackerProjectBundle[],
  siteVisits: SiteVisitRecord[],
  today = new Date()
): ProjectHealthRow[] {
  return projectNames.map((project) => {
    const drawingTasks = buildDrawingDoerTasksFromProjects(drawingBundles, [project]);
    const trackerTasks = buildTrackerDoerTasksFromProjects(trackerBundles, [project]);

    const drawingProgress = computeProgress(
      buildDrawingProgressItemsFromProjects(drawingBundles, [project])
    );
    const trackerProgress = computeProgress(
      buildTrackerProgressItemsFromProjects(trackerBundles, [project])
    );
    const progressPercent = Math.round(
      (drawingProgress.percent + trackerProgress.percent) / 2
    );

    const projectSiteVisits = siteVisits.filter(
      (v) => v.project?.trim().toLowerCase() === project.trim().toLowerCase()
    );
    const siteStatus: HealthStatus = projectSiteVisits.some((v) =>
      isDateBeforeToday(v.visitDate, today)
    )
      ? 'critical'
      : projectSiteVisits.some((v) => isDateOnToday(v.visitDate, today))
        ? 'warning'
        : 'good';

    return {
      project,
      progressPercent,
      scheduleStatus: deriveHealthStatus(
        trackerTasks,
        today,
        (row) => !isSelectionCategory(row.category)
      ),
      drawingsStatus: deriveHealthStatus(drawingTasks, today),
      selectionsStatus: deriveHealthStatus(trackerTasks, today, (row) =>
        isSelectionCategory(row.category)
      ),
      siteStatus,
    };
  });
}

export function buildDashboardKpis(
  projectNames: string[],
  pcTasks: PcTask[],
  quotations: QuotationRecord[]
): DashboardKpis {
  const delayedDrawingTracker = pcTasks.filter(
    (t) =>
      t.priority === 'delayed' &&
      (t.source === 'drawing' || t.source === 'tracker')
  );

  const delayedByProject = new Set(
    delayedDrawingTracker.map((t) => t.project.trim().toLowerCase())
  );

  const delayedProjects = projectNames.filter((name) =>
    delayedByProject.has(name.trim().toLowerCase())
  ).length;

  const approvalsPending = quotations.filter((q) => {
    const rs = (q.statusRSDesign || 'Pending').trim();
    const client = (q.statusClient || 'Pending').trim();
    return rs === 'Pending' || client === 'Pending';
  }).length;

  return {
    activeProjects: projectNames.length,
    onTrack: Math.max(0, projectNames.length - delayedProjects),
    delayedProjects,
    overdueTasks: pcTasks.filter((t) => t.priority === 'delayed').length,
    approvalsPending,
    drawingsOverdue: pcTasks.filter(
      (t) => t.source === 'drawing' && t.priority === 'delayed'
    ).length,
  };
}

export function buildNeedsAttentionRows(
  pcTasks: PcTask[],
  limit = 10
): NeedsAttentionRow[] {
  return pcTasks
    .filter((t) => t.priority === 'delayed')
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, limit)
    .map((t) => ({
      project: t.project,
      issue: t.taskName,
      owner: t.doer,
      delayDays: t.daysOverdue,
      linkHref: t.linkHref,
    }));
}

export function buildTeamWorkloadRows(
  drawingTasks: MergedDrawingDoerTask[],
  trackerTasks: MergedTrackerDoerTask[],
  today = new Date()
): TeamWorkloadRow[] {
  const map = new Map<
    string,
    { openTasks: number; dueToday: number; overdue: number }
  >();

  const addRow = (doerName: string | undefined, row: ScheduleRow) => {
    const doer = getDoerLabel(doerName);
    const entry = map.get(doer) || { openTasks: 0, dueToday: 0, overdue: 0 };

    if (!row.actualEndDate?.trim()) {
      entry.openTasks += 1;
      const dueClass = classifyOpenTaskDue(row, today);
      if (dueClass === 'dueToday') entry.dueToday += 1;
      if (dueClass === 'overdue') entry.overdue += 1;
    }

    map.set(doer, entry);
  };

  for (const row of drawingTasks) addRow(row.doerName, row);
  for (const row of trackerTasks) addRow(row.doerName, row);

  return Array.from(map.entries())
    .map(([doer, stats]) => ({ doer, ...stats }))
    .sort((a, b) => b.overdue - a.overdue || b.openTasks - a.openTasks);
}

export function buildTodayPlanRows(
  siteVisits: SiteVisitRecord[],
  momRecords: MomRecord[],
  projectNames: string[],
  today = new Date()
): TodayPlanRow[] {
  const allow = new Set(projectNames.map((n) => n.trim().toLowerCase()));
  const matchesProject = (project?: string) => {
    if (projectNames.length === 0) return false;
    if (!project?.trim()) return false;
    return allow.has(project.trim().toLowerCase());
  };

  const rows: TodayPlanRow[] = [];

  for (const visit of siteVisits) {
    if (!matchesProject(visit.project) || !isDateOnToday(visit.visitDate, today)) {
      continue;
    }
    rows.push({
      type: 'Site Visit',
      project: visit.project?.trim() || '—',
      detail: visit.purpose?.trim() || 'Site visit',
      owner: visit.visitedBy?.trim() || '—',
    });
  }

  for (const meeting of momRecords) {
    if (!matchesProject(meeting.project) || !isDateOnToday(meeting.meetingDate, today)) {
      continue;
    }
    rows.push({
      type: 'Client Meeting',
      project: meeting.project?.trim() || '—',
      detail: meeting.purpose?.trim() || meeting.location?.trim() || 'Meeting',
      owner: '—',
    });
  }

  return rows.sort((a, b) => a.project.localeCompare(b.project));
}

export function buildTodayPlanCounts(
  siteVisits: SiteVisitRecord[],
  momRecords: MomRecord[],
  projectNames: string[],
  drawingTasks: MergedDrawingDoerTask[] = [],
  trackerTasks: MergedTrackerDoerTask[] = [],
  today = new Date()
): TodayPlanCounts {
  const allow = new Set(projectNames.map((n) => n.trim().toLowerCase()));
  const matchesProject = (project?: string) => {
    if (projectNames.length === 0) return false;
    if (!project?.trim()) return false;
    return allow.has(project.trim().toLowerCase());
  };

  let drawingsDue = 0;
  for (const row of drawingTasks) {
    if (row.actualEndDate?.trim()) continue;
    if (classifyOpenTaskDue(row, today) === 'dueToday') drawingsDue += 1;
  }

  let selectionsDue = 0;
  for (const row of trackerTasks) {
    if (row.actualEndDate?.trim()) continue;
    if (
      isSelectionCategory(row.category) &&
      classifyOpenTaskDue(row, today) === 'dueToday'
    ) {
      selectionsDue += 1;
    }
  }

  return {
    siteVisits: siteVisits.filter(
      (v) => matchesProject(v.project) && isDateOnToday(v.visitDate, today)
    ).length,
    clientMeetings: momRecords.filter(
      (m) => matchesProject(m.project) && isDateOnToday(m.meetingDate, today)
    ).length,
    drawingsDue,
    selectionsDue,
  };
}

export function buildUpcoming7DayCounts(
  drawingTasks: MergedDrawingDoerTask[],
  trackerTasks: MergedTrackerDoerTask[],
  today = new Date()
): Upcoming7DayCounts {
  let drawingsDue = 0;
  let selections = 0;

  for (const row of drawingTasks) {
    if (row.actualEndDate?.trim()) continue;
    if (isFuturePlanStart(row.planStartDate, today)) continue;
    const due = resolveDueDate(row.planEndDate, row.planStartDate);
    if (due && isDateInNext7Days(row.planEndDate || row.planStartDate, today)) {
      drawingsDue += 1;
    }
  }

  for (const row of trackerTasks) {
    if (row.actualEndDate?.trim()) continue;
    if (isFuturePlanStart(row.planStartDate, today)) continue;
    if (
      isSelectionCategory(row.category) &&
      isDateInNext7Days(row.planEndDate || row.planStartDate, today)
    ) {
      selections += 1;
    }
  }

  return { drawingsDue, selections };
}

export { sortZones };
