import { NextRequest, NextResponse } from 'next/server';
import { getSheetsData, appendSheetsData, updateSheetRow, deleteSheetRow } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';
import {
  drawingRowA1,
  DRAWING_SHEET_DATA_RANGE,
  nextDrawingNo,
  parseDrawingRows,
  quoteSheetRange,
  toDrawingSheetRow,
} from '@/lib/drawings';

const SHEET_ID = CONFIG.DRAWING_SCHEDULE.SHEET_ID;
const SHEET_NAME = CONFIG.DRAWING_SCHEDULE.TEMPLATES_SHEET;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, quoteSheetRange(SHEET_NAME, DRAWING_SHEET_DATA_RANGE));
    const items = parseDrawingRows(data as string[][] | undefined);
    return NextResponse.json(items);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Drawing Templates):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      drawingNo,
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
      const existing = parseDrawingRows(
        (await getSheetsData(SHEET_ID, quoteSheetRange(SHEET_NAME, DRAWING_SHEET_DATA_RANGE))) as string[][]
      );
      finalDrawingNo = nextDrawingNo(existing);
    }

    const newRow = toDrawingSheetRow({
      drawingNo: finalDrawingNo,
      areaName,
      drawingName,
      resourceName,
      doerName,
      category,
      plannedStartDate: plannedStartDate || '',
      plannedEndDate: plannedEndDate || '',
      actualStartDate: actualStartDate || '',
      actualEndDate: actualEndDate || '',
      revisionNo: revisionNo || '0',
      lastUpdated: lastUpdated || '',
      drawingImage: drawingImage || '',
    });

    await appendSheetsData(SHEET_ID, quoteSheetRange(SHEET_NAME, 'A2'), [newRow]);

    return NextResponse.json({ success: true, drawingNo: finalDrawingNo });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Drawing Template):', err);
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
      drawingNo,
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

    const updatedRow = toDrawingSheetRow({
      drawingNo,
      areaName,
      drawingName,
      resourceName,
      doerName,
      category,
      plannedStartDate: plannedStartDate || '',
      plannedEndDate: plannedEndDate || '',
      actualStartDate: actualStartDate || '',
      actualEndDate: actualEndDate || '',
      revisionNo: revisionNo || '0',
      lastUpdated: lastUpdated || '',
      drawingImage: drawingImage || '',
    });

    await updateSheetRow(
      SHEET_ID,
      quoteSheetRange(SHEET_NAME, drawingRowA1(rowIndex)),
      [updatedRow]
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT Drawing Template):', err);
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
    console.error('API Error (DELETE Drawing Template):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
