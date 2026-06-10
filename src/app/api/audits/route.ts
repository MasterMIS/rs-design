import { NextRequest, NextResponse } from 'next/server';
import { getSheetsData, appendSheetsData, updateSheetRow, deleteSheetRow, uploadFileToDrive } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.AUDIT.SHEET_ID;
const SHEET_NAME = CONFIG.AUDIT.SHEET_NAME;
const FOLDER_ID = CONFIG.AUDIT.FOLDER_ID;

const parseJSON = (str: string, fallback: any) => {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
};

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:L1000`);
    if (!data || data.length === 0) return NextResponse.json([]);

    const audits = data.map((row: string[], index: number) => ({
      rowIndex: index + 2,
      id: row[0] || '',
      createdAt: row[1] || '',
      project: row[2] || '',
      auditDate: row[3] || '',
      auditType: row[4] || '',
      auditorName: row[5] || '',
      presentInMeeting: row[6] || '',
      status: row[7] || '',
      keyFindings: row[8] || '',
      actionItems: row[9] || '',
      remarks: row[10] || '',
      documents: parseJSON(row[11], []),
    })).filter((a: any) => a.id || a.project);

    return NextResponse.json(audits);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Audits):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const id = `AUD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const createdAt = new Date().toISOString();
    
    const project = formData.get('project')?.toString() || '';
    const auditDate = formData.get('auditDate')?.toString() || '';
    const auditType = formData.get('auditType')?.toString() || '';
    const auditorName = formData.get('auditorName')?.toString() || '';
    const presentInMeeting = formData.get('presentInMeeting')?.toString() || '';
    const status = formData.get('status')?.toString() || '';
    const keyFindings = formData.get('keyFindings')?.toString() || '';
    const actionItems = formData.get('actionItems')?.toString() || '';
    const remarks = formData.get('remarks')?.toString() || '';

    const newFiles = formData.getAll('newFiles') as File[];
    const uploadedDocs: { name: string; url: string }[] = [];

    for (const file of newFiles) {
      if (file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await uploadFileToDrive(buffer, file.name, file.type || 'application/octet-stream', FOLDER_ID);
        if (result.id) {
          uploadedDocs.push({ name: file.name, url: `https://drive.google.com/file/d/${result.id}/view` });
        }
      }
    }

    const rowData = [
      id,
      createdAt,
      project,
      auditDate,
      auditType,
      auditorName,
      presentInMeeting,
      status,
      keyFindings,
      actionItems,
      remarks,
      JSON.stringify(uploadedDocs)
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [rowData]);

    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Audit):', err);
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
    const auditDate = formData.get('auditDate')?.toString() || '';
    const auditType = formData.get('auditType')?.toString() || '';
    const auditorName = formData.get('auditorName')?.toString() || '';
    const presentInMeeting = formData.get('presentInMeeting')?.toString() || '';
    const status = formData.get('status')?.toString() || '';
    const keyFindings = formData.get('keyFindings')?.toString() || '';
    const actionItems = formData.get('actionItems')?.toString() || '';
    const remarks = formData.get('remarks')?.toString() || '';

    const existingDocsStr = formData.get('existingDocs')?.toString() || '[]';
    let existingDocs = parseJSON(existingDocsStr, []);

    const newFiles = formData.getAll('newFiles') as File[];
    for (const file of newFiles) {
      if (file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await uploadFileToDrive(buffer, file.name, file.type || 'application/octet-stream', FOLDER_ID);
        if (result.id) {
          existingDocs.push({ name: file.name, url: `https://drive.google.com/file/d/${result.id}/view` });
        }
      }
    }

    const updatedRow = [
      id,
      createdAt,
      project,
      auditDate,
      auditType,
      auditorName,
      presentInMeeting,
      status,
      keyFindings,
      actionItems,
      remarks,
      JSON.stringify(existingDocs)
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:L${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT Audit):', err);
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
    console.error('API Error (DELETE Audit):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
