import { NextRequest, NextResponse } from 'next/server';
import {
  appendCompletionRows,
  deleteCompletionRow,
  loadCompletions,
  loadMasterTasks,
} from '@/lib/ultimate-checklist-sheets';
import {
  buildChecklistRows,
  datesMatch,
  formatSheetDate,
  occurrenceDates,
  parseSheetDate,
} from '@/lib/ultimate-checklist';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [masters, completions] = await Promise.all([loadMasterTasks(), loadCompletions()]);
    return NextResponse.json(buildChecklistRows(masters, completions));
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Ultimate Checklist):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const completedBy = typeof body.completed_by === 'string' ? body.completed_by.trim() : '';
    const rawItems = Array.isArray(body.items) && body.items.length > 0
      ? body.items
      : [{ task_id: body.task_id, occurrence_date: body.occurrence_date }];

    const requested = rawItems.map((item: { task_id?: unknown; occurrence_date?: unknown }) => ({
      taskId: typeof item?.task_id === 'string' ? item.task_id.trim() : '',
      occurrence: parseSheetDate(typeof item?.occurrence_date === 'string' ? item.occurrence_date : ''),
    }));

    if (requested.some((item: { taskId: string; occurrence: Date | null }) => !item.taskId || !item.occurrence)) {
      return NextResponse.json({ error: 'Each selected task needs a due date.' }, { status: 400 });
    }

    const [masters, completions] = await Promise.all([loadMasterTasks(), loadCompletions()]);
    const completedAt = new Date().toLocaleString('en-GB');
    const rows: string[][] = [];

    for (const item of requested) {
      const master = masters.find((task) => task.task_id === item.taskId);
      if (!master) {
        return NextResponse.json({ error: 'One of the selected tasks was not found.' }, { status: 404 });
      }
      const anchor = parseSheetDate(master.due_date);
      const dates = anchor ? occurrenceDates(anchor, master.frequency) : [];
      const occurrenceLabel = formatSheetDate(item.occurrence as Date);
      const allowed = dates.some((date) => datesMatch(formatSheetDate(date), occurrenceLabel));
      if (!allowed) {
        return NextResponse.json({ error: 'One of the selected dates cannot be completed.' }, { status: 400 });
      }
      const duplicate = completions.find(
        (completion) => completion.task_id === item.taskId && datesMatch(completion.occurrence_date, occurrenceLabel)
      ) || rows.some((row) => row[0] === item.taskId && row[1] === occurrenceLabel);
      if (duplicate) {
        return NextResponse.json({ error: 'One of the selected tasks is already completed.' }, { status: 409 });
      }
      rows.push([item.taskId, occurrenceLabel, completedAt, completedBy, 'Completed']);
    }

    await appendCompletionRows(rows);
    return NextResponse.json({ success: true, count: rows.length });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Ultimate Checklist):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rowIndexStr = searchParams.get('rowIndex');
    if (!rowIndexStr) return NextResponse.json({ error: 'Missing Row Index' }, { status: 400 });
    const rowIndex = parseInt(rowIndexStr, 10);
    if (!Number.isFinite(rowIndex) || rowIndex < 2) {
      return NextResponse.json({ error: 'Invalid Row Index' }, { status: 400 });
    }

    const existing = (await loadCompletions()).find((item) => item.rowIndex === rowIndex);
    if (!existing) {
      return NextResponse.json({ error: 'Completion not found.' }, { status: 404 });
    }

    await deleteCompletionRow(rowIndex);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (DELETE Ultimate Checklist):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
