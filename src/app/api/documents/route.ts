import { NextRequest, NextResponse } from 'next/server';
import { 
  getSheetsData, 
  appendSheetsData, 
  uploadFileToDrive, 
  updateSheetRow, 
  deleteSheetRow 
} from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.DOCUMENT.SHEET_ID;
const SHEET_NAME = CONFIG.DOCUMENT.SHEET_NAME;
const FOLDER_ID = CONFIG.DOCUMENT.FOLDER_ID;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:G1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const documents = data.map((row: string[], index: number) => {
      let files = [];
      const rawFiles = row[4] || '';
      
      // Safe JSON parsing with fallback for legacy single links
      if (rawFiles.trim().startsWith('[')) {
        try {
          files = JSON.parse(rawFiles);
        } catch {
          files = rawFiles ? [{ title: 'Document Attachment', name: 'Document Attachment', url: rawFiles }] : [];
        }
      } else if (rawFiles) {
        files = [{ title: 'Document Attachment', name: 'Document Attachment', url: rawFiles }];
      }

      // Ensure all file objects have a title field, fallback to name
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
        stakeholders: row[3] || '',
        files: normalizedFiles,
        remarks: row[5] || '',
        id: row[6] || `DOC-ROW-${index + 2}`,
      };
    });

    return NextResponse.json(documents);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Documents):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const project = formData.get('project') as string;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const referenceNumber = formData.get('referenceNumber') as string;
    const issueDate = formData.get('issueDate') as string;
    const expiryDate = formData.get('expiryDate') as string;
    const stakeholders = formData.get('stakeholders') as string;
    const status = (formData.get('status') as string) || 'Draft';
    const remarks = formData.get('remarks') as string;

    // Gather all uploaded files and their corresponding custom titles
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
      return NextResponse.json({ error: 'Project and Document Title are required.' }, { status: 400 });
    }

    const uploadedFiles: { title: string; name: string; url: string }[] = [];

    // Loop and upload each selected file to Google Drive folder
    if (files && files.length > 0 && FOLDER_ID) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const driveFile = await uploadFileToDrive(
            buffer,
            `DOC_${Date.now()}_${file.name}`,
            file.type,
            FOLDER_ID
          );
          if (driveFile.id) {
            uploadedFiles.push({
              title: fileTitles[i] || file.name,
              name: file.name,
              url: `https://drive.google.com/file/d/${driveFile.id}/view`
            });
          }
        }
      }
    }

    const docId = `DOC-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const filesJson = JSON.stringify(uploadedFiles);

    const newRow = [
      timestamp,
      project,
      title,
      stakeholders || '',
      filesJson,
      remarks || '',
      docId
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [newRow]);

    return NextResponse.json({ success: true, id: docId });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Documents):', err);
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
    const category = formData.get('category') as string;
    const referenceNumber = formData.get('referenceNumber') as string;
    const issueDate = formData.get('issueDate') as string;
    const expiryDate = formData.get('expiryDate') as string;
    const stakeholders = formData.get('stakeholders') as string;
    const status = formData.get('status') as string;
    const remarks = formData.get('remarks') as string;
    const id = formData.get('id') as string;

    const existingFilesJson = formData.get('existingFiles') as string;
    const newFileTitlesJson = formData.get('newFileTitles') as string;
    const newFiles = formData.getAll('files') as File[];

    if (!project || !title || !id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Load already present files kept by user (which contains their updated/existing titles)
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

    // Loop and upload new files and append to list
    if (newFiles && newFiles.length > 0 && FOLDER_ID) {
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        if (file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const driveFile = await uploadFileToDrive(
            buffer,
            `DOC_${Date.now()}_${file.name}`,
            file.type,
            FOLDER_ID
          );
          if (driveFile.id) {
            finalFilesList.push({
              title: newFileTitles[i] || file.name,
              name: file.name,
              url: `https://drive.google.com/file/d/${driveFile.id}/view`
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
      stakeholders || '',
      filesJson,
      remarks || '',
      id
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:G${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT Documents):', err);
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
    console.error('API Error (DELETE Documents):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
