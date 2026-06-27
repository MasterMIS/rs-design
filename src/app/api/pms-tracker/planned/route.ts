import { NextRequest, NextResponse } from 'next/server';
import { getSheetsData, appendSheetsData, updateSheetRow } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.PMS_TRACKER.SHEET_ID;
const SHEET_NAME = CONFIG.PMS_TRACKER.PLANNED_SHEET;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:E1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const items = data.map((row: string[], index: number) => {
      return {
        rowIndex: index + 2,
        id: `PMS-PLAN-${index + 2}`,
        timestamp: row[0] || '',
        project: row[1] || '',
        category: row[2] || '',
        startDate: row[3] || '',
        endDate: row[4] || '',
      };
    }).filter((t: any) => t.project && t.category);

    return NextResponse.json(items);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET PMS Planned Dates):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project, category, startDate, endDate } = body;

    if (!project || !category) {
      return NextResponse.json({ error: 'Project and Category are required.' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();

    const newRow = [
      timestamp,
      project,
      category,
      startDate || '',
      endDate || ''
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [newRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST PMS Planned Date):', err);
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
    const { project, category, startDate, endDate } = body;

    if (!project || !category) {
      return NextResponse.json({ error: 'Project and Category are required.' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();

    const updatedRow = [
      timestamp,
      project,
      category,
      startDate || '',
      endDate || ''
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:E${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT PMS Planned Date):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
