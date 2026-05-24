import { NextRequest, NextResponse } from 'next/server';
import { 
  getSheetsData, 
  appendSheetsData, 
  uploadFileToDrive, 
  updateSheetRow, 
  deleteSheetRow 
} from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.REQUIREMENT.SHEET_ID;
const SHEET_NAME = CONFIG.REQUIREMENT.SHEET_NAME;
const FOLDER_ID = CONFIG.REQUIREMENT.FOLDER_ID;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:L1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const requirements = data.map((row: string[], index: number) => {
      let files = [];
      const rawFiles = row[9] || '';
      
      if (rawFiles.trim().startsWith('[')) {
        try {
          files = JSON.parse(rawFiles);
        } catch {
          files = rawFiles ? [{ title: 'Attachment', name: 'Attachment', url: rawFiles }] : [];
        }
      } else if (rawFiles) {
        files = [{ title: 'Attachment', name: 'Attachment', url: rawFiles }];
      }

      const normalizedFiles = files.map((f: { title?: string; name: string; url: string }) => ({
        title: f.title || f.name || 'Attachment',
        name: f.name || 'Attachment',
        url: f.url
      }));

      return {
        rowIndex: index + 2,
        timestamp: row[0] || '',
        project: row[1] || '',
        title: row[2] || '',
        requirementNo: row[3] || '',
        category: row[4] || '',
        status: row[5] || 'Pending',
        priority: row[6] || 'Medium',
        assignedTo: row[7] || '',
        targetDate: row[8] || '',
        files: normalizedFiles,
        remarks: row[10] || '',
        id: row[11] || `REQ-ROW-${index + 2}`,
      };
    });

    return NextResponse.json(requirements);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Requirements):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function generateRequirementNo() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
  return `REQ-${year}${month}-${randomStr}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const project = formData.get('project') as string;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const status = (formData.get('status') as string) || 'Pending';
    const priority = (formData.get('priority') as string) || 'Medium';
    const assignedTo = formData.get('assignedTo') as string;
    const targetDate = formData.get('targetDate') as string;
    const remarks = formData.get('remarks') as string;

    const files = formData.getAll('files') as File[];
    const fileTitlesJson = formData.get('fileTitles') as string;
    
    let fileTitles: string[] = [];
    if (fileTitlesJson) {
      try {
        fileTitles = JSON.parse(fileTitlesJson);
      } catch {
        fileTitles = [];
      }
    }

    if (!project || !title) {
      return NextResponse.json({ error: 'Project and Title are required.' }, { status: 400 });
    }

    const uploadedFiles: { title: string; name: string; url: string }[] = [];

    if (files && files.length > 0 && FOLDER_ID) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const driveFile = await uploadFileToDrive(
            buffer,
            `REQ_${Date.now()}_${file.name}`,
            file.type,
            FOLDER_ID
          );
          if (driveFile.id) {
            uploadedFiles.push({
              title: fileTitles[i] || file.name,
              name: file.name,
              url: `https://lh3.googleusercontent.com/d/${driveFile.id}`
            });
          }
        }
      }
    }

    const reqId = `REQ-ID-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const filesJson = JSON.stringify(uploadedFiles);
    const requirementNo = generateRequirementNo();

    const newRow = [
      timestamp,
      project,
      title,
      requirementNo,
      category || '',
      status,
      priority,
      assignedTo || '',
      targetDate || '',
      filesJson,
      remarks || '',
      reqId
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [newRow]);

    return NextResponse.json({ success: true, id: reqId, requirementNo });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Requirements):', err);
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
    const title = formData.get('title') as string;
    const requirementNo = formData.get('requirementNo') as string;
    const category = formData.get('category') as string;
    const status = formData.get('status') as string;
    const priority = formData.get('priority') as string;
    const assignedTo = formData.get('assignedTo') as string;
    const targetDate = formData.get('targetDate') as string;
    const remarks = formData.get('remarks') as string;
    const id = formData.get('id') as string;

    const existingFilesJson = formData.get('existingFiles') as string;
    const newFileTitlesJson = formData.get('newFileTitles') as string;
    const newFiles = formData.getAll('files') as File[];

    if (!project || !title || !id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    let finalFilesList: { title: string; name: string; url: string }[] = [];
    if (existingFilesJson) {
      try {
        finalFilesList = JSON.parse(existingFilesJson);
      } catch {
        finalFilesList = [];
      }
    }

    let newFileTitles: string[] = [];
    if (newFileTitlesJson) {
      try {
        newFileTitles = JSON.parse(newFileTitlesJson);
      } catch {
        newFileTitles = [];
      }
    }

    if (newFiles && newFiles.length > 0 && FOLDER_ID) {
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        if (file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const driveFile = await uploadFileToDrive(
            buffer,
            `REQ_${Date.now()}_${file.name}`,
            file.type,
            FOLDER_ID
          );
          if (driveFile.id) {
            finalFilesList.push({
              title: newFileTitles[i] || file.name,
              name: file.name,
              url: `https://lh3.googleusercontent.com/d/${driveFile.id}`
            });
          }
        }
      }
    }

    const filesJson = JSON.stringify(finalFilesList);

    const updatedRow = [
      timestamp || new Date().toISOString(),
      project,
      title,
      requirementNo || '',
      category || '',
      status || 'Pending',
      priority || 'Medium',
      assignedTo || '',
      targetDate || '',
      filesJson,
      remarks || '',
      id
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:L${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT Requirements):', err);
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
    console.error('API Error (DELETE Requirements):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
