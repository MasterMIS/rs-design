import { NextRequest, NextResponse } from 'next/server';
import {
  appendSheetsData,
  deleteSheetRow,
  getSheetsData,
  listSheetTitles,
  sheetExists,
  updateSheetRow,
} from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';
import {
  isProjectSheetTitle,
  nextPmsTrackerId,
  parsePmsRows,
  pmsRowA1,
  PMS_SHEET_DATA_RANGE,
  quoteSheetRange,
  sanitizeSheetTitle,
  toPmsSheetRow,
  type PmsTrackerRow,
} from '@/lib/pms-tracker';

const SHEET_ID = CONFIG.PMS_TRACKER.SHEET_ID;

async function loadProjectTasks(project: string): Promise<PmsTrackerRow[]> {
  const data = await getSheetsData(SHEET_ID, quoteSheetRange(project, PMS_SHEET_DATA_RANGE));
  return parsePmsRows(data as string[][] | undefined);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === '1';
    const projectParam = searchParams.get('project');

    if (all) {
      const titles = await listSheetTitles(SHEET_ID);
      const projects = titles.filter(isProjectSheetTitle);
      const results: { project: string; tasks: PmsTrackerRow[] }[] = [];

      for (const project of projects) {
        const tasks = await loadProjectTasks(project);
        results.push({ project, tasks });
      }

      return NextResponse.json(results);
    }

    if (!projectParam?.trim()) {
      return NextResponse.json(
        { error: 'Missing project query parameter. Use ?project=Name or ?all=1.' },
        { status: 400 }
      );
    }

    const project = sanitizeSheetTitle(projectParam);
    const exists = await sheetExists(SHEET_ID, project);
    if (!exists) {
      return NextResponse.json(
        { installed: false, project, tasks: [] },
        { status: 404 }
      );
    }

    const tasks = await loadProjectTasks(project);
    return NextResponse.json({ installed: true, project, tasks });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET PMS Tracker):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const project = sanitizeSheetTitle(body.project || '');

    if (!project) {
      return NextResponse.json({ error: 'Project name is required.' }, { status: 400 });
    }

    if (!(await sheetExists(SHEET_ID, project))) {
      return NextResponse.json(
        { error: `Project sheet "${project}" not found. Install tasks first.` },
        { status: 404 }
      );
    }

    const {
      trackerId,
      areaName,
      taskName,
      resourceName,
      doerName,
      category,
      plannedStartDate,
      plannedEndDate,
      actualStartDate,
      actualEndDate,
    } = body;

    if (!taskName) {
      return NextResponse.json({ error: 'Task Name is required.' }, { status: 400 });
    }

    let finalTrackerId = trackerId || '';
    if (!finalTrackerId.trim()) {
      const existing = await loadProjectTasks(project);
      finalTrackerId = nextPmsTrackerId(existing);
    }

    const newRow = toPmsSheetRow({
      trackerId: finalTrackerId,
      areaName,
      taskName,
      resourceName,
      doerName,
      category,
      plannedStartDate,
      plannedEndDate,
      actualStartDate,
      actualEndDate,
    });

    await appendSheetsData(SHEET_ID, quoteSheetRange(project, 'A2'), [newRow]);

    return NextResponse.json({ success: true, trackerId: finalTrackerId });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST PMS Tracker):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rowIndexStr = searchParams.get('rowIndex');
    const projectParam = searchParams.get('project');

    if (!rowIndexStr) {
      return NextResponse.json({ error: 'Missing Row Index' }, { status: 400 });
    }
    if (!projectParam?.trim()) {
      return NextResponse.json({ error: 'Missing project query parameter.' }, { status: 400 });
    }

    const project = sanitizeSheetTitle(projectParam);
    const rowIndex = parseInt(rowIndexStr, 10);

    if (!(await sheetExists(SHEET_ID, project))) {
      return NextResponse.json(
        { error: `Project sheet "${project}" not found.` },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      trackerId,
      areaName,
      taskName,
      resourceName,
      doerName,
      category,
      plannedStartDate,
      plannedEndDate,
      actualStartDate,
      actualEndDate,
    } = body;

    if (!taskName) {
      return NextResponse.json({ error: 'Task Name is required.' }, { status: 400 });
    }

    const updatedRow = toPmsSheetRow({
      trackerId,
      areaName,
      taskName,
      resourceName,
      doerName,
      category,
      plannedStartDate,
      plannedEndDate,
      actualStartDate,
      actualEndDate,
    });

    await updateSheetRow(
      SHEET_ID,
      quoteSheetRange(project, pmsRowA1(rowIndex)),
      [updatedRow]
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT PMS Tracker):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rowIndexStr = searchParams.get('rowIndex');
    const projectParam = searchParams.get('project');

    if (!rowIndexStr) {
      return NextResponse.json({ error: 'Missing Row Index' }, { status: 400 });
    }
    if (!projectParam?.trim()) {
      return NextResponse.json({ error: 'Missing project query parameter.' }, { status: 400 });
    }

    const project = sanitizeSheetTitle(projectParam);
    const rowIndex = parseInt(rowIndexStr, 10);

    if (!(await sheetExists(SHEET_ID, project))) {
      return NextResponse.json(
        { error: `Project sheet "${project}" not found.` },
        { status: 404 }
      );
    }

    await deleteSheetRow(SHEET_ID, project, rowIndex - 1);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (DELETE PMS Tracker):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
