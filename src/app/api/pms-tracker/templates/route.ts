import { NextRequest, NextResponse } from 'next/server';
import { getSheetsData, appendSheetsData, updateSheetRow, deleteSheetRow } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';
import {
  nextPmsTrackerId,
  parsePmsRows,
  pmsRowA1,
  PMS_SHEET_DATA_RANGE,
  quoteSheetRange,
  toPmsSheetRow,
} from '@/lib/pms-tracker';

const SHEET_ID = CONFIG.PMS_TRACKER.SHEET_ID;
const SHEET_NAME = CONFIG.PMS_TRACKER.TEMPLATES_SHEET;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, quoteSheetRange(SHEET_NAME, PMS_SHEET_DATA_RANGE));
    const items = parsePmsRows(data as string[][] | undefined);
    return NextResponse.json(items);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET PMS Templates):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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

    let finalTrackerId = trackerId || '';
    if (!finalTrackerId.trim()) {
      const existing = parsePmsRows(
        (await getSheetsData(SHEET_ID, quoteSheetRange(SHEET_NAME, PMS_SHEET_DATA_RANGE))) as string[][]
      );
      finalTrackerId = nextPmsTrackerId(existing);
    }

    const newRow = toPmsSheetRow({
      trackerId: finalTrackerId,
      areaName,
      taskName,
      resourceName,
      doerName,
      category,
      plannedStartDate: plannedStartDate || '',
      plannedEndDate: plannedEndDate || '',
      actualStartDate: actualStartDate || '',
      actualEndDate: actualEndDate || '',
    });

    await appendSheetsData(SHEET_ID, quoteSheetRange(SHEET_NAME, 'A2'), [newRow]);

    return NextResponse.json({ success: true, trackerId: finalTrackerId });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST PMS Template):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rowIndexStr = searchParams.get('rowIndex');

    if (!rowIndexStr) return NextResponse.json({ error: 'Missing Row Index' }, { status: 400 });
    const rowIndex = parseInt(rowIndexStr);

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
      plannedStartDate: plannedStartDate || '',
      plannedEndDate: plannedEndDate || '',
      actualStartDate: actualStartDate || '',
      actualEndDate: actualEndDate || '',
    });

    await updateSheetRow(
      SHEET_ID,
      quoteSheetRange(SHEET_NAME, pmsRowA1(rowIndex)),
      [updatedRow]
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT PMS Template):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rowIndexStr = searchParams.get('rowIndex');

    if (!rowIndexStr) {
      return NextResponse.json({ error: 'Missing Row Index' }, { status: 400 });
    }

    const rowIndex = parseInt(rowIndexStr);
    await deleteSheetRow(SHEET_ID, SHEET_NAME, rowIndex - 1);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (DELETE PMS Template):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
