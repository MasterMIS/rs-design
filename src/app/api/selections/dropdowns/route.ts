import { NextResponse } from 'next/server';
import { getSheetsData } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.SELECTION.SHEET_ID;
const DROPDOWN_SHEET = 'Dropdown';

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${DROPDOWN_SHEET}!A2:B1000`);

    const selectAreas: string[] = [];
    // Map: selectArea -> list of area names
    const areaMap: Record<string, string[]> = {};

    if (data && data.length > 0) {
      data.forEach((row: string[]) => {
        const areaVal = (row[0] || '').trim();
        const nameVal = (row[1] || '').trim();

        if (areaVal) {
          if (!selectAreas.includes(areaVal)) {
            selectAreas.push(areaVal);
          }
          if (!areaMap[areaVal]) {
            areaMap[areaVal] = [];
          }
          if (nameVal && !areaMap[areaVal].includes(nameVal)) {
            areaMap[areaVal].push(nameVal);
          }
        }
      });
    }

    return NextResponse.json({ selectAreas, areaMap });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Selection Dropdowns):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
