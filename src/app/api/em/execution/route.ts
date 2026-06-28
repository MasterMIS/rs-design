import { NextRequest, NextResponse } from 'next/server';
import { 
  getSheetsData, 
  appendSheetsData, 
  updateSheetRow, 
  deleteSheetRow 
} from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.EM.SHEET_ID;
const SHEET_NAME = CONFIG.EM.EXECUTION_SHEET;

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:J`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const tasks = data.map((row: string[], index: number) => ({
      rowIndex: index + 2,
      timestamp: row[0] || '',
      supervisor_name: row[1] || '',
      work_from: row[2] || '',
      work_to: row[3] || '',
      project_name: row[4] || '',
      work_name: row[5] || '',
      doer: row[6] || '',
      remark: row[7] || '',
      actual_date: row[8] || '',
      status: row[9] || 'Pending',
    }));

    return NextResponse.json(tasks);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET EM Execution):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const timestamp = new Date().toLocaleString('en-GB');

    const newRow = [
      timestamp,
      body.supervisor_name || '',
      body.work_from || '',
      body.work_to || '',
      body.project_name || '',
      body.work_name || '',
      body.doer || '',
      body.remark || '',
      body.actual_date || '',
      body.status || 'Pending',
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [newRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST EM Execution):', err);
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
      body.supervisor_name || '',
      body.work_from || '',
      body.work_to || '',
      body.project_name || '',
      body.work_name || '',
      body.doer || '',
      body.remark || '',
      body.actual_date || '',
      body.status || 'Pending',
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:J${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT EM Execution):', err);
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
    console.error('API Error (DELETE EM Execution):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
