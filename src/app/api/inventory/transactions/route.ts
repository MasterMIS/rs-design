import { NextRequest, NextResponse } from 'next/server';
import { getSheetsData, appendSheetsData } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.INVENTORY.SHEET_ID;
const SHEET_NAME = CONFIG.INVENTORY.TRANSACTIONS_SHEET;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:H5000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const items = data.map((row: string[], index: number) => {
      return {
        rowIndex: index + 2,
        id: `INV-TRX-${index + 2}`,
        timestamp: row[0] || '',
        project: row[1] || '',
        itemNo: row[2] || '',
        type: row[3] || 'In',
        quantity: row[4] || '0',
        date: row[5] || '',
        remarks: row[6] || '',
        addedBy: row[7] || '',
      };
    }).filter((t: any) => t.project && t.itemNo && t.type);

    return NextResponse.json(items);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Inventory Transactions):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project, itemNo, type, quantity, date, remarks, addedBy } = body;

    if (!project || !itemNo || !type || !quantity) {
      return NextResponse.json({ error: 'Project, Item No, Type, and Quantity are required.' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();

    const newRow = [
      timestamp,
      project,
      itemNo,
      type, // 'In' or 'Out'
      quantity.toString(),
      date || new Date().toISOString().split('T')[0],
      remarks || '',
      addedBy || ''
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [newRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Inventory Transaction):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
