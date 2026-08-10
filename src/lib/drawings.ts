import { CONFIG } from '@/lib/config';
import { quoteSheetRange, sanitizeSheetTitle } from '@/lib/pms-tracker';

export { quoteSheetRange, sanitizeSheetTitle };

export const DRAWING_HEADERS = [
  'Drawing No.',
  'Zone',
  'Area Name',
  'Drawing Name',
  'Resource Name',
  'Doer Name',
  'Category',
  'Planned Start Date',
  'Planned End Date',
  'Actual Start Date',
  'Actual End Date',
  'Revision No.',
  'Last Updated Timestamp',
  'Drawing Image',
] as const;

export const DRAWING_LEGACY_SHEETS = new Set([
  CONFIG.DRAWING_SCHEDULE.TEMPLATES_SHEET,
  CONFIG.DRAWING_SCHEDULE.SUBMISSIONS_SHEET,
  CONFIG.DRAWING_SCHEDULE.PLANNED_SHEET,
]);

export interface DrawingRow {
  rowIndex: number;
  id: string;
  drawingNo: string;
  zone: string;
  areaName: string;
  drawingName: string;
  resourceName: string;
  doerName: string;
  category: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  revisionNo: string;
  lastUpdated: string;
  drawingImage: string;
}

export function parseDrawingRows(data: string[][] | null | undefined): DrawingRow[] {
  if (!data || data.length === 0) return [];

  return data
    .map((row, index) => {
      const rowIndex = index + 2;
      const drawingNo = row[0] || '';
      return {
        rowIndex,
        id: drawingNo || `DRW-ROW-${rowIndex}`,
        drawingNo,
        zone: row[1] || '',
        areaName: row[2] || '',
        drawingName: row[3] || '',
        resourceName: row[4] || '',
        doerName: row[5] || '',
        category: row[6] || 'Uncategorized',
        plannedStartDate: row[7] || '',
        plannedEndDate: row[8] || '',
        actualStartDate: row[9] || '',
        actualEndDate: row[10] || '',
        revisionNo: row[11] || '0',
        lastUpdated: row[12] || '',
        drawingImage: row[13] || '',
      };
    })
    .filter((t) => t.drawingName.trim());
}

export function toDrawingSheetRow(item: {
  drawingNo?: string;
  zone?: string;
  areaName?: string;
  drawingName?: string;
  resourceName?: string;
  doerName?: string;
  category?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  revisionNo?: string;
  lastUpdated?: string;
  drawingImage?: string;
}): string[] {
  return [
    item.drawingNo || '',
    item.zone || '',
    item.areaName || '',
    item.drawingName || '',
    item.resourceName || '',
    item.doerName || '',
    item.category || 'Uncategorized',
    item.plannedStartDate || '',
    item.plannedEndDate || '',
    item.actualStartDate || '',
    item.actualEndDate || '',
    item.revisionNo || '0',
    item.lastUpdated || '',
    item.drawingImage || '',
  ];
}

/** Structure-only copy for install: blank dates, revision, image. */
export function toDrawingInstallSheetRow(item: DrawingRow | {
  drawingNo?: string;
  zone?: string;
  areaName?: string;
  drawingName?: string;
  resourceName?: string;
  doerName?: string;
  category?: string;
}): string[] {
  return toDrawingSheetRow({
    drawingNo: item.drawingNo,
    zone: item.zone,
    areaName: item.areaName,
    drawingName: item.drawingName,
    resourceName: item.resourceName,
    doerName: item.doerName,
    category: item.category,
    plannedStartDate: '',
    plannedEndDate: '',
    actualStartDate: '',
    actualEndDate: '',
    revisionNo: '0',
    lastUpdated: '',
    drawingImage: '',
  });
}

export function nextDrawingNo(existing: { drawingNo: string }[]): string {
  let max = 1000;
  for (const row of existing) {
    const match = row.drawingNo?.match(/DRW-(\d+)/i) || row.drawingNo?.match(/(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `DRW-${max + 1}`;
}

export function isDrawingProjectSheetTitle(title: string): boolean {
  return Boolean(title?.trim()) && !DRAWING_LEGACY_SHEETS.has(title.trim());
}
