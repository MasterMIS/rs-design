import {
  appendSheetsData,
  deleteSheetRow,
  getSheetsData,
  updateSheetRow,
} from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';
import {
  CHECKLIST_HEADERS,
  MASTER_HEADERS,
  type CompletionRecord,
  type MasterTask,
} from '@/lib/ultimate-checklist';

const SHEET_ID = CONFIG.ULTIMATE_CHECKLIST.SHEET_ID;
const MASTER_SHEET = CONFIG.ULTIMATE_CHECKLIST.MASTER_SHEET;
const CHECKLIST_SHEET = CONFIG.ULTIMATE_CHECKLIST.CHECKLIST_SHEET;

function columnLetter(count: number) {
  return String.fromCharCode(64 + count);
}

async function ensureHeaderRow(sheetName: string, headers: readonly string[]) {
  const endCol = columnLetter(headers.length);
  const existing = await getSheetsData(SHEET_ID, `${sheetName}!A1:${endCol}1`);
  const firstCell = existing?.[0]?.[0]?.toString().trim();
  if (!firstCell) {
    await updateSheetRow(SHEET_ID, `${sheetName}!A1:${endCol}1`, [Array.from(headers)]);
  }
}

export async function ensureUltimateChecklistHeaders() {
  await Promise.all([
    ensureHeaderRow(MASTER_SHEET, MASTER_HEADERS),
    ensureHeaderRow(CHECKLIST_SHEET, CHECKLIST_HEADERS),
  ]);
}

export async function loadMasterTasks(): Promise<MasterTask[]> {
  await ensureHeaderRow(MASTER_SHEET, MASTER_HEADERS);
  const data = await getSheetsData(SHEET_ID, `${MASTER_SHEET}!A2:H`);
  if (!data?.length) return [];

  return data
    .map((row: string[], index: number) => {
      const taskId = (row[0] || '').trim();
      const task = (row[2] || '').trim();
      if (!taskId && !task) return null;
      if (taskId.toLowerCase() === 'task_id') return null;

      return {
        rowIndex: index + 2,
        task_id: taskId,
        category: row[1] || '',
        task,
        doer_name: row[3] || '',
        department: row[4] || '',
        frequency: row[5] || '',
        due_date: row[6] || '',
        created_at: row[7] || '',
      } satisfies MasterTask;
    })
    .filter((row): row is MasterTask => !!row);
}

export async function loadCompletions(): Promise<CompletionRecord[]> {
  await ensureHeaderRow(CHECKLIST_SHEET, CHECKLIST_HEADERS);
  const data = await getSheetsData(SHEET_ID, `${CHECKLIST_SHEET}!A2:E`);
  if (!data?.length) return [];

  return data
    .map((row: string[], index: number) => {
      const taskId = (row[0] || '').trim();
      if (!taskId || taskId.toLowerCase() === 'task_id') return null;

      return {
        rowIndex: index + 2,
        task_id: taskId,
        occurrence_date: row[1] || '',
        completed_at: row[2] || '',
        completed_by: row[3] || '',
        status: row[4] || 'Completed',
      } satisfies CompletionRecord;
    })
    .filter((row): row is CompletionRecord => !!row);
}

export async function appendMasterRow(values: string[]) {
  await appendMasterRows([values]);
}

export async function appendMasterRows(rows: string[][]) {
  if (!rows.length) return;
  await ensureHeaderRow(MASTER_SHEET, MASTER_HEADERS);
  await appendSheetsData(SHEET_ID, `${MASTER_SHEET}!A2`, rows);
}

export async function updateMasterRow(rowIndex: number, values: string[]) {
  await updateSheetRow(SHEET_ID, `${MASTER_SHEET}!A${rowIndex}:H${rowIndex}`, [values]);
}

export async function deleteMasterRow(rowIndex: number) {
  await deleteSheetRow(SHEET_ID, MASTER_SHEET, rowIndex - 1);
}

export async function appendCompletionRow(values: string[]) {
  await appendCompletionRows([values]);
}

export async function appendCompletionRows(rows: string[][]) {
  if (!rows.length) return;
  await ensureHeaderRow(CHECKLIST_SHEET, CHECKLIST_HEADERS);
  await appendSheetsData(SHEET_ID, `${CHECKLIST_SHEET}!A2`, rows);
}

export async function deleteCompletionRow(rowIndex: number) {
  await deleteSheetRow(SHEET_ID, CHECKLIST_SHEET, rowIndex - 1);
}

export async function deleteCompletionsForTask(taskId: string) {
  const completions = await loadCompletions();
  const rowIndexes = completions
    .filter((item) => item.task_id === taskId)
    .map((item) => item.rowIndex)
    .sort((left, right) => right - left);

  for (const rowIndex of rowIndexes) {
    await deleteCompletionRow(rowIndex);
  }
}
