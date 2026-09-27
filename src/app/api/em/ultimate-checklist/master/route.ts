import { NextRequest, NextResponse } from 'next/server';
import {
  appendMasterRows,
  deleteCompletionsForTask,
  deleteMasterRow,
  loadMasterTasks,
  updateMasterRow,
} from '@/lib/ultimate-checklist-sheets';
import {
  createTaskId,
  formatSheetDate,
  normalizeFrequency,
  parseSheetDate,
} from '@/lib/ultimate-checklist';

export const dynamic = 'force-dynamic';

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readTaskBody(body: Record<string, unknown>) {
  const category = text(body.category);
  const task = text(body.task);
  const doerName = text(body.doer_name);
  const department = text(body.department);
  const frequency = normalizeFrequency(text(body.frequency));
  const dueDates = readDueDates(body, frequency || '');

  if (!category || !task || !doerName || !department || !frequency || 'error' in dueDates) {
    return {
      error: 'error' in dueDates
        ? dueDates.error
        : 'Category, task, doer, department, frequency, and due date are required.',
    };
  }

  return {
    category,
    task,
    doerName,
    department,
    frequency,
    dueDates: dueDates.dates,
  };
}

function readDueDates(body: Record<string, unknown>, frequency: string) {
  const rawValues = Array.isArray(body.due_dates) && body.due_dates.length > 0
    ? body.due_dates
    : [body.due_date];
  const dates: string[] = [];

  for (const value of rawValues) {
    const parsed = parseSheetDate(text(value));
    if (!parsed) return { error: 'Each due date must be a valid date.' };
    const label = formatSheetDate(parsed);
    if (!dates.includes(label)) dates.push(label);
  }

  if (!dates.length) return { error: 'At least one due date is required.' };
  if (frequency === 'Daily' && dates.length > 1) {
    return { error: 'A daily task can have only one start date.' };
  }

  return { dates };
}

export async function GET() {
  try {
    const tasks = await loadMasterTasks();
    return NextResponse.json(tasks);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Ultimate Checklist Master):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = readTaskBody(body);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const createdAt = new Date().toLocaleString('en-GB');
    const rows = parsed.dueDates.map((dueDate, index) => [
      createTaskId(index),
      parsed.category,
      parsed.task,
      parsed.doerName,
      parsed.department,
      parsed.frequency,
      dueDate,
      createdAt,
    ]);
    await appendMasterRows(rows);

    return NextResponse.json({ success: true, count: rows.length, task_id: rows[0][0] });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Ultimate Checklist Master):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rowIndexStr = searchParams.get('rowIndex');
    if (!rowIndexStr) return NextResponse.json({ error: 'Missing Row Index' }, { status: 400 });
    const rowIndex = parseInt(rowIndexStr, 10);
    if (!Number.isFinite(rowIndex) || rowIndex < 2) {
      return NextResponse.json({ error: 'Invalid Row Index' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = readTaskBody(body);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const existing = (await loadMasterTasks()).find((task) => task.rowIndex === rowIndex);
    if (!existing?.task_id) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    await updateMasterRow(rowIndex, [
      existing.task_id,
      parsed.category,
      parsed.task,
      parsed.doerName,
      parsed.department,
      parsed.frequency,
      parsed.dueDates[0],
      existing.created_at || text(body.created_at),
    ]);

    return NextResponse.json({ success: true, task_id: existing.task_id });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT Ultimate Checklist Master):', err);
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

    const existing = (await loadMasterTasks()).find((task) => task.rowIndex === rowIndex);
    if (!existing) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    if (existing.task_id) {
      await deleteCompletionsForTask(existing.task_id);
    }
    await deleteMasterRow(rowIndex);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (DELETE Ultimate Checklist Master):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
