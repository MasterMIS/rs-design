import { NextRequest, NextResponse } from 'next/server';
import { getSheetsData, appendSheetsData, updateSheetRow } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.DRAWING_SCHEDULE.SHEET_ID;
const SHEET_NAME = CONFIG.DRAWING_SCHEDULE.PLANNED_SHEET;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:D1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const items = data.map((row: string[], index: number) => {
      return {
        rowIndex: index + 2,
        id: `PLANNED-${index + 2}`,
        timestamp: row[0] || '',
        project: row[1] || '',
        category: row[2] || '',
        planDate: row[3] || '',
      };
    }).filter((t: any) => t.project && t.category);

    return NextResponse.json(items);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Planned Dates):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project, category, planDate } = body;

    if (!project || !category || !planDate) {
      return NextResponse.json({ error: 'Project, Category, and Plan Date are required.' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();

    const newRow = [
      timestamp,
      project,
      category,
      planDate
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [newRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Planned Date):', err);
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
    const { project, category, planDate } = body;

    if (!project || !category || !planDate) {
      return NextResponse.json({ error: 'Project, Category, and Plan Date are required.' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();

    const updatedRow = [
      timestamp,
      project,
      category,
      planDate
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:D${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT Planned Date):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
