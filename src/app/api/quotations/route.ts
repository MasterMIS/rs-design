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
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:M1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const quotations = data.map((row: string[], index: number) => ({
      rowIndex: index + 2,
      id: row[0] || '',
      createdAt: row[1] || '',
      project: row[2] || '',
      title: row[3] || '',
      vendor: row[4] || '',
      amount: row[5] || '',
      version: row[6] || 'v1',
      status: row[7] || 'Pending Internal',
      internalApproval: parseJSON(row[8], { status: 'Pending', by: '', at: '' }),
      clientApproval: parseJSON(row[9], { status: 'Pending', by: '', at: '' }),
      remarks: row[10] || '',
      history: parseJSON(row[11], []),
      currentFile: parseJSON(row[12], null),
    })).filter((q: any) => q.id || q.title);

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
    
    const project = formData.get('project')?.toString() || '';
    const title = formData.get('title')?.toString() || '';
    const vendor = formData.get('vendor')?.toString() || '';
    const amount = formData.get('amount')?.toString() || '';
    const remarks = formData.get('remarks')?.toString() || '';
    const byUser = formData.get('byUser')?.toString() || 'System';

    const files = formData.getAll('newFiles') as File[];
    let currentFile = null;

    for (const file of files) {
      if (file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await uploadFileToDrive(buffer, file.name, file.type || 'application/octet-stream', FOLDER_ID);
        if (result.id) {
          currentFile = { name: file.name, url: `https://drive.google.com/file/d/${result.id}/view` };
          break; // Only one file per quotation version
        }
      }
    }

    const historyLog = [{
      action: 'Created',
      version: 'v1',
      by: byUser,
      at: createdAt,
      file: currentFile
    }];

    const internalApproval = { status: 'Pending', by: '', at: '' };
    const clientApproval = { status: 'Pending', by: '', at: '' };

    const rowData = [
      id,
      createdAt,
      project,
      title,
      vendor,
      amount,
      'v1',
      'Pending Internal',
      JSON.stringify(internalApproval),
      JSON.stringify(clientApproval),
      remarks,
      JSON.stringify(historyLog),
      JSON.stringify(currentFile)
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
    const title = formData.get('title')?.toString() || '';
    const vendor = formData.get('vendor')?.toString() || '';
    const amount = formData.get('amount')?.toString() || '';
    const remarks = formData.get('remarks')?.toString() || '';
    
    const actionType = formData.get('actionType')?.toString() || 'UPDATE'; // UPDATE, APPROVE_INTERNAL, APPROVE_CLIENT, REQUEST_REVISION, UPLOAD_REVISION
    const byUser = formData.get('byUser')?.toString() || 'System';
    const actionNotes = formData.get('actionNotes')?.toString() || '';

    // Parsed current state from form data
    let version = formData.get('version')?.toString() || 'v1';
    let status = formData.get('status')?.toString() || 'Pending Internal';
    let internalApproval = parseJSON(formData.get('internalApproval')?.toString() || '', { status: 'Pending', by: '', at: '' });
    let clientApproval = parseJSON(formData.get('clientApproval')?.toString() || '', { status: 'Pending', by: '', at: '' });
    let historyLog = parseJSON(formData.get('history')?.toString() || '', []);
    let currentFile = parseJSON(formData.get('currentFile')?.toString() || '', null);

    const timestamp = new Date().toISOString();

    if (actionType === 'APPROVE_INTERNAL') {
      internalApproval = { status: 'Approved', by: byUser, at: timestamp };
      status = 'Pending Client';
      historyLog.unshift({ action: 'Internal Approved', version, by: byUser, at: timestamp, notes: actionNotes });
    } 
    else if (actionType === 'APPROVE_CLIENT') {
      clientApproval = { status: 'Approved', by: byUser, at: timestamp };
      status = 'Approved';
      historyLog.unshift({ action: 'Client Approved', version, by: byUser, at: timestamp, notes: actionNotes });
    }
    else if (actionType === 'REQUEST_REVISION') {
      status = 'Needs Revision';
      historyLog.unshift({ action: 'Revision Requested', version, by: byUser, at: timestamp, notes: actionNotes });
    }
    else if (actionType === 'UPLOAD_REVISION') {
      const newFiles = formData.getAll('newFiles') as File[];
      let uploadedFile = null;

      for (const file of newFiles) {
        if (file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const result = await uploadFileToDrive(buffer, file.name, file.type || 'application/octet-stream', FOLDER_ID);
          if (result.id) {
            uploadedFile = { name: file.name, url: `https://drive.google.com/file/d/${result.id}/view` };
            break;
          }
        }
      }

      if (uploadedFile) {
        currentFile = uploadedFile;
        // Bump version logic (v1 -> v2)
        const currentVNum = parseInt(version.replace('v', '')) || 1;
        version = `v${currentVNum + 1}`;
        status = 'Pending Internal';
        internalApproval = { status: 'Pending', by: '', at: '' };
        clientApproval = { status: 'Pending', by: '', at: '' };

        historyLog.unshift({ action: `Revision Uploaded (${version})`, version, by: byUser, at: timestamp, notes: actionNotes, file: uploadedFile });
      }
    }

    const updatedRow = [
      id,
      createdAt,
      project,
      title,
      vendor,
      amount,
      version,
      status,
      JSON.stringify(internalApproval),
      JSON.stringify(clientApproval),
      remarks,
      JSON.stringify(historyLog),
      JSON.stringify(currentFile)
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:M${rowIndex}`, [updatedRow]);

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
