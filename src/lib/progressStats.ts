export interface ProgressItem {
  category: string;
  completed: boolean;
}

export interface ProgressStats {
  total: number;
  completed: number;
  pending: number;
  percent: number;
  pieData: { name: string; value: number }[];
  categoryStats: {
    name: string;
    total: number;
    completed: number;
    pending: number;
    percent: number;
  }[];
}

export function isTrackerCompleted(actualDate?: string) {
  return !!actualDate?.trim();
}

export function isDrawingCompleted(row: {
  actualDate?: string;
  clientStatus?: string;
}) {
  if (row.actualDate?.trim()) return true;
  const status = row.clientStatus?.toLowerCase() || '';
  return status.includes('approved') || status.includes('complete');
}

export function computeProgress(items: ProgressItem[]): ProgressStats {
  const total = items.length;
  const completed = items.filter((i) => i.completed).length;
  const pending = total - completed;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const categoryMap = new Map<string, { total: number; completed: number }>();
  for (const item of items) {
    const cat = item.category?.trim() || 'Other';
    const entry = categoryMap.get(cat) || { total: 0, completed: 0 };
    entry.total += 1;
    if (item.completed) entry.completed += 1;
    categoryMap.set(cat, entry);
  }

  const categoryStats = Array.from(categoryMap.entries())
    .map(([name, stats]) => ({
      name,
      total: stats.total,
      completed: stats.completed,
      pending: stats.total - stats.completed,
      percent:
        stats.total > 0
          ? Math.round((stats.completed / stats.total) * 100)
          : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    total,
    completed,
    pending,
    percent,
    pieData: [
      { name: 'Completed', value: completed },
      { name: 'Pending', value: pending },
    ],
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
