import { NextRequest, NextResponse } from 'next/server';
import { getSheetsData, appendSheetsData, updateSheetRow, deleteSheetRow } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.CHECKLIST.SHEET_ID;
const SHEET_NAME = CONFIG.CHECKLIST.SUBMISSIONS_SHEET;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:F1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const checklists = data.map((row: string[], index: number) => {
      let checkedItems: Record<string, boolean> = {};
      try {
        if (row[3]) {
          checkedItems = JSON.parse(row[3]);
        }
      } catch {
        checkedItems = {};
      }

      return {
        rowIndex: index + 2,
        timestamp: row[0] || '',
        project: row[1] || '',
        referenceNo: row[2] || '',
        checkedItems: checkedItems,
        remarks: row[4] || '',
        completedPercentage: parseInt(row[5] || '0', 10),
        id: row[2] || `CHK-ROW-${index + 2}`,
      };
    }).filter((c: any) => c.project); // Filter out empty rows

    return NextResponse.json(checklists);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Project Checklists):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function generateRefNo() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
  return `CHK-${year}${month}-${randomStr}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project, checkedItems, remarks, totalItems } = body;

    if (!project) {
      return NextResponse.json({ error: 'Project is required.' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const refNo = generateRefNo();
    const checkedItemsJson = JSON.stringify(checkedItems || {});
    
    let checkedCount = 0;
    if (checkedItems) {
        checkedCount = Object.values(checkedItems).filter(Boolean).length;
    }
    const completedPercentage = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

    const newRow = [
      timestamp,
      project,
      refNo,
      checkedItemsJson,
      remarks || '',
      completedPercentage.toString()
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [newRow]);

    return NextResponse.json({ success: true, id: refNo });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Project Checklist):', err);
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
    const { timestamp, project, referenceNo, checkedItems, remarks, totalItems } = body;

    if (!project) {
      return NextResponse.json({ error: 'Project is required.' }, { status: 400 });
    }

    const checkedItemsJson = JSON.stringify(checkedItems || {});
    
    let checkedCount = 0;
    if (checkedItems) {
        checkedCount = Object.values(checkedItems).filter(Boolean).length;
    }
    const completedPercentage = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

    const updatedRow = [
      timestamp || new Date().toISOString(),
      project,
      referenceNo,
      checkedItemsJson,
      remarks || '',
      completedPercentage.toString()
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:F${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT Project Checklist):', err);
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
    console.error('API Error (DELETE Project Checklist):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
