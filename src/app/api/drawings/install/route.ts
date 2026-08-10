import { NextRequest, NextResponse } from 'next/server';
import {
  clearAndWriteRange,
  createSheet,
  getSheetsData,
  listSheetTitles,
  sheetExists,
} from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';
import {
  DRAWING_HEADERS,
  parseDrawingRows,
  quoteSheetRange,
  sanitizeSheetTitle,
  toDrawingInstallSheetRow,
} from '@/lib/drawings';

const SHEET_ID = CONFIG.DRAWING_SCHEDULE.SHEET_ID;
const TEMPLATE_SHEET = CONFIG.DRAWING_SCHEDULE.TEMPLATES_SHEET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const projectRaw = typeof body.project === 'string' ? body.project.trim() : '';
    const source = body.source;

    if (!projectRaw) {
      return NextResponse.json({ error: 'Project name is required.' }, { status: 400 });
    }

    const project = sanitizeSheetTitle(projectRaw);

    if (await sheetExists(SHEET_ID, project)) {
      return NextResponse.json(
        { error: `Project sheet "${project}" already exists.`, installed: true },
        { status: 409 }
      );
    }

    let sourceSheet = TEMPLATE_SHEET;
    if (source === 'template' || source === TEMPLATE_SHEET) {
      sourceSheet = TEMPLATE_SHEET;
    } else if (source && typeof source === 'object' && typeof source.project === 'string') {
      sourceSheet = sanitizeSheetTitle(source.project);
      if (sourceSheet === TEMPLATE_SHEET) {
        return NextResponse.json({ error: 'Invalid source project.' }, { status: 400 });
      }
      const titles = await listSheetTitles(SHEET_ID);
      if (!titles.includes(sourceSheet)) {
        return NextResponse.json(
          { error: `Source project sheet "${sourceSheet}" not found.` },
          { status: 404 }
        );
      }
    } else if (typeof source === 'string' && source.trim()) {
      sourceSheet = sanitizeSheetTitle(source);
      const titles = await listSheetTitles(SHEET_ID);
      if (!titles.includes(sourceSheet)) {
        return NextResponse.json(
          { error: `Source sheet "${sourceSheet}" not found.` },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Source must be "template" or { project: string }.' },
        { status: 400 }
      );
    }

    const sourceData = await getSheetsData(
      SHEET_ID,
      quoteSheetRange(sourceSheet, 'A2:N1000')
    );
    const sourceRows = parseDrawingRows(sourceData as string[][] | undefined);

    if (sourceRows.length === 0) {
      return NextResponse.json(
        { error: `No drawings found in source "${sourceSheet}".` },
        { status: 400 }
      );
    }

    await createSheet(SHEET_ID, project);

    const values = [
      [...DRAWING_HEADERS],
      ...sourceRows.map((row) => toDrawingInstallSheetRow(row)),
    ];

    await clearAndWriteRange(
      SHEET_ID,
      quoteSheetRange(project, 'A1:N1000'),
      values
    );

    return NextResponse.json({
      success: true,
      project,
      drawingCount: sourceRows.length,
      source: sourceSheet,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Drawing Install):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
