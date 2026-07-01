import { NextRequest, NextResponse } from 'next/server';
import { 
  getSheetsData, 
  appendSheetsData 
} from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.SALES.SHEET_ID;
const DROPDOWN_SHEET = CONFIG.SALES.DROPDOWN_SHEET;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${DROPDOWN_SHEET}!A2:A1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const salesmen = data
      .map((row: string[]) => row[0])
      .filter((name: string) => name && name.trim() !== '');

    return NextResponse.json(salesmen);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Salesmen):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }

    // Check if it already exists
    const existingData = await getSheetsData(SHEET_ID, `${DROPDOWN_SHEET}!A2:A1000`);
    const salesmen = existingData ? existingData.map((row: string[]) => row[0]).filter(Boolean) : [];
    
    if (salesmen.includes(name.trim())) {
      return NextResponse.json({ error: 'Salesman already exists' }, { status: 400 });
    }

    const newRow = [name.trim()];
    await appendSheetsData(SHEET_ID, `${DROPDOWN_SHEET}!A2`, [newRow]);

    return NextResponse.json({ success: true, name: name.trim() });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Salesman):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
