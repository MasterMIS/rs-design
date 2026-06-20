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
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:R`);

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
        ea_remarks: row[14] || '',
        director_remarks: row[15] || '',
        first_round_remark: row[16] || '',
        final_round_remark: row[17] || '',
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
      const driveFile = await uploadFileToDrive(
        buffer,
        `CV_${Date.now()}_${cvFile.name}`,
        cvFile.type,
        FOLDER_ID
      );
      if (driveFile.id) {
        cvUrl = `https://drive.google.com/file/d/${driveFile.id}/view`;
      }
    }

    if (photoFile && photoFile.size > 0 && FOLDER_ID) {
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      const driveFile = await uploadFileToDrive(
        buffer,
        `PHOTO_${Date.now()}_${photoFile.name}`,
        photoFile.type,
        FOLDER_ID
      );
      if (driveFile.id) {
        photoUrl = `https://drive.google.com/file/d/${driveFile.id}/view`;
      }
    }

    const id = `EMP-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newRow = [
      id,
      timestamp,
      timestamp, // updated_at
      employee_name || '',
      contact_no || '',
      post_applied || '',
      qualification || '',
      date_of_birth || '',
      marital_status || '',
      address || '',
      expectation || '',
      company_details || '',
      cvUrl,
      photoUrl,
      '', // ea_remarks
      '', // director_remarks
      '', // first_round_remark
      '', // final_round_remark
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
    const ea_remarks = formData.get('ea_remarks') as string;
    const director_remarks = formData.get('director_remarks') as string;
    const first_round_remark = formData.get('first_round_remark') as string;
    const final_round_remark = formData.get('final_round_remark') as string;

    const cvFile = formData.get('cv_upload') as File | null;
    const photoFile = formData.get('photo_upload') as File | null;

    let cvUrl = existingCvUrl;
    let photoUrl = existingPhotoUrl;

    if (cvFile && cvFile.size > 0 && FOLDER_ID) {
      const buffer = Buffer.from(await cvFile.arrayBuffer());
      const driveFile = await uploadFileToDrive(
        buffer,
        `CV_${Date.now()}_${cvFile.name}`,
        cvFile.type,
        FOLDER_ID
      );
      if (driveFile.id) cvUrl = `https://drive.google.com/file/d/${driveFile.id}/view`;
    }

    if (photoFile && photoFile.size > 0 && FOLDER_ID) {
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      const driveFile = await uploadFileToDrive(
        buffer,
        `PHOTO_${Date.now()}_${photoFile.name}`,
        photoFile.type,
        FOLDER_ID
      );
      if (driveFile.id) photoUrl = `https://drive.google.com/file/d/${driveFile.id}/view`;
    }

    const updated_at = new Date().toISOString();

    const updatedRow = [
      id,
      created_at,
      updated_at,
      employee_name || '',
      contact_no || '',
      post_applied || '',
      qualification || '',
      date_of_birth || '',
      marital_status || '',
      address || '',
      expectation || '',
      company_details || '',
      cvUrl,
      photoUrl,
      ea_remarks || '',
      director_remarks || '',
      first_round_remark || '',
      final_round_remark || '',
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:R${rowIndex}`, [updatedRow]);

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
