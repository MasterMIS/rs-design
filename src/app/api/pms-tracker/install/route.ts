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
  PMS_HEADERS,
  PMS_SHEET_DATA_RANGE,
  PMS_SHEET_FULL_RANGE,
  parsePmsRows,
  quoteSheetRange,
  sanitizeSheetTitle,
  toInstallSheetRow,
} from '@/lib/pms-tracker';

const SHEET_ID = CONFIG.PMS_TRACKER.SHEET_ID;
const TEMPLATE_SHEET = CONFIG.PMS_TRACKER.TEMPLATES_SHEET;

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
      quoteSheetRange(sourceSheet, PMS_SHEET_DATA_RANGE)
    );
    const sourceRows = parsePmsRows(sourceData as string[][] | undefined);

    if (sourceRows.length === 0) {
      return NextResponse.json(
        { error: `No tasks found in source "${sourceSheet}".` },
        { status: 400 }
      );
    }

    await createSheet(SHEET_ID, project);

    const values = [
      [...PMS_HEADERS],
      ...sourceRows.map((row) => toInstallSheetRow(row)),
    ];

    await clearAndWriteRange(
      SHEET_ID,
      quoteSheetRange(project, PMS_SHEET_FULL_RANGE),
      values
    );

    return NextResponse.json({
      success: true,
      project,
      taskCount: sourceRows.length,
      source: sourceSheet,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST PMS Install):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
