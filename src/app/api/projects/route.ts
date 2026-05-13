import { NextRequest, NextResponse } from 'next/server';
import { 
  getSheetsData, 
  appendSheetsData, 
  updateSheetRow, 
  deleteSheetRow 
} from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.PROJECT.SHEET_ID;
const SHEET_NAME = CONFIG.PROJECT.SHEET_NAME;

export async function GET() {
  try {
    const rows = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A:G`);
    if (!rows || rows.length <= 1) return NextResponse.json([]);

    const projects = rows.slice(1).map((row, index) => {
      try {
        return {
          id: row[0],
          rowIndex: index + 1,
          basicInfo: row[1] ? JSON.parse(row[1]) : {},
          clients: row[2] ? JSON.parse(row[2]) : [],
          sites: row[3] ? JSON.parse(row[3]) : [],
          team: row[4] ? JSON.parse(row[4]) : [],
          timeline: row[5] ? JSON.parse(row[5]) : {},
          metadata: row[6] ? JSON.parse(row[6]) : {},
        };
      } catch (e) {
        console.error(`Error parsing JSON for row ${index + 2}:`, e);
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json(projects);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const projectId = `PRJ-${Date.now()}`;
    
    const newRow = [
      projectId,
      JSON.stringify(data.basicInfo || {}),
      JSON.stringify(data.clients || []),
      JSON.stringify(data.sites || []),
      JSON.stringify(data.team || []),
      JSON.stringify(data.timeline || {}),
      JSON.stringify({ 
        createdAt: new Date().toISOString(),
        completion: 0,
        status: 'Active'
      })
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A:G`, [newRow]);
    return NextResponse.json({ success: true, projectId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const rowIndex = searchParams.get('rowIndex');
    const data = await req.json();

    if (!id || !rowIndex) throw new Error('ID and RowIndex required');

    const updateRow = [
      id,
      JSON.stringify(data.basicInfo || {}),
      JSON.stringify(data.clients || []),
      JSON.stringify(data.sites || []),
      JSON.stringify(data.team || []),
      JSON.stringify(data.timeline || {}),
      JSON.stringify(data.metadata || {})
    ];

    const actualRow = parseInt(rowIndex) + 1;
    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${actualRow}:G${actualRow}`, [updateRow]);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rowIndex = searchParams.get('rowIndex');
    
    if (!rowIndex) throw new Error('RowIndex required');

    const actualRow = parseInt(rowIndex) + 1;
    await deleteSheetRow(SHEET_ID, SHEET_NAME, actualRow - 1);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
