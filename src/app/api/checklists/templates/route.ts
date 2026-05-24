import { NextRequest, NextResponse } from 'next/server';
import { getSheetsData, appendSheetsData, updateSheetRow, deleteSheetRow } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.CHECKLIST.SHEET_ID;
const SHEET_NAME = CONFIG.CHECKLIST.TEMPLATES_SHEET;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:D2000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const items = data.map((row: string[], index: number) => {
      return {
        rowIndex: index + 2,
        id: row[0] || `ITM-${index + 2}`,
        templateName: row[1] || '',
        itemName: row[2] || '',
        timestamp: row[3] || '',
      };
    }).filter((t: any) => t.templateName && t.itemName);

    return NextResponse.json(items);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Checklist Templates):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function generateId() {
  return `ITM-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateName, itemName, itemNames } = body;

    if (!templateName) {
      return NextResponse.json({ error: 'Template Name is required.' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    let rowsToAppend: string[][] = [];

    if (itemNames && Array.isArray(itemNames) && itemNames.length > 0) {
      rowsToAppend = itemNames.map(name => [generateId(), templateName, name, timestamp]);
    } else if (itemName) {
      rowsToAppend = [[generateId(), templateName, itemName, timestamp]];
    } else {
      return NextResponse.json({ error: 'Item Name(s) are required.' }, { status: 400 });
    }

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, rowsToAppend);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Checklist Template):', err);
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
    const { id, templateName, itemName, timestamp } = body;

    if (!templateName || !itemName) {
      return NextResponse.json({ error: 'Template Name and Item Name are required.' }, { status: 400 });
    }

    const updatedRow = [
      id || generateId(),
      templateName,
      itemName,
      timestamp || new Date().toISOString()
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:D${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT Checklist Template):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rowIndexStr = searchParams.get('rowIndex');
    const templateName = searchParams.get('templateName');

    if (templateName) {
      // Bulk delete by templateName
      const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:D1000`);
      if (data && data.length > 0) {
        const rowsToDelete: number[] = [];
        data.forEach((row, index) => {
          if (row[1] === templateName) { // Col B is now Template Name
            rowsToDelete.push(index + 2); // +2 to account for header and 0-indexing
          }
        });
        
        // Sort descending so deleting higher indexes doesn't shift lower ones
        rowsToDelete.sort((a, b) => b - a);
        
        for (const rowIdx of rowsToDelete) {
          await deleteSheetRow(SHEET_ID, SHEET_NAME, rowIdx - 1);
        }
      }
      return NextResponse.json({ success: true });
    }

    if (!rowIndexStr) {
      return NextResponse.json({ error: 'Missing Row Index or Template Name' }, { status: 400 });
    }

    const rowIndex = parseInt(rowIndexStr);
    await deleteSheetRow(SHEET_ID, SHEET_NAME, rowIndex - 1);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (DELETE Checklist Template):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
