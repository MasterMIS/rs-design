import { NextRequest, NextResponse } from 'next/server';
import { getSheetsData, appendSheetsData, updateSheetRow, deleteSheetRow } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.INVENTORY.SHEET_ID;
const SHEET_NAME = CONFIG.INVENTORY.TEMPLATES_SHEET;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:D1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const items = data.map((row: string[], index: number) => {
      return {
        rowIndex: index + 2,
        id: row[0] || `INV-TPL-${index + 2}`,
        itemNo: row[0] || `INV-TPL-${index + 2}`,
        itemName: row[1] || '',
        category: row[2] || 'Uncategorized',
        unit: row[3] || 'Nos',
      };
    }).filter((t: any) => t.itemName);

    return NextResponse.json(items);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Inventory Templates):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemNo, itemName, category, unit } = body;

    if (!itemName) {
      return NextResponse.json({ error: 'Item Name is required.' }, { status: 400 });
    }

    const newRow = [
      itemNo || '',
      itemName || '',
      category || 'Uncategorized',
      unit || 'Nos'
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [newRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Inventory Template):', err);
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
    const { itemNo, itemName, category, unit } = body;

    if (!itemName) {
      return NextResponse.json({ error: 'Item Name is required.' }, { status: 400 });
    }

    const updatedRow = [
      itemNo || '',
      itemName || '',
      category || 'Uncategorized',
      unit || 'Nos'
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:D${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT Inventory Template):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rowIndexStr = searchParams.get('rowIndex');

    if (!rowIndexStr) {
      return NextResponse.json({ error: 'Missing Row Index' }, { status: 400 });
    }

    const rowIndex = parseInt(rowIndexStr);
    await deleteSheetRow(SHEET_ID, SHEET_NAME, rowIndex - 1);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (DELETE Inventory Template):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
