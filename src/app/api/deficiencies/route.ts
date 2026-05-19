import { NextRequest, NextResponse } from 'next/server';
import { 
  getSheetsData, 
  appendSheetsData, 
  uploadFileToDrive, 
  updateSheetRow, 
  deleteSheetRow 
} from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.DEFICIENCY.SHEET_ID;
const SHEET_NAME = CONFIG.DEFICIENCY.SHEET_NAME;
const FOLDER_ID = CONFIG.DEFICIENCY.FOLDER_ID;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:N1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const deficiencies = data.map((row: string[], index: number) => ({
      rowIndex: index + 2, 
      timestamp: row[0] || '',
      project: row[1] || '',
      reporter: row[2] || '',
      area: row[3] || '',
      beforeDocs: row[4] || '',
      remarks: row[5] || '',
      title: row[6] || '',
      category: row[7] || '',
      priority: row[8] || 'Medium',
      status: row[9] || 'Open',
      assignedTo: row[10] || '',
      dueDate: row[11] || '',
      afterDocs: row[12] || '',
      id: row[13] || `DEF-ROW-${index + 2}`,
    }));

    return NextResponse.json(deficiencies);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const project = formData.get('project') as string;
    const reporter = formData.get('reporter') as string;
    const area = formData.get('area') as string;
    const remarks = formData.get('remarks') as string;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const priority = (formData.get('priority') as string) || 'Medium';
    const status = (formData.get('status') as string) || 'Open';
    const assignedTo = (formData.get('assignedTo') as string) || '';
    const dueDate = (formData.get('dueDate') as string) || '';
    const beforeImage = formData.get('beforeImage') as File | null;

    let beforeDocsUrl = '';
    if (beforeImage && beforeImage.size > 0 && FOLDER_ID) {
      const buffer = Buffer.from(await beforeImage.arrayBuffer());
      const driveFile = await uploadFileToDrive(
        buffer, 
        `before_${Date.now()}_${beforeImage.name}`, 
        beforeImage.type, 
        FOLDER_ID
      );
      beforeDocsUrl = driveFile.id ? `https://lh3.googleusercontent.com/d/${driveFile.id}` : '';
    }

    const deficiencyId = `DEF-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newRow = [
      timestamp,
      project,
      reporter,
      area,
      beforeDocsUrl,
      remarks,
      title,
      category,
      priority,
      status,
      assignedTo,
      dueDate,
      '', // afterDocs is empty on creation
      deficiencyId
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [newRow]);

    return NextResponse.json({ success: true, id: deficiencyId });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST):', err);
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
    const timestamp = formData.get('timestamp') as string;
    const project = formData.get('project') as string;
    const reporter = formData.get('reporter') as string;
    const area = formData.get('area') as string;
    const remarks = formData.get('remarks') as string;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const priority = formData.get('priority') as string;
    const status = formData.get('status') as string;
    const assignedTo = formData.get('assignedTo') as string;
    const dueDate = formData.get('dueDate') as string;
    const beforeDocs = (formData.get('beforeDocs') as string) || '';
    const afterDocs = (formData.get('afterDocs') as string) || '';
    const id = formData.get('id') as string;

    const beforeImage = formData.get('beforeImage') as File | string | null;
    const afterImage = formData.get('afterImage') as File | string | null;

    let beforeDocsUrl = beforeDocs;
    if (beforeImage instanceof File && beforeImage.size > 0 && FOLDER_ID) {
      const buffer = Buffer.from(await beforeImage.arrayBuffer());
      const driveFile = await uploadFileToDrive(
        buffer, 
        `before_${Date.now()}_${beforeImage.name}`, 
        beforeImage.type, 
        FOLDER_ID
      );
      beforeDocsUrl = driveFile.id ? `https://lh3.googleusercontent.com/d/${driveFile.id}` : '';
    }

    let afterDocsUrl = afterDocs;
    if (afterImage instanceof File && afterImage.size > 0 && FOLDER_ID) {
      const buffer = Buffer.from(await afterImage.arrayBuffer());
      const driveFile = await uploadFileToDrive(
        buffer, 
        `after_${Date.now()}_${afterImage.name}`, 
        afterImage.type, 
        FOLDER_ID
      );
      afterDocsUrl = driveFile.id ? `https://lh3.googleusercontent.com/d/${driveFile.id}` : '';
    }

    const updatedRow = [
      timestamp,
      project,
      reporter,
      area,
      beforeDocsUrl,
      remarks,
      title,
      category,
      priority,
      status,
      assignedTo,
      dueDate,
      afterDocsUrl,
      id
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:N${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT):', err);
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
    console.error('API Error (DELETE):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
