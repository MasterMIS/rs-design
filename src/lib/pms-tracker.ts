import { CONFIG } from '@/lib/config';

export const PMS_HEADERS = [
  'Tracker ID',
  'Area Name',
  'Task Name',
  'Resource Name',
  'Doer Name',
  'Category',
  'Planned Start Date',
  'Planned End Date',
  'Actual Start Date',
  'Actual End Date',
] as const;

export const PMS_SHEET_DATA_RANGE = 'A2:J1000';
export const PMS_SHEET_FULL_RANGE = 'A1:J1000';

export function pmsRowA1(rowIndex: number) {
  return `A${rowIndex}:J${rowIndex}`;
}

export const PMS_LEGACY_SHEETS = new Set([
  CONFIG.PMS_TRACKER.TEMPLATES_SHEET,
  CONFIG.PMS_TRACKER.SUBMISSIONS_SHEET,
  CONFIG.PMS_TRACKER.PLANNED_SHEET,
]);

export interface PmsTrackerRow {
  rowIndex: number;
  id: string;
  trackerId: string;
  areaName: string;
  taskName: string;
  resourceName: string;
  doerName: string;
  category: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
}

/** Google Sheets tab title: max 100 chars; cannot contain : \ / ? * [ ] */
export function sanitizeSheetTitle(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[:\\\/\?\*\[\]]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 100);
  return cleaned || 'Untitled Project';
}

export function quoteSheetRange(sheetName: string, a1Range: string): string {
  const escaped = sheetName.replace(/'/g, "''");
  return `'${escaped}'!${a1Range}`;
}

export function parsePmsRows(data: string[][] | null | undefined): PmsTrackerRow[] {
  if (!data || data.length === 0) return [];

  return data
    .map((row, index) => {
      const rowIndex = index + 2;
      const trackerId = row[0] || '';
      return {
        rowIndex,
        id: trackerId || `PMS-ROW-${rowIndex}`,
        trackerId,
        areaName: row[1] || '',
        taskName: row[2] || '',
        resourceName: row[3] || '',
        doerName: row[4] || '',
        category: row[5] || 'Uncategorized',
        plannedStartDate: row[6] || '',
        plannedEndDate: row[7] || '',
        actualStartDate: row[8] || '',
        actualEndDate: row[9] || '',
      };
    })
    .filter((t) => t.taskName.trim());
}

export function toPmsSheetRow(item: {
  trackerId?: string;
  areaName?: string;
  taskName?: string;
  resourceName?: string;
  doerName?: string;
  category?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
}): string[] {
  return [
    item.trackerId || '',
    item.areaName || '',
    item.taskName || '',
    item.resourceName || '',
    item.doerName || '',
    item.category || 'Uncategorized',
    item.plannedStartDate || '',
    item.plannedEndDate || '',
    item.actualStartDate || '',
    item.actualEndDate || '',
  ];
}

/** Structure-only copy for install: blank planned/actual dates. */
export function toInstallSheetRow(item: PmsTrackerRow | {
  trackerId?: string;
  areaName?: string;
  taskName?: string;
  resourceName?: string;
  doerName?: string;
  category?: string;
}): string[] {
  return toPmsSheetRow({
    trackerId: item.trackerId,
    areaName: item.areaName,
    taskName: item.taskName,
    resourceName: item.resourceName,
    doerName: item.doerName,
    category: item.category,
    plannedStartDate: '',
    plannedEndDate: '',
    actualStartDate: '',
    actualEndDate: '',
  });
}

export function nextPmsTrackerId(existing: { trackerId: string }[]): string {
  let max = 1000;
  for (const row of existing) {
    const match = row.trackerId?.match(/PMS-(\d+)/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `PMS-${max + 1}`;
}

export function isProjectSheetTitle(title: string): boolean {
  return Boolean(title?.trim()) && !PMS_LEGACY_SHEETS.has(title.trim());
}
