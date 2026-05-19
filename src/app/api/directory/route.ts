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

// Helper to sanitize contact numbers and format WhatsApp direct chat links
function generateWhatsAppLink(phone: string): string {
  if (!phone) return '';
  const clean = phone.replace(/[^0-9]/g, '');
  if (!clean) return '';
  // Default to pre-pending '91' for India country code if length is exactly 10 digits
  const formatted = clean.length === 10 ? `91${clean}` : clean;
  return `https://wa.me/${formatted}`;
}

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:N1000`);

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
      designation: row[10] || '',
      escalationLevel: row[11] || 'L1',
      whatsAppLink: row[12] || '',
      id: row[13] || `DIR-ROW-${index + 2}`,
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
    const { 
      project, 
      selectTeam, 
      nameOfPerson, 
      contactNo, 
      emailId, 
      companyName, 
      category, 
      address, 
      appointmentStatus, 
      designation, 
      escalationLevel 
    } = body;

    if (!project || !selectTeam || !nameOfPerson) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const directoryId = `DIR-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const whatsAppLink = generateWhatsAppLink(contactNo || '');

    const newRow = [
      timestamp,
      project,
      selectTeam,
      nameOfPerson,
      contactNo || '',
      emailId || '',
      companyName || '',
      category || '',
      address || '',
      appointmentStatus || 'Shortlisted',
      designation || '',
      escalationLevel || 'L1',
      whatsAppLink,
      directoryId
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [newRow]);

    return NextResponse.json({ success: true, id: directoryId });
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
      designation, 
      escalationLevel,
      id
    } = body;

    if (!project || !selectTeam || !nameOfPerson || !id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const whatsAppLink = generateWhatsAppLink(contactNo || '');

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
      designation || '',
      escalationLevel || 'L1',
      whatsAppLink,
      id
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:N${rowIndex}`, [updatedRow]);

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
