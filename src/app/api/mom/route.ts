import { NextRequest, NextResponse } from 'next/server';
import { 
  getSheetsData, 
  appendSheetsData, 
  uploadFileToDrive, 
  updateSheetRow, 
  deleteSheetRow 
} from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.MOM.SHEET_ID;
const SHEET_NAME = CONFIG.MOM.SHEET_NAME;
const FOLDER_ID = CONFIG.MOM.FOLDER_ID;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:N1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const momList = data.map((row: string[], index: number) => ({
      rowIndex: index + 2,
      timestamp: row[0] || '',
      project: row[1] || '',
      purpose: row[2] || '',
      meetingDate: row[3] || '',
      ourAttendees: row[4] || '',
      clientAttendees: row[5] || '',
      location: row[6] || '',
      keyDecisions: row[7] || '',
      actionItems: row[8] || '',
      nextMeetingDate: row[9] || '',
      status: row[10] || 'Draft',
      documents: row[11] || '',
      remarks: row[12] || '',
      id: row[13] || `MOM-ROW-${index + 2}`,
    }));

    return NextResponse.json(momList);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET MOM):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const project = formData.get('project') as string;
    const purpose = formData.get('purpose') as string;
    const meetingDate = formData.get('meetingDate') as string;
    const ourAttendees = formData.get('ourAttendees') as string;
    const clientAttendees = formData.get('clientAttendees') as string;
    const location = formData.get('location') as string;
    const keyDecisions = formData.get('keyDecisions') as string;
    const actionItems = formData.get('actionItems') as string;
    const nextMeetingDate = formData.get('nextMeetingDate') as string;
    const status = (formData.get('status') as string) || 'Draft';
    const remarks = formData.get('remarks') as string;
    const file = formData.get('file') as File | null;

    if (!project || !purpose) {
      return NextResponse.json({ error: 'Project and Purpose of Meeting are required.' }, { status: 400 });
    }

    let documentsUrl = '';
    if (file && file.size > 0 && FOLDER_ID) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const driveFile = await uploadFileToDrive(
        buffer, 
        `MOM_${Date.now()}_${file.name}`, 
        file.type, 
        FOLDER_ID
      );
      documentsUrl = driveFile.id ? `https://lh3.googleusercontent.com/d/${driveFile.id}` : '';
    }

    const momId = `MOM-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newRow = [
      timestamp,
      project,
      purpose,
      meetingDate || '',
      ourAttendees || '',
      clientAttendees || '',
      location || '',
      keyDecisions || '',
      actionItems || '',
      nextMeetingDate || '',
      status,
      documentsUrl,
      remarks || '',
      momId
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [newRow]);

    return NextResponse.json({ success: true, id: momId });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST MOM):', err);
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
    const purpose = formData.get('purpose') as string;
    const meetingDate = formData.get('meetingDate') as string;
    const ourAttendees = formData.get('ourAttendees') as string;
    const clientAttendees = formData.get('clientAttendees') as string;
    const location = formData.get('location') as string;
    const keyDecisions = formData.get('keyDecisions') as string;
    const actionItems = formData.get('actionItems') as string;
    const nextMeetingDate = formData.get('nextMeetingDate') as string;
    const status = formData.get('status') as string;
    const documents = (formData.get('documents') as string) || '';
    const remarks = formData.get('remarks') as string;
    const id = formData.get('id') as string;

    const file = formData.get('file') as File | string | null;

    if (!project || !purpose || !id) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    let documentsUrl = documents;
    if (file instanceof File && file.size > 0 && FOLDER_ID) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const driveFile = await uploadFileToDrive(
        buffer, 
        `MOM_${Date.now()}_${file.name}`, 
        file.type, 
        FOLDER_ID
      );
      documentsUrl = driveFile.id ? `https://lh3.googleusercontent.com/d/${driveFile.id}` : '';
    }

    const updatedRow = [
      timestamp || new Date().toISOString(),
      project,
      purpose,
      meetingDate || '',
      ourAttendees || '',
      clientAttendees || '',
      location || '',
      keyDecisions || '',
      actionItems || '',
      nextMeetingDate || '',
      status || 'Draft',
      documentsUrl,
      remarks || '',
      id
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:N${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT MOM):', err);
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
    console.error('API Error (DELETE MOM):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
