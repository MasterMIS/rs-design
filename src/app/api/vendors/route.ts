import { NextRequest, NextResponse } from 'next/server';
import { getSheetsData, appendSheetsData, updateSheetRow, deleteSheetRow, uploadFileToDrive } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

const SHEET_ID = CONFIG.VENDOR.SHEET_ID;
const SHEET_NAME = CONFIG.VENDOR.SHEET_NAME;
const FOLDER_ID = CONFIG.VENDOR.FOLDER_ID;

export async function GET() {
  try {
    const data = await getSheetsData(SHEET_ID, `${SHEET_NAME}!A2:N1000`);

    if (!data || data.length === 0) return NextResponse.json([]);

    const vendors = data.map((row: string[], index: number) => ({
      rowIndex: index + 2,
      id: row[0] || '',
      createdAt: row[1] || '',
      companyName: row[2] || '',
      category: row[3] || '',
      contactPerson: row[4] || '',
      phone: row[5] || '',
      email: row[6] || '',
      officeAddress: row[7] || '',
      gstin: row[8] || '',
      bankDetails: row[9] || '',
      paymentTerms: row[10] || '',
      qualityRating: row[11] || '',
      remarks: row[12] || '',
      attachments: row[13] ? JSON.parse(row[13]) : [],
    })).filter((v: any) => v.id || v.companyName);

    return NextResponse.json(vendors);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Vendors):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const id = `VND-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const createdAt = new Date().toISOString();
    
    const companyName = formData.get('companyName')?.toString() || '';
    const category = formData.get('category')?.toString() || '';
    const contactPerson = formData.get('contactPerson')?.toString() || '';
    const phone = formData.get('phone')?.toString() || '';
    const email = formData.get('email')?.toString() || '';
    const officeAddress = formData.get('officeAddress')?.toString() || '';
    const gstin = formData.get('gstin')?.toString() || '';
    const bankDetails = formData.get('bankDetails')?.toString() || '';
    const paymentTerms = formData.get('paymentTerms')?.toString() || '';
    const qualityRating = formData.get('qualityRating')?.toString() || '';
    const remarks = formData.get('remarks')?.toString() || '';

    const files = formData.getAll('newFiles') as File[];
    const uploadedFiles: { name: string; url: string }[] = [];

    for (const file of files) {
      if (file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await uploadFileToDrive(buffer, file.name, file.type || 'application/octet-stream', FOLDER_ID);
        if (result.id) {
          uploadedFiles.push({ name: file.name, url: `https://lh3.googleusercontent.com/d/${result.id}` });
        }
      }
    }

    const rowData = [
      id,
      createdAt,
      companyName,
      category,
      contactPerson,
      phone,
      email,
      officeAddress,
      gstin,
      bankDetails,
      paymentTerms,
      qualityRating,
      remarks,
      JSON.stringify(uploadedFiles)
    ];

    await appendSheetsData(SHEET_ID, `${SHEET_NAME}!A2`, [rowData]);

    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (POST Vendor):', err);
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
    
    const id = formData.get('id')?.toString() || '';
    const createdAt = formData.get('createdAt')?.toString() || new Date().toISOString();
    const companyName = formData.get('companyName')?.toString() || '';
    const category = formData.get('category')?.toString() || '';
    const contactPerson = formData.get('contactPerson')?.toString() || '';
    const phone = formData.get('phone')?.toString() || '';
    const email = formData.get('email')?.toString() || '';
    const officeAddress = formData.get('officeAddress')?.toString() || '';
    const gstin = formData.get('gstin')?.toString() || '';
    const bankDetails = formData.get('bankDetails')?.toString() || '';
    const paymentTerms = formData.get('paymentTerms')?.toString() || '';
    const qualityRating = formData.get('qualityRating')?.toString() || '';
    const remarks = formData.get('remarks')?.toString() || '';

    const existingFilesStr = formData.get('existingFiles')?.toString();
    const existingFiles = existingFilesStr ? JSON.parse(existingFilesStr) : [];
    
    const newFiles = formData.getAll('newFiles') as File[];
    const uploadedFiles: { name: string; url: string }[] = [...existingFiles];

    for (const file of newFiles) {
      if (file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await uploadFileToDrive(buffer, file.name, file.type || 'application/octet-stream', FOLDER_ID);
        if (result.id) {
          uploadedFiles.push({ name: file.name, url: `https://lh3.googleusercontent.com/d/${result.id}` });
        }
      }
    }

    const updatedRow = [
      id,
      createdAt,
      companyName,
      category,
      contactPerson,
      phone,
      email,
      officeAddress,
      gstin,
      bankDetails,
      paymentTerms,
      qualityRating,
      remarks,
      JSON.stringify(uploadedFiles)
    ];

    await updateSheetRow(SHEET_ID, `${SHEET_NAME}!A${rowIndex}:N${rowIndex}`, [updatedRow]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (PUT Vendor):', err);
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
    console.error('API Error (DELETE Vendor):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
