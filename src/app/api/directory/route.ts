import { NextRequest, NextResponse } from 'next/server';
import { 
  getSheetsData, 
  appendSheetsData, 
  updateSheetRow, 
  deleteSheetRow 
} from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.DIRECTORY.SHEET_ID;
const SHEET_NAME = CONFIG.DIRECTORY.SHEET_NAME;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:K1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const directory = data.map((row: string[], index: number) => ({
      rowIndex: index + 2,
      timestamp: row[0] || '',
      project: row[1] || '',
      selectTeam: row[2] || '',
      nameOfPerson: row[3] || '',
      contactNo: row[4] || '',
      emailId: row[5] || '',
      companyName: row[6] || '',
      category: row[7] || '',
      address: row[8] || '',
      appointmentStatus: row[9] || 'Shortlisted',
      id: row[10] || `DIR-ROW-${index + 2}`,
    }));

    return NextResponse.json(directory);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Directory):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entries = Array.isArray(body) ? body : [body];

    if (entries.length === 0) {
      return NextResponse.json({ error: 'No entries provided' }, { status: 400 });
    }

    const newRows = entries.map((entry, index) => {
      if (!entry.project || !entry.selectTeam || !entry.nameOfPerson) {
        throw new Error(`Missing required parameters at row ${index + 1}`);
      }

      const directoryId = `DIR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const timestamp = new Date().toISOString();

      return [
        timestamp,
        entry.project,
        entry.selectTeam,
        entry.nameOfPerson,
        entry.contactNo || '',
        entry.emailId || '',
        entry.companyName || '',
        entry.category || '',
        entry.address || '',
        entry.appointmentStatus || 'Yes',
        directoryId
      ];
    });

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, newRows);

    return NextResponse.json({ success: true, count: newRows.length });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Directory):', err);
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
      timestamp,
      project, 
      selectTeam, 
      nameOfPerson, 
      contactNo, 
      emailId, 
      companyName, 
      category, 
      address, 
      appointmentStatus, 
      id
    } = body;

    if (!project || !selectTeam || !nameOfPerson || !id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const updatedRow = [
      timestamp || new Date().toISOString(),
      project,
      selectTeam,
      nameOfPerson,
      contactNo || '',
      emailId || '',
      companyName || '',
      category || '',
      address || '',
      appointmentStatus || 'Shortlisted',
      id
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:K${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT Directory):', err);
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
    console.error('API Error (DELETE Directory):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
