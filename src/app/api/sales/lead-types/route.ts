import { NextRequest, NextResponse } from 'next/server';
import { getSheetsData, appendSheetsData } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.SALES.SHEET_ID;
const DROPDOWN_SHEET = CONFIG.SALES.DROPDOWN_SHEET;
const LEAD_TYPE_RANGE = `${DROPDOWN_SHEET}!A2:A1000`;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, LEAD_TYPE_RANGE);

    if (!data || data.length === 0) return NextResponse.json([]);

    const leadTypes = Array.from(
      new Set(
        data
          .map((row: string[]) => (row[0] || '').trim())
          .filter((name: string) => Boolean(name))
      )
    );

    return NextResponse.json(leadTypes);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Lead Types):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    const trimmed = typeof name === 'string' ? name.trim() : '';

    if (!trimmed) {
      return NextResponse.json({ error: 'Lead type is required.' }, { status: 400 });
    }

    const existingData = await getSheetsData(SHEET_ID, LEAD_TYPE_RANGE);
    const leadTypes = existingData
      ? existingData.map((row: string[]) => (row[0] || '').trim()).filter(Boolean)
      : [];

    const alreadyExists = leadTypes.some(
      (type) => type.toLowerCase() === trimmed.toLowerCase()
    );
    if (alreadyExists) {
      return NextResponse.json({ error: 'Lead type already exists' }, { status: 400 });
    }

    await appendSheetsData(SHEET_ID, `${DROPDOWN_SHEET}!A2`, [[trimmed]]);

    return NextResponse.json({ success: true, name: trimmed });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Lead Type):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
