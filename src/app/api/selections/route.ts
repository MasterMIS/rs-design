import { NextRequest, NextResponse } from 'next/server';
import { 
  getSheetsData, 
  appendSheetsData, 
  uploadFileToDrive, 
  updateSheetRow, 
  deleteSheetRow 
} from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.SELECTION.SHEET_ID;
const SHEET_NAME = CONFIG.SELECTION.SHEET_NAME;
const FOLDER_ID = CONFIG.SELECTION.FOLDER_ID;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:G1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const selections = data.map((row: string[], index: number) => {
      let files = [];
      const rawFiles = row[5] || '';
      
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
        areaName: row[2] || '',
        productName: row[3] || '',
        vendor: row[4] || '',
        files: normalizedFiles,
        remarks: row[6] || '',
        id: `SEL-ROW-${index + 2}`,
      };
    });

    return NextResponse.json(selections);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Selections):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const project = formData.get('project') as string;
    const areaName = formData.get('areaName') as string;
    const productName = formData.get('productName') as string;
    const vendor = formData.get('vendor') as string;
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

    if (!project || !productName) {
      return NextResponse.json({ error: 'Project and Product Name are required.' }, { status: 400 });
    }

    const uploadedFiles: { title: string; name: string; url: string }[] = [];

    if (files && files.length > 0 && FOLDER_ID) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const driveFile = await uploadFileToDrive(
            buffer,
            `SEL_${Date.now()}_${file.name}`,
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

    const timestamp = new Date().toISOString();
    const filesJson = JSON.stringify(uploadedFiles);

    // A:G — Timestamp, Project, AreaName, ProductName, Vendor, Files, Remarks
    const newRow = [
      timestamp,
      project,
      areaName || '',
      productName || '',
      vendor || '',
      filesJson,
      remarks || ''
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [newRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Selections):', err);
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
    const areaName = formData.get('areaName') as string;
    const productName = formData.get('productName') as string;
    const vendor = formData.get('vendor') as string;
    const remarks = formData.get('remarks') as string;

    const existingFilesJson = formData.get('existingFiles') as string;
    const newFileTitlesJson = formData.get('newFileTitles') as string;
    const newFiles = formData.getAll('files') as File[];

    if (!project || !productName) {
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
            `SEL_${Date.now()}_${file.name}`,
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

    // A:G — Timestamp, Project, AreaName, ProductName, Vendor, Files, Remarks
    const updatedRow = [
      timestamp || new Date().toISOString(),
      project,
      areaName || '',
      productName || '',
      vendor || '',
      filesJson,
      remarks || ''
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:G${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT Selections):', err);
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
    console.error('API Error (DELETE Selections):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
