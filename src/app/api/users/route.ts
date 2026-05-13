import { NextRequest, NextResponse } from 'next/server';
import { 
  getSheetsData, 
  appendSheetsData, 
  uploadFileToDrive, 
  updateSheetRow, 
  deleteSheetRow 
} from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.USER.SHEET_ID;
const SHEET_NAME = CONFIG.USER.SHEET_NAME;
const FOLDER_ID = CONFIG.USER.FOLDER_ID;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:I1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const users = data.map((row: any, index: number) => ({
      id: index + 2, 
      name: row[0] || '',
      role: row[1] || 'User',
      email: row[2] || '',
      status: row[3] || 'Active',
      avatar: row[4] || '',
      password: row[5] || '',
      mobile: row[6] || '',
      department: row[7] || '',
      designation: row[8] || '',
    }));

    return NextResponse.json(users);
  } catch (error: any) {
    console.error('API Error (GET):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const role = formData.get('role') as string;
    const status = formData.get('status') as string;
    const password = formData.get('password') as string;
    const mobile = formData.get('mobile') as string;
    const department = formData.get('department') as string;
    const designation = formData.get('designation') as string;
    const image = formData.get('image') as File | null;

    let imageUrl = '';
    if (image && image.size > 0 && FOLDER_ID) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const driveFile = await uploadFileToDrive(buffer, `${name}_avatar`, image.type, FOLDER_ID);
      imageUrl = driveFile.id ? `https://lh3.googleusercontent.com/d/${driveFile.id}` : '';
    }

    const newRow = [name, role, email, status, imageUrl, password, mobile, department, designation];
    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [newRow]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error (POST):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const role = formData.get('role') as string;
    const status = formData.get('status') as string;
    const password = formData.get('password') as string;
    const mobile = formData.get('mobile') as string;
    const department = formData.get('department') as string;
    const designation = formData.get('designation') as string;
    const image = formData.get('image') as File | string | null;

    let imageUrl = typeof image === 'string' ? image : '';
    if (image instanceof File && image.size > 0 && FOLDER_ID) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const driveFile = await uploadFileToDrive(buffer, `${name}_avatar`, image.type, FOLDER_ID);
      imageUrl = driveFile.id ? `https://lh3.googleusercontent.com/d/${driveFile.id}` : '';
    }

    const updatedRow = [name, role, email, status, imageUrl, password, mobile, department, designation];
    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${id}:I${id}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error (PUT):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    await deleteSheetRow(SHEET_ID, SHEET_NAME, parseInt(id) - 1);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error (DELETE):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
