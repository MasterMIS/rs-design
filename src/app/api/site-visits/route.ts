import { NextRequest, NextResponse } from 'next/server';
import { 
  getSheetsData, 
  appendSheetsData, 
  uploadFileToDrive, 
  updateSheetRow, 
  deleteSheetRow 
} from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.SITE_VISIT.SHEET_ID;
const SHEET_NAME = CONFIG.SITE_VISIT.SHEET_NAME;
const FOLDER_ID = CONFIG.SITE_VISIT.FOLDER_ID;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:I1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const siteVisits = data.map((row: string[], index: number) => {
      let files = [];
      const rawFiles = row[7] || '';
      
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
        visitDate: row[1] || '',
        project: row[2] || '',
        visitNo: row[3] || '',
        purpose: row[4] || '',
        visitedBy: row[5] || '',
        attendees: row[6] || '',
        files: normalizedFiles,
        remarks: row[8] || '',
        id: row[3] || `SV-ROW-${index + 2}`, // Using visitNo as ID
      };
    });

    return NextResponse.json(siteVisits);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Site Visits):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}



export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const visitDate = formData.get('visitDate') as string;
    const project = formData.get('project') as string;
    const purpose = formData.get('purpose') as string;
    const visitedBy = formData.get('visitedBy') as string;
    const attendees = formData.get('attendees') as string;
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

    if (!project || !visitDate) {
      return NextResponse.json({ error: 'Project and Visit Date are required.' }, { status: 400 });
    }

    const uploadedFiles: { title: string; name: string; url: string }[] = [];

    if (files && files.length > 0 && FOLDER_ID) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const driveFile = await uploadFileToDrive(
            buffer,
            `SV_${Date.now()}_${file.name}`,
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
    const existingData = await getSheetsData(SHEET_ID, `${SHEET_NAME}!D2:D1000`);
    let maxId = 0;
    if (existingData) {
      existingData.forEach((row: string[]) => {
        if (row[0]) {
          const match = row[0].match(/Visit-(\d+)/i);
          if (match && match[1]) {
            maxId = Math.max(maxId, parseInt(match[1], 10));
          }
        }
      });
    }
    const visitNo = `Visit-${maxId + 1}`;

    const newRow = [
      timestamp,
      visitDate,
      project,
      visitNo,
      purpose || '',
      visitedBy || '',
      attendees || '',
      filesJson,
      remarks || ''
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [newRow]);

    return NextResponse.json({ success: true, id: visitNo, visitNo });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Site Visits):', err);
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
    const visitDate = formData.get('visitDate') as string;
    const project = formData.get('project') as string;
    const visitNo = formData.get('visitNo') as string;
    const purpose = formData.get('purpose') as string;
    const visitedBy = formData.get('visitedBy') as string;
    const attendees = formData.get('attendees') as string;
    const remarks = formData.get('remarks') as string;

    const existingFilesJson = formData.get('existingFiles') as string;
    const newFileTitlesJson = formData.get('newFileTitles') as string;
    const newFiles = formData.getAll('files') as File[];

    if (!project || !visitDate) {
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
            `SV_${Date.now()}_${file.name}`,
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
      visitDate || '',
      project,
      visitNo || '',
      purpose || '',
      visitedBy || '',
      attendees || '',
      filesJson,
      remarks || ''
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:I${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT Site Visits):', err);
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
    console.error('API Error (DELETE Site Visits):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
