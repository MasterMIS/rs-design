import { CONFIG } from '@/lib/config';
import { quoteSheetRange, sanitizeSheetTitle } from '@/lib/pms-tracker';

export { quoteSheetRange, sanitizeSheetTitle };

export const DRAWING_HEADERS = [
  'Drawing No.',
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

export const DRAWING_SHEET_DATA_RANGE = 'A2:M1000';
export const DRAWING_SHEET_FULL_RANGE = 'A1:M1000';

export function drawingRowA1(rowIndex: number) {
  return `A${rowIndex}:M${rowIndex}`;
}

export const DRAWING_LEGACY_SHEETS = new Set([
  CONFIG.DRAWING_SCHEDULE.TEMPLATES_SHEET,
  CONFIG.DRAWING_SCHEDULE.SUBMISSIONS_SHEET,
  CONFIG.DRAWING_SCHEDULE.PLANNED_SHEET,
]);

export interface DrawingRow {
  rowIndex: number;
  id: string;
  drawingNo: string;
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
        areaName: row[1] || '',
        drawingName: row[2] || '',
        resourceName: row[3] || '',
        doerName: row[4] || '',
        category: row[5] || 'Uncategorized',
        plannedStartDate: row[6] || '',
        plannedEndDate: row[7] || '',
        actualStartDate: row[8] || '',
        actualEndDate: row[9] || '',
        revisionNo: row[10] || '0',
        lastUpdated: row[11] || '',
        drawingImage: row[12] || '',
      };
    })
    .filter((t) => t.drawingName.trim());
}

export function toDrawingSheetRow(item: {
  drawingNo?: string;
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
  areaName?: string;
  drawingName?: string;
  resourceName?: string;
  doerName?: string;
  category?: string;
}): string[] {
  return toDrawingSheetRow({
    drawingNo: item.drawingNo,
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
