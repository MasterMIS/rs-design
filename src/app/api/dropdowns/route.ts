import { NextRequest, NextResponse } from 'next/server';
import { getSheetsData, updateSheetRow } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.USER.SHEET_ID;
const dropdownSheetName = 'Dropdown';

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${dropdownSheetName}!A2:B1000`);

    const departments: string[] = [];
    const designations: string[] = [];

    if (data) {
      data.forEach((row: any) => {
        if (row[0]) departments.push(row[0]);
        if (row[1]) designations.push(row[1]);
      });
    }

    return NextResponse.json({ 
      departments: [...new Set(departments)], 
      designations: [...new Set(designations)] 
    });
  } catch (error: any) {
    console.error('API Error (Dropdowns GET):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, value } = await request.json();
    
    // Instead of append (which can skip rows due to formatting), 
    // let's find the first empty row in the specific column.
    const fullData = await getSheetsData(SHEET_ID, `${dropdownSheetName}!A2:B1000`);
    
    let targetRow = 2; // Default to first row after header
    if (fullData && fullData.length > 0) {
      if (type === 'department') {
        // Find first row where column A is empty
        const lastIndex = fullData.map(r => r[0]).findLastIndex(v => v !== undefined && v !== '');
        targetRow = lastIndex + 3; // +2 for A2 start, +1 for next row
      } else {
        // Find first row where column B is empty
        const lastIndex = fullData.map(r => r[1]).findLastIndex(v => v !== undefined && v !== '');
        targetRow = lastIndex + 3;
      }
    }

    const col = type === 'department' ? 'A' : 'B';
    const range = `${dropdownSheetName}!${col}${targetRow}`;
    
    await updateSheetRow(SHEET_ID, range, [[value]]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error (Dropdowns POST):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
