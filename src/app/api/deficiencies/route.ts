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

const parseDocs = (str: string) => {
  if (!str) return [];
  try {
    return JSON.parse(str);
  } catch {
    if (str.startsWith('http')) {
      return [{ name: 'Attached Document', url: str }];
    }
    return [];
  }
};

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:G1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const deficiencies = data.map((row: string[], index: number) => ({
      rowIndex: index + 2, 
      timestamp: row[0] || '',
      project: row[1] || '',
      reporter: row[2] || '',
      area: row[3] || '',
      documents: parseDocs(row[4]),
      remarks: row[5] || '',
      id: row[6] || `DEF-ROW-${index + 2}`,
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

    const newFiles = formData.getAll('newFiles') as File[];
    const uploadedDocs: { name: string; url: string; title?: string }[] = [];
    const fileTitlesStr = formData.get('fileTitles')?.toString() || '[]';
    const fileTitles = JSON.parse(fileTitlesStr);

    let fileIndex = 0;
    for (const file of newFiles) {
      if (file.size > 0 && FOLDER_ID) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const driveFile = await uploadFileToDrive(
          buffer, 
          `deficiency_${Date.now()}_${file.name}`, 
          file.type || 'application/octet-stream', 
          FOLDER_ID
        );
        if (driveFile.id) {
          uploadedDocs.push({ 
            name: file.name, 
            url: `https://drive.google.com/file/d/${driveFile.id}/view`,
            title: fileTitles[fileIndex] || file.name
          });
        }
        fileIndex++;
      }
    }

    const deficiencyId = `DEF-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newRow = [
      timestamp,
      project,
      reporter,
      area,
      JSON.stringify(uploadedDocs),
      remarks,
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
    const id = formData.get('id') as string;

    const existingDocsStr = formData.get('existingDocs')?.toString() || '[]';
    let existingDocs = JSON.parse(existingDocsStr);

    const newFiles = formData.getAll('newFiles') as File[];
    const newFileTitlesStr = formData.get('newFileTitles')?.toString() || '[]';
    const newFileTitles = JSON.parse(newFileTitlesStr);

    let fileIndex = 0;
    for (const file of newFiles) {
      if (file.size > 0 && FOLDER_ID) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const driveFile = await uploadFileToDrive(
          buffer, 
          `deficiency_${Date.now()}_${file.name}`, 
          file.type || 'application/octet-stream', 
          FOLDER_ID
        );
        if (driveFile.id) {
          existingDocs.push({ 
            name: file.name, 
            url: `https://drive.google.com/file/d/${driveFile.id}/view`,
            title: newFileTitles[fileIndex] || file.name
          });
        }
        fileIndex++;
      }
    }

    const updatedRow = [
      timestamp,
      project,
      reporter,
      area,
      JSON.stringify(existingDocs),
      remarks,
      id
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:G${rowIndex}`, [updatedRow]);

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
