import {
  canViewAllEmTasks,
  getDoerLabel,
  isTaskAssignedToUser,
  parseFlexibleDate,
} from '@/lib/em-access';
import {
  getPendingStepStatus,
  HRMS_STEP_NAMES,
  isSalesLeadClosed,
  isSalesLeadLost,
  normalizeHrmsFollowUpDate,
  SALES_MAX_STEP,
  SALES_STEP_NAMES,
  type PipelineRecord,
} from '@/lib/sales-pipeline';
import {
  buildDrawingDoerTasksFromProjects,
  buildTrackerDoerTasksFromProjects,
  type DrawingProjectBundle,
  type TrackerProjectBundle,
} from '@/lib/schedule-merge';

export type PcTaskSource =
  | 'drawing'
  | 'tracker'
  | 'em_design'
  | 'em_execution'
  | 'sales'
  | 'hrms';

export type PcTaskPriority = 'delayed' | 'dueToday';

export type DelayedRangeFilter = 'all' | '1' | '2' | '3' | '5' | '10' | '31+';

export const DELAYED_RANGE_OPTIONS: {
  value: DelayedRangeFilter;
  label: string;
  color: string;
}[] = [
  { value: 'all', label: 'All Delayed', color: '#dc2626' },
  { value: '1', label: '1 day', color: '#eab308' },
  { value: '2', label: '2 days', color: '#f97316' },
  { value: '3', label: '3 days', color: '#ef4444' },
  { value: '5', label: '5 days', color: '#e11d48' },
  { value: '10', label: '10 days', color: '#c2410c' },
  { value: '31+', label: '31+ days', color: '#991b1b' },
];

export interface PcTask {
  id: string;
  source: PcTaskSource;
  moduleLabel: string;
  project: string;
  taskName: string;
  doer: string;
  dueDate: Date;
  dueDateLabel: string;
  priority: PcTaskPriority;
  daysOverdue: number;
  statusLabel: string;
  linkHref: string;
}

export interface EmDesignTask {
  rowIndex?: number;
  project_name?: string;
  work_type?: string;
  work_name?: string;
  doer_name?: string;
  planned_date?: string;
  actual_date?: string;
  status?: string;
}

export interface EmExecutionTask {
  rowIndex?: number;
  project_name?: string;
  work_name?: string;
  doer?: string;
  supervisor_name?: string;
  work_from?: string;
  work_to?: string;
  actual_date?: string;
  status?: string;
}

export interface SalesLead extends PipelineRecord {
  id?: string;
  name?: string;
  salesman?: string;
  lost_remark?: string;
  planned_6?: string;
  actual_6?: string;
  status_6?: string;
}

export interface HrmsCandidate extends PipelineRecord {
  id?: string;
  employee_name?: string;
  post_applied?: string;
  lost_remark?: string;
}

export interface PcDashboardRawData {
  drawingBundles: DrawingProjectBundle[];
  trackerBundles: TrackerProjectBundle[];
  emDesignTasks: EmDesignTask[];
  emExecutionTasks: EmExecutionTask[];
  salesLeads: SalesLead[];
  hrmsCandidates: HrmsCandidate[];
}

const MODULE_LABELS: Record<PcTaskSource, string> = {
  drawing: 'Drawing Schedule',
  tracker: 'PMS Tracker',
  em_design: 'EM Design',
  em_execution: 'EM Execution',
  sales: 'Sales',
  hrms: 'HRMS',
};

const MODULE_LINKS: Record<PcTaskSource, string> = {
  drawing: '/drawings',
  tracker: '/pms-tracker',
  em_design: '/em/design',
  em_execution: '/em/execution',
  sales: '/sales',
  hrms: '/hrms',
};

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatDueLabel(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function classifyDueDate(dueDate: Date, today: Date): PcTaskPriority | null {
  const due = startOfDay(dueDate);
  const now = startOfDay(today);

  if (due.getTime() > now.getTime()) return null;
  if (due.getTime() === now.getTime()) return 'dueToday';
  return 'delayed';
}

function daysOverdue(dueDate: Date, today: Date): number {
  const due = startOfDay(dueDate);
  const now = startOfDay(today);
  const diff = now.getTime() - due.getTime();
  return diff <= 0 ? 0 : Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatDelayedBadge(days: number): string {
  if (days === 1) return 'Delayed 1 day';
  return `Delayed ${days} days`;
}

export function formatOverdueDays(days: number): string {
  if (days <= 0) return '—';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export function matchesDelayedRange(
  daysOverdue: number,
  range: DelayedRangeFilter
): boolean {
  if (range === 'all') return daysOverdue > 0;
  if (range === '1') return daysOverdue === 1;
  if (range === '2') return daysOverdue === 2;
  if (range === '3') return daysOverdue === 3;
  if (range === '5') return daysOverdue === 5;
  if (range === '10') return daysOverdue === 10;
  return daysOverdue >= 31;
}

export function getDelayedRangeCounts(tasks: PcTask[]): Record<DelayedRangeFilter, number> {
  const delayed = tasks.filter((task) => task.priority === 'delayed');
  return DELAYED_RANGE_OPTIONS.reduce(
    (acc, { value }) => {
      acc[value] = delayed.filter((task) =>
        matchesDelayedRange(task.daysOverdue, value)
      ).length;
      return acc;
    },
    {} as Record<DelayedRangeFilter, number>
  );
}

function isFuturePlanStart(planStart: string | undefined, today: Date): boolean {
  if (!planStart?.trim()) return false;
  const start = parseFlexibleDate(planStart);
  if (!start) return false;
  return start.getTime() > startOfDay(today).getTime();
}

function resolveScheduleDueDate(
  planEnd?: string,
  planStart?: string
): Date | null {
  return parseFlexibleDate(planEnd) || parseFlexibleDate(planStart);
}

function buildScheduleTask(
  source: 'drawing' | 'tracker',
  row: {
    key: string;
    project: string;
    drawingName?: string;
    taskName?: string;
    drawingNo?: string;
    trackerId?: string;
    doerName?: string;
    planStartDate?: string;
    planEndDate?: string;
    actualEndDate?: string;
    actualStartDate?: string;
  },
  today: Date
): PcTask | null {
  if (row.actualEndDate?.trim()) return null;
  if (isFuturePlanStart(row.planStartDate, today)) return null;

  const dueDate = resolveScheduleDueDate(row.planEndDate, row.planStartDate);
  if (!dueDate) return null;

  const priority = classifyDueDate(dueDate, today);
  if (!priority) return null;

  const taskName =
    source === 'drawing'
      ? row.drawingName || row.drawingNo || 'Drawing'
      : row.taskName || row.trackerId || 'Tracker task';

  const statusLabel = row.actualStartDate?.trim() ? 'In Progress' : 'Pending';

  return {
    id: `${source}-${row.key}`,
    source,
    moduleLabel: MODULE_LABELS[source],
    project: row.project,
    taskName,
    doer: getDoerLabel(row.doerName),
    dueDate,
    dueDateLabel: formatDueLabel(dueDate),
    priority,
    daysOverdue: daysOverdue(dueDate, today),
    statusLabel,
    linkHref: MODULE_LINKS[source],
  };
}

export function normalizeDrawingTasks(
  bundles: DrawingProjectBundle[],
  today = new Date()
): PcTask[] {
  const rows = buildDrawingDoerTasksFromProjects(bundles);
  return rows
    .map((row) => buildScheduleTask('drawing', row, today))
    .filter((task): task is PcTask => task !== null);
}

export function normalizeTrackerTasks(
  bundles: TrackerProjectBundle[],
  today = new Date()
): PcTask[] {
  const rows = buildTrackerDoerTasksFromProjects(bundles);
  return rows
    .map((row) => buildScheduleTask('tracker', row, today))
    .filter((task): task is PcTask => task !== null);
}

export function normalizeEmDesignTasks(
  tasks: EmDesignTask[],
  today = new Date()
): PcTask[] {
  const results: PcTask[] = [];

  for (const task of tasks) {
    if ((task.status || 'Pending') === 'Completed') continue;

    const dueDate = parseFlexibleDate(task.planned_date);
    if (!dueDate) continue;

    const priority = classifyDueDate(dueDate, today);
    if (!priority) continue;

    results.push({
      id: `em-design-${task.rowIndex ?? task.project_name}-${task.work_name}`,
      source: 'em_design',
      moduleLabel: MODULE_LABELS.em_design,
      project: task.project_name || '—',
      taskName: task.work_name || task.work_type || 'Design task',
      doer: getDoerLabel(task.doer_name),
      dueDate,
      dueDateLabel: formatDueLabel(dueDate),
      priority,
      daysOverdue: daysOverdue(dueDate, today),
      statusLabel: task.status || 'Pending',
      linkHref: MODULE_LINKS.em_design,
    });
  }

  return results;
}

export function normalizeEmExecutionTasks(
  tasks: EmExecutionTask[],
  today = new Date()
): PcTask[] {
  const results: PcTask[] = [];

  for (const task of tasks) {
    if ((task.status || 'Pending') === 'Completed') continue;

    const workFrom = parseFlexibleDate(task.work_from);
    if (workFrom && workFrom.getTime() > startOfDay(today).getTime()) continue;

    const dueDate = parseFlexibleDate(task.work_to);
    if (!dueDate) continue;

    const priority = classifyDueDate(dueDate, today);
    if (!priority) continue;

    results.push({
      id: `em-exec-${task.rowIndex ?? task.project_name}-${task.work_name}`,
      source: 'em_execution',
      moduleLabel: MODULE_LABELS.em_execution,
      project: task.project_name || '—',
      taskName: task.work_name || 'Execution task',
      doer: getDoerLabel(task.doer || task.supervisor_name),
      dueDate,
      dueDateLabel: formatDueLabel(dueDate),
      priority,
      daysOverdue: daysOverdue(dueDate, today),
      statusLabel: task.status || 'Pending',
      linkHref: MODULE_LINKS.em_execution,
    });
  }

  return results;
}

function normalizePipelineTasks(
  source: 'sales' | 'hrms',
  records: Array<SalesLead | HrmsCandidate>,
  today: Date,
  options: {
    stepNames: Record<number, string>;
    maxStep?: number;
    normalizeFollowUpDate?: (dateStr: string) => string;
    getLabel: (record: SalesLead | HrmsCandidate) => string;
    getDoer: (record: SalesLead | HrmsCandidate) => string;
    getProject: (record: SalesLead | HrmsCandidate) => string;
  }
): PcTask[] {
  const results: PcTask[] = [];
  const todayStart = startOfDay(today);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  for (const record of records) {
    if (record.lost_remark?.trim()) continue;

    const status = getPendingStepStatus(record, {
      now: today,
      stepNames: options.stepNames,
      maxStep: options.maxStep,
      normalizeFollowUpDate: options.normalizeFollowUpDate,
    });
    if (!status) continue;

    const dueDay = startOfDay(status.plannedDate);
    if (dueDay.getTime() >= tomorrowStart.getTime()) continue;

    const priority: PcTaskPriority =
      dueDay.getTime() < todayStart.getTime() ? 'delayed' : 'dueToday';

    results.push({
      id: `${source}-${(record as SalesLead).id || options.getLabel(record)}-${status.step}`,
      source,
      moduleLabel: MODULE_LABELS[source],
      project: options.getProject(record),
      taskName: status.stepName,
      doer: options.getDoer(record),
      dueDate: status.plannedDate,
      dueDateLabel: status.formattedPlannedDate,
      priority,
      daysOverdue: daysOverdue(status.plannedDate, today),
      statusLabel: status.isFollowUp ? 'Follow Up' : 'Pending',
      linkHref: MODULE_LINKS[source],
    });
  }

  return results;
}

export function normalizeSalesLeads(leads: SalesLead[], today = new Date()): PcTask[] {
  const activeLeads = leads.filter(
    (lead) => !isSalesLeadLost(lead) && !isSalesLeadClosed(lead)
  );
  return normalizePipelineTasks('sales', activeLeads, today, {
    stepNames: SALES_STEP_NAMES,
    maxStep: SALES_MAX_STEP,
    getLabel: (r) => (r as SalesLead).name || 'Lead',
    getDoer: (r) => getDoerLabel((r as SalesLead).salesman),
    getProject: (r) => (r as SalesLead).name || 'Lead',
  });
}

export function normalizeHrmsCandidates(
  candidates: HrmsCandidate[],
  today = new Date()
): PcTask[] {
  return normalizePipelineTasks('hrms', candidates, today, {
    stepNames: HRMS_STEP_NAMES,
    normalizeFollowUpDate: normalizeHrmsFollowUpDate,
    getLabel: (r) => (r as HrmsCandidate).employee_name || 'Candidate',
    getDoer: (r) => getDoerLabel((r as HrmsCandidate).post_applied),
    getProject: (r) => (r as HrmsCandidate).post_applied || 'HRMS',
  });
}

export function buildPcDashboardTasks(
  raw: PcDashboardRawData,
  today = new Date()
): PcTask[] {
  const tasks = [
    ...normalizeDrawingTasks(raw.drawingBundles, today),
    ...normalizeTrackerTasks(raw.trackerBundles, today),
    ...normalizeEmDesignTasks(raw.emDesignTasks, today),
    ...normalizeEmExecutionTasks(raw.emExecutionTasks, today),
    ...normalizeSalesLeads(raw.salesLeads, today),
    ...normalizeHrmsCandidates(raw.hrmsCandidates, today),
  ];

  return sortPcTasks(tasks);
}

export function sortPcTasks(tasks: PcTask[]): PcTask[] {
  return [...tasks].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority === 'delayed' ? -1 : 1;
    }
    if (a.daysOverdue !== b.daysOverdue) {
      return b.daysOverdue - a.daysOverdue;
    }
    const doerCmp = a.doer.localeCompare(b.doer);
    if (doerCmp !== 0) return doerCmp;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });
}

export function filterPcTasksForUser(
  tasks: PcTask[],
  user: { name?: string; role?: string } | null | undefined
): PcTask[] {
  if (!user || canViewAllEmTasks(user.role)) return tasks;

  return tasks.filter((task) =>
    isTaskAssignedToUser({ doerName: task.doer, doer_name: task.doer, doer: task.doer }, user.name)
  );
}

export function getPcTaskStats(tasks: PcTask[]) {
  const byModule = tasks.reduce<Record<PcTaskSource, number>>(
    (acc, task) => {
      acc[task.source] = (acc[task.source] || 0) + 1;
      return acc;
    },
    {} as Record<PcTaskSource, number>
  );

  return {
    total: tasks.length,
    delayed: tasks.filter((t) => t.priority === 'delayed').length,
    dueToday: tasks.filter((t) => t.priority === 'dueToday').length,
    byModule,
  };
}

export { MODULE_LABELS as PC_MODULE_LABELS };
