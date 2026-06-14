import { NextRequest, NextResponse } from 'next/server';
import { getSheetsData, appendSheetsData, updateSheetRow, deleteSheetRow } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.DRAWING_SCHEDULE.SHEET_ID;
const SHEET_NAME = CONFIG.DRAWING_SCHEDULE.SUBMISSIONS_SHEET;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:N1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const items = data.map((row: string[], index: number) => {
      return {
        rowIndex: index + 2,
        id: `DS-${index + 2}`,
        project: row[1] || '',
        drawingNo: row[0] || '',
        actualDate: row[2] || '',
        revisionNo: row[3] || '0',
        lastUpdated: row[4] || '',
        drawingImage: row[5] || '',
        rsDesignStatus: row[6] || 'Pending',
        clientStatus: row[7] || 'Pending',
      };
    }).filter((t: any) => t.project && t.drawingNo);

    return NextResponse.json(items);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Drawing Schedule):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project, items } = body;

    if (!project || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Project and items are required.' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const rowsToAppend: string[][] = [];

    for (const item of items) {
      // Add new row for this project
      rowsToAppend.push([
        item.drawingNo || '',
        project,
        item.actualDate || '',
        item.revisionNo || '0',
        timestamp,
        item.drawingImage || '',
        item.rsDesignStatus || 'Pending',
        item.clientStatus || 'Pending'
      ]);
    }

    if (rowsToAppend.length > 0) {
      await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, rowsToAppend);
    }

    return NextResponse.json({ success: true });
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

    if (!rowIndexStr) return NextResponse.json({ error: 'Missing Row Index' }, { status: 400 });
    const rowIndex = parseInt(rowIndexStr);

    const body = await request.json();
    const timestamp = new Date().toISOString();

    const updatedRow = [
      body.drawingNo || '',
      body.project || '',
      body.actualDate || '',
      body.revisionNo || '0',
      timestamp,
      body.drawingImage || '',
      body.rsDesignStatus || 'Pending',
      body.clientStatus || 'Pending'
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:H${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true, timestamp });
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

    if (!rowIndexStr) {
      return NextResponse.json({ error: 'Missing Row Index' }, { status: 400 });
    }

    const rowIndex = parseInt(rowIndexStr);
    await deleteSheetRow(SHEET_ID, SHEET_NAME, rowIndex - 1);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (DELETE Drawing Schedule):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
