import { NextRequest, NextResponse } from 'next/server';
import { 
  getSheetsData, 
  appendSheetsData, 
  uploadFileToDrive, 
  updateSheetRow, 
  deleteSheetRow 
} from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.HRMS.SHEET_ID;
const SHEET_NAME = CONFIG.HRMS.SHEET_NAME;
const FOLDER_ID = CONFIG.HRMS.FOLDER_ID;

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:AN`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const employees = data.map((row: string[], index: number) => {
      return {
        rowIndex: index + 2,
        id: row[0] || '',
        created_at: row[1] || '',
        updated_at: row[2] || '',
        employee_name: row[3] || '',
        contact_no: row[4] || '',
        post_applied: row[5] || '',
        qualification: row[6] || '',
        date_of_birth: row[7] || '',
        marital_status: row[8] || '',
        address: row[9] || '',
        expectation: row[10] || '',
        company_details: row[11] || '',
        cv_upload: row[12] || '',
        photo_upload: row[13] || '',
        planned_1: row[14] || '',
        actual_1: row[15] || '',
        status_1: row[16] || '',
        next_follow_up_date_1: row[17] || '',
        remark_1: row[18] || '',
        planned_2: row[19] || '',
        actual_2: row[20] || '',
        status_2: row[21] || '',
        next_follow_up_date_2: row[22] || '',
        remark_2: row[23] || '',
        planned_3: row[24] || '',
        actual_3: row[25] || '',
        status_3: row[26] || '',
        next_follow_up_date_3: row[27] || '',
        remark_3: row[28] || '',
        planned_4: row[29] || '',
        actual_4: row[30] || '',
        status_4: row[31] || '',
        next_follow_up_date_4: row[32] || '',
        remark_4: row[33] || '',
        planned_5: row[34] || '',
        actual_5: row[35] || '',
        status_5: row[36] || '',
        next_follow_up_date_5: row[37] || '',
        remark_5: row[38] || '',
        lost_remark: row[39] || ''
      };
    });

    return NextResponse.json(employees);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET HRMS):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const employee_name = formData.get('employee_name') as string;
    const contact_no = formData.get('contact_no') as string;
    const post_applied = formData.get('post_applied') as string;
    const qualification = formData.get('qualification') as string;
    const date_of_birth = formData.get('date_of_birth') as string;
    const marital_status = formData.get('marital_status') as string;
    const address = formData.get('address') as string;
    const expectation = formData.get('expectation') as string;
    const company_details = formData.get('company_details') as string;
    
    const cvFile = formData.get('cv_upload') as File | null;
    const photoFile = formData.get('photo_upload') as File | null;

    if (!employee_name) {
      return NextResponse.json({ error: 'Employee name is required.' }, { status: 400 });
    }

    let cvUrl = '';
    let photoUrl = '';

    if (cvFile && cvFile.size > 0 && FOLDER_ID) {
      const buffer = Buffer.from(await cvFile.arrayBuffer());
      const driveFile = await uploadFileToDrive(buffer, `CV_${Date.now()}_${cvFile.name}`, cvFile.type, FOLDER_ID);
      if (driveFile.id) cvUrl = `https://drive.google.com/file/d/${driveFile.id}/view`;
    }

    if (photoFile && photoFile.size > 0 && FOLDER_ID) {
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      const driveFile = await uploadFileToDrive(buffer, `PHOTO_${Date.now()}_${photoFile.name}`, photoFile.type, FOLDER_ID);
      if (driveFile.id) photoUrl = `https://drive.google.com/file/d/${driveFile.id}/view`;
    }

    const id = `EMP-${Date.now()}`;
    const now = new Date();
    const timestamp = now.toISOString();

    const planned_1_date = new Date(now);
    planned_1_date.setDate(planned_1_date.getDate() + 1);
    if (planned_1_date.getDay() === 0) { // Sunday
      planned_1_date.setDate(planned_1_date.getDate() + 1);
    }
    planned_1_date.setHours(18, 0, 0, 0);
    const planned_1 = planned_1_date.toISOString();

    const newRow = [
      id, timestamp, timestamp, employee_name || '', contact_no || '', post_applied || '',
      qualification || '', date_of_birth || '', marital_status || '', address || '',
      expectation || '', company_details || '', cvUrl, photoUrl,
      planned_1, '', '', '', '', // Step 1
      '', '', '', '', '', // Step 2
      '', '', '', '', '', // Step 3
      '', '', '', '', '', // Step 4
      '', '', '', '', '', // Step 5
      ''                  // Lost Remark
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [newRow]);

    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST HRMS):', err);
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
    
    const id = formData.get('id') as string;
    const created_at = formData.get('created_at') as string;
    const employee_name = formData.get('employee_name') as string;
    const contact_no = formData.get('contact_no') as string;
    const post_applied = formData.get('post_applied') as string;
    const qualification = formData.get('qualification') as string;
    const date_of_birth = formData.get('date_of_birth') as string;
    const marital_status = formData.get('marital_status') as string;
    const address = formData.get('address') as string;
    const expectation = formData.get('expectation') as string;
    const company_details = formData.get('company_details') as string;
    const existingCvUrl = formData.get('existing_cv_url') as string || '';
    const existingPhotoUrl = formData.get('existing_photo_url') as string || '';

    const cvFile = formData.get('cv_upload') as File | null;
    const photoFile = formData.get('photo_upload') as File | null;

    let cvUrl = existingCvUrl;
    let photoUrl = existingPhotoUrl;

    if (cvFile && cvFile.size > 0 && FOLDER_ID) {
      const buffer = Buffer.from(await cvFile.arrayBuffer());
      const driveFile = await uploadFileToDrive(buffer, `CV_${Date.now()}_${cvFile.name}`, cvFile.type, FOLDER_ID);
      if (driveFile.id) cvUrl = `https://drive.google.com/file/d/${driveFile.id}/view`;
    }

    if (photoFile && photoFile.size > 0 && FOLDER_ID) {
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      const driveFile = await uploadFileToDrive(buffer, `PHOTO_${Date.now()}_${photoFile.name}`, photoFile.type, FOLDER_ID);
      if (driveFile.id) photoUrl = `https://drive.google.com/file/d/${driveFile.id}/view`;
    }

    const updated_at = new Date().toISOString();

    const updatedRow = [
      id, created_at, updated_at, employee_name || '', contact_no || '', post_applied || '',
      qualification || '', date_of_birth || '', marital_status || '', address || '',
      expectation || '', company_details || '', cvUrl, photoUrl,
      formData.get('planned_1') as string || '', formData.get('actual_1') as string || '', formData.get('status_1') as string || '', formData.get('next_follow_up_date_1') as string || '', formData.get('remark_1') as string || '',
      formData.get('planned_2') as string || '', formData.get('actual_2') as string || '', formData.get('status_2') as string || '', formData.get('next_follow_up_date_2') as string || '', formData.get('remark_2') as string || '',
      formData.get('planned_3') as string || '', formData.get('actual_3') as string || '', formData.get('status_3') as string || '', formData.get('next_follow_up_date_3') as string || '', formData.get('remark_3') as string || '',
      formData.get('planned_4') as string || '', formData.get('actual_4') as string || '', formData.get('status_4') as string || '', formData.get('next_follow_up_date_4') as string || '', formData.get('remark_4') as string || '',
      formData.get('planned_5') as string || '', formData.get('actual_5') as string || '', formData.get('status_5') as string || '', formData.get('next_follow_up_date_5') as string || '', formData.get('remark_5') as string || '',
      formData.get('lost_remark') as string || ''
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:AN${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT HRMS):', err);
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
    console.error('API Error (DELETE HRMS):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
