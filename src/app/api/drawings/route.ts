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
  isDrawingProjectSheetTitle,
  nextDrawingNo,
  parseDrawingRows,
  quoteSheetRange,
  sanitizeSheetTitle,
  toDrawingSheetRow,
  type DrawingRow,
} from '@/lib/drawings';

const SHEET_ID = CONFIG.DRAWING_SCHEDULE.SHEET_ID;

async function loadProjectDrawings(project: string): Promise<DrawingRow[]> {
  const data = await getSheetsData(SHEET_ID, quoteSheetRange(project, 'A2:N1000'));
  return parseDrawingRows(data as string[][] | undefined);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === '1';
    const projectParam = searchParams.get('project');

    if (all) {
      const titles = await listSheetTitles(SHEET_ID);
      const projects = titles.filter(isDrawingProjectSheetTitle);
      const results: { project: string; drawings: DrawingRow[] }[] = [];

      for (const project of projects) {
        const drawings = await loadProjectDrawings(project);
        results.push({ project, drawings });
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
        { installed: false, project, drawings: [] },
        { status: 404 }
      );
    }

    const drawings = await loadProjectDrawings(project);
    return NextResponse.json({ installed: true, project, drawings });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Drawing Schedule):', err);
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
        { error: `Project sheet "${project}" not found. Install drawings first.` },
        { status: 404 }
      );
    }

    const {
      drawingNo,
      zone,
      areaName,
      drawingName,
      resourceName,
      doerName,
      category,
      plannedStartDate,
      plannedEndDate,
      actualStartDate,
      actualEndDate,
      revisionNo,
      lastUpdated,
      drawingImage,
    } = body;

    if (!drawingName) {
      return NextResponse.json({ error: 'Drawing Name is required.' }, { status: 400 });
    }

    let finalDrawingNo = drawingNo || '';
    if (!finalDrawingNo.trim()) {
      const existing = await loadProjectDrawings(project);
      finalDrawingNo = nextDrawingNo(existing);
    }

    const newRow = toDrawingSheetRow({
      drawingNo: finalDrawingNo,
      zone,
      areaName,
      drawingName,
      resourceName,
      doerName,
      category,
      plannedStartDate,
      plannedEndDate,
      actualStartDate,
      actualEndDate,
      revisionNo: revisionNo || '0',
      lastUpdated: lastUpdated || '',
      drawingImage,
    });

    await appendSheetsData(SHEET_ID, quoteSheetRange(project, 'A2'), [newRow]);

    return NextResponse.json({ success: true, drawingNo: finalDrawingNo });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Drawing Schedule):', err);
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
      drawingNo,
      zone,
      areaName,
      drawingName,
      resourceName,
      doerName,
      category,
      plannedStartDate,
      plannedEndDate,
      actualStartDate,
      actualEndDate,
      revisionNo,
      drawingImage,
    } = body;

    if (!drawingName) {
      return NextResponse.json({ error: 'Drawing Name is required.' }, { status: 400 });
    }

    const lastUpdated = new Date().toISOString();

    const updatedRow = toDrawingSheetRow({
      drawingNo,
      zone,
      areaName,
      drawingName,
      resourceName,
      doerName,
      category,
      plannedStartDate,
      plannedEndDate,
      actualStartDate,
      actualEndDate,
      revisionNo: revisionNo || '0',
      lastUpdated,
      drawingImage,
    });

    await updateSheetRow(
      SHEET_ID,
      quoteSheetRange(project, `A${rowIndex}:N${rowIndex}`),
      [updatedRow]
    );

    return NextResponse.json({ success: true, lastUpdated });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT Drawing Schedule):', err);
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
    console.error('API Error (DELETE Drawing Schedule):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
