import { NextRequest, NextResponse } from 'next/server';
import { getSheetsData, appendSheetsData, updateSheetRow, deleteSheetRow, uploadFileToDrive } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.QUOTATION.SHEET_ID;
const SHEET_NAME = CONFIG.QUOTATION.SHEET_NAME;
const FOLDER_ID = CONFIG.QUOTATION.FOLDER_ID;

// Helper to safely parse JSON
const parseJSON = (str: string, fallback: any) => {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
};

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:K1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const quotations = data.map((row: string[], index: number) => ({
      rowIndex: index + 2,
      id: row[0] || '',
      createdAt: row[1] || '',
      project: row[2] || '',
      nameOfPerson: row[3] || '',
      nameOfQuotation: row[4] || '',
      documentUrl: row[5] || '',
      remarks: row[6] || '',
      statusRSDesign: row[7] || 'Pending',
      timestampRSDesign: row[8] || '',
      statusClient: row[9] || 'Pending',
      timestampClient: row[10] || '',
    })).filter((q: any) => q.id || q.nameOfQuotation);

    return NextResponse.json(quotations);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Quotations):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const id = `QUO-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const createdAt = new Date().toISOString();
    const now = createdAt;
    
    const project = formData.get('project')?.toString() || '';
    const nameOfPerson = formData.get('nameOfPerson')?.toString() || '';
    const nameOfQuotation = formData.get('nameOfQuotation')?.toString() || '';
    const remarks = formData.get('remarks')?.toString() || '';
    const statusRSDesign = formData.get('statusRSDesign')?.toString() || 'Pending';
    const statusClient = formData.get('statusClient')?.toString() || 'Pending';

    const timestampRSDesign = statusRSDesign !== 'Pending' ? now : '';
    const timestampClient = statusClient !== 'Pending' ? now : '';

    const files = formData.getAll('newFiles') as File[];
    let documentUrl = '';

    for (const file of files) {
      if (file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await uploadFileToDrive(buffer, file.name, file.type || 'application/octet-stream', FOLDER_ID);
        if (result.id) {
          documentUrl = `https://drive.google.com/file/d/${result.id}/view`;
          break; // Only one file
        }
      }
    }

    const rowData = [
      id,
      createdAt,
      project,
      nameOfPerson,
      nameOfQuotation,
      documentUrl,
      remarks,
      statusRSDesign,
      timestampRSDesign,
      statusClient,
      timestampClient,
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [rowData]);

    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Quotation):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rowIndexStr = searchParams.get('rowIndex');

    if (!rowIndexStr) return NextResponse.json({ error: 'Missing Row Index' }, { status: 400 });
    const rowIndex = parseInt(rowIndexStr);

    const formData = await request.formData();
    
    const id = formData.get('id')?.toString() || '';
    const createdAt = formData.get('createdAt')?.toString() || new Date().toISOString();
    const project = formData.get('project')?.toString() || '';
    const nameOfPerson = formData.get('nameOfPerson')?.toString() || '';
    const nameOfQuotation = formData.get('nameOfQuotation')?.toString() || '';
    const remarks = formData.get('remarks')?.toString() || '';
    
    const newStatusRSDesign = formData.get('statusRSDesign')?.toString() || 'Pending';
    const oldStatusRSDesign = formData.get('oldStatusRSDesign')?.toString() || 'Pending';
    let timestampRSDesign = formData.get('timestampRSDesign')?.toString() || '';
    
    const newStatusClient = formData.get('statusClient')?.toString() || 'Pending';
    const oldStatusClient = formData.get('oldStatusClient')?.toString() || 'Pending';
    let timestampClient = formData.get('timestampClient')?.toString() || '';

    // Update timestamps if status changed
    const now = new Date().toISOString();
    if (newStatusRSDesign !== oldStatusRSDesign) timestampRSDesign = now;
    if (newStatusClient !== oldStatusClient) timestampClient = now;

    let documentUrl = formData.get('documentUrl')?.toString() || '';
    const files = formData.getAll('newFiles') as File[];

    for (const file of files) {
      if (file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await uploadFileToDrive(buffer, file.name, file.type || 'application/octet-stream', FOLDER_ID);
        if (result.id) {
          documentUrl = `https://drive.google.com/file/d/${result.id}/view`;
          break;
        }
      }
    }

    const updatedRow = [
      id,
      createdAt,
      project,
      nameOfPerson,
      nameOfQuotation,
      documentUrl,
      remarks,
      newStatusRSDesign,
      timestampRSDesign,
      newStatusClient,
      timestampClient
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:K${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT Quotation):', err);
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
    console.error('API Error (DELETE Quotation):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
