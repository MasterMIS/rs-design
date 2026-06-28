import { NextRequest, NextResponse } from 'next/server';
import { 
  getSheetsData, 
  appendSheetsData, 
  updateSheetRow, 
  deleteSheetRow 
} from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.EM.SHEET_ID;
const SHEET_NAME = CONFIG.EM.DESIGN_SHEET;

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:H`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const tasks = data.map((row: string[], index: number) => ({
      rowIndex: index + 2,
      timestamp: row[0] || '',
      project_name: row[1] || '',
      work_type: row[2] || '',
      work_name: row[3] || '',
      doer_name: row[4] || '',
      planned_date: row[5] || '',
      actual_date: row[6] || '',
      status: row[7] || 'Pending',
    }));

    return NextResponse.json(tasks);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET EM Design):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const timestamp = new Date().toLocaleString('en-GB');

    const newRow = [
      timestamp,
      body.project_name || '',
      body.work_type || '',
      body.work_name || '',
      body.doer_name || '',
      body.planned_date || '',
      body.actual_date || '',
      body.status || 'Pending',
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [newRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST EM Design):', err);
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
      body.timestamp || '', // Keep original timestamp
      body.project_name || '',
      body.work_type || '',
      body.work_name || '',
      body.doer_name || '',
      body.planned_date || '',
      body.actual_date || '',
      body.status || 'Pending',
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:H${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT EM Design):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rowIndexStr = searchParams.get('rowIndex');

    if (!rowIndexStr) return NextResponse.json({ error: 'Missing Row Index' }, { status: 400 });
    const rowIndex = parseInt(rowIndexStr);

    await deleteSheetRow(SHEET_ID, SHEET_NAME, rowIndex - 1);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (DELETE EM Design):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
