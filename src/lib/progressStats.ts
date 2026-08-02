export interface ProgressItem {
  category: string;
  completed: boolean;
  inProgress?: boolean;
}

export interface ProgressStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  percent: number;
  pieData: { name: string; value: number }[];
  categoryStats: {
    name: string;
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    percent: number;
  }[];
}

export function isTrackerCompleted(row: {
  actualStartDate?: string;
  actualEndDate?: string;
}) {
  return !!row.actualEndDate?.trim();
}

export function isTrackerInProgress(row: {
  actualStartDate?: string;
  actualEndDate?: string;
}) {
  if (isTrackerCompleted(row)) return false;
  return !!row.actualStartDate?.trim();
}

export function isDrawingCompleted(row: {
  actualStartDate?: string;
  actualEndDate?: string;
  clientStatus?: string;
}) {
  if (row.actualEndDate?.trim()) return true;
  const status = row.clientStatus?.toLowerCase() || '';
  return status.includes('approved') || status.includes('complete');
}

export function isDrawingInProgress(row: {
  actualStartDate?: string;
  actualEndDate?: string;
  clientStatus?: string;
}) {
  if (isDrawingCompleted(row)) return false;
  return !!row.actualStartDate?.trim();
}

export function computeProgressPercent(completed: number, total: number): number {
  if (total === 0) return 0;
  const raw = (completed / total) * 100;
  if (raw > 0 && raw < 1) return 1;
  return Math.round(raw);
}

export function formatProgressPercent(completed: number, total: number, percent: number): string {
  if (total === 0 || completed === 0) return `${percent}%`;
  if (percent === 0) return '<1%';
  return `${percent}%`;
}

export function computeProgress(items: ProgressItem[]): ProgressStats {
  const total = items.length;
  const completed = items.filter((i) => i.completed).length;
  const inProgress = items.filter((i) => !i.completed && i.inProgress).length;
  const pending = total - completed - inProgress;
  const percent = computeProgressPercent(completed, total);

  const categoryMap = new Map<
    string,
    { total: number; completed: number; inProgress: number }
  >();
  for (const item of items) {
    const cat = item.category?.trim() || 'Other';
    const entry = categoryMap.get(cat) || { total: 0, completed: 0, inProgress: 0 };
    entry.total += 1;
    if (item.completed) entry.completed += 1;
    else if (item.inProgress) entry.inProgress += 1;
    categoryMap.set(cat, entry);
  }

  const categoryStats = Array.from(categoryMap.entries())
    .map(([name, stats]) => ({
      name,
      total: stats.total,
      completed: stats.completed,
      inProgress: stats.inProgress,
      pending: stats.total - stats.completed - stats.inProgress,
      percent: computeProgressPercent(stats.completed, stats.total),
    }))
    .sort((a, b) => b.total - a.total);

  return {
    total,
    completed,
    inProgress,
    pending,
    percent,
    pieData: [
      { name: 'Completed', value: completed },
      { name: 'In Progress', value: inProgress },
      { name: 'Pending', value: pending },
    ].filter((slice) => slice.value > 0),
    categoryStats,
  };
}

export function computeAverageProjectPercent(
  projectNames: string[],
  getItemsForProject: (projectName: string) => ProgressItem[]
): number {
  if (projectNames.length === 0) return 0;
  const percents = projectNames.map((name) =>
    computeProgress(getItemsForProject(name)).percent
  );
  return Math.round(
    percents.reduce((sum, value) => sum + value, 0) / percents.length
  );
}
