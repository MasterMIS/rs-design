import { NextRequest, NextResponse } from 'next/server';
import { getSheetsData, appendSheetsData, updateSheetRow } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.PMS_TRACKER.SHEET_ID;
const SHEET_NAME = CONFIG.PMS_TRACKER.SUBMISSIONS_SHEET;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:C1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const items = data.map((row: string[], index: number) => {
      return {
        rowIndex: index + 2,
        id: `PMS-SCH-${index + 2}`,
        trackerId: row[0] || '',
        project: row[1] || '',
        actualDate: row[2] || '',
      };
    }).filter((t: any) => t.project && t.trackerId);

    return NextResponse.json(items);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET PMS Schedule):', err);
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

    const rowsToAppend: string[][] = [];

    for (const item of items) {
      if (item.actualDate) {
        rowsToAppend.push([
          item.trackerId || '',
          project,
          item.actualDate || ''
        ]);
      }
    }

    if (rowsToAppend.length > 0) {
      await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, rowsToAppend);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST PMS Schedule):', err);
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

    const updatedRow = [
      body.trackerId || '',
      body.project || '',
      body.actualDate || ''
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:C${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT PMS Schedule):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
