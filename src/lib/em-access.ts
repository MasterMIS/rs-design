export const EM_PRIVILEGED_ROLES = ['Admin', 'EA', 'PC', 'MIS'] as const;

export function canViewAllEmTasks(role?: string): boolean {
  return !!role && (EM_PRIVILEGED_ROLES as readonly string[]).includes(role);
}

export function normalizePersonName(name?: string): string {
  return name?.trim().toLowerCase() || '';
}

export function namesMatch(a?: string, b?: string): boolean {
  const left = normalizePersonName(a);
  const right = normalizePersonName(b);
  return !!left && !!right && left === right;
}

export function isTaskAssignedToUser(
  task: {
    doer?: string;
    doer_name?: string;
    doerName?: string;
    supervisor_name?: string;
  },
  userName?: string
): boolean {
  if (!userName?.trim()) return false;

  return [task.doer, task.doer_name, task.doerName, task.supervisor_name].some((field) =>
    namesMatch(field, userName)
  );
}

export function filterTasksForEmUser<
  T extends {
    doer?: string;
    doer_name?: string;
    doerName?: string;
    supervisor_name?: string;
  },
>(tasks: T[], user: { name?: string; role?: string } | null | undefined): T[] {
  if (!user || canViewAllEmTasks(user.role)) return tasks;
  return tasks.filter((task) => isTaskAssignedToUser(task, user.name));
}

export function parseFlexibleDate(dateStr?: string): Date | null {
  if (!dateStr?.trim()) return null;

  if (dateStr.includes('-')) {
    const iso = new Date(dateStr);
    if (!Number.isNaN(iso.getTime())) {
      iso.setHours(0, 0, 0, 0);
      return iso;
    }
  }

  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const parsed = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (!Number.isNaN(parsed.getTime())) {
      parsed.setHours(0, 0, 0, 0);
      return parsed;
    }
  }

  return null;
}

export function matchesDateRangeFilter(
  dateStr: string | undefined,
  startFilter: string,
  endFilter: string
): boolean {
  if (!startFilter && !endFilter) return true;

  const date = parseFlexibleDate(dateStr);
  if (!date) return false;

  if (startFilter) {
    const start = new Date(startFilter);
    start.setHours(0, 0, 0, 0);
    if (date < start) return false;
  }

  if (endFilter) {
    const end = new Date(endFilter);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }

  return true;
}

export function matchesPlanDateRange(
  planStart?: string,
  planEnd?: string,
  startFilter = '',
  endFilter = ''
): boolean {
  if (!startFilter && !endFilter) return true;

  return (
    matchesDateRangeFilter(planStart, startFilter, endFilter) ||
    matchesDateRangeFilter(planEnd, startFilter, endFilter)
  );
}

export function getDoerLabel(doerName?: string): string {
  return doerName?.trim() || 'Unassigned';
}
