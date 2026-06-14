import { NextRequest, NextResponse } from 'next/server';
import { getSheetsData, appendSheetsData, updateSheetRow, deleteSheetRow } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.DRAWING_SCHEDULE.SHEET_ID;
const SHEET_NAME = CONFIG.DRAWING_SCHEDULE.TEMPLATES_SHEET;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:G1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const items = data.map((row: string[], index: number) => {
      return {
        rowIndex: index + 2,
        id: `TPL-${index + 2}`,
        drawingNo: row[0] || '',
        areaName: row[1] || '',
        drawingName: row[2] || '',
        resourceName: row[3] || '',
        doerName: row[4] || '',
        category: row[5] || 'Uncategorized',
        tat: row[6] || '',
      };
    }).filter((t: any) => t.drawingName);

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
    const { drawingNo, areaName, drawingName, resourceName, doerName, category, tat } = body;

    if (!drawingName) {
      return NextResponse.json({ error: 'Drawing Name is required.' }, { status: 400 });
    }

    const newRow = [
      drawingNo || '',
      areaName || '',
      drawingName || '',
      resourceName || '',
      doerName || '',
      category || 'Uncategorized',
      tat || ''
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [newRow]);

    return NextResponse.json({ success: true });
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
    const { drawingNo, areaName, drawingName, resourceName, doerName, category, tat } = body;

    if (!drawingName) {
      return NextResponse.json({ error: 'Drawing Name is required.' }, { status: 400 });
    }

    const updatedRow = [
      drawingNo || '',
      areaName || '',
      drawingName || '',
      resourceName || '',
      doerName || '',
      category || 'Uncategorized',
      tat || ''
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:G${rowIndex}`, [updatedRow]);

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
