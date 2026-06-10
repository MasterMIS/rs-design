import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToDrive } from '@/lib/google-sheets';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const folderId = formData.get('folderId') as string;
    const files = formData.getAll('files') as File[];

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadedFiles = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const url = await uploadFileToDrive(buffer, file.name, file.type, folderId);
      uploadedFiles.push({ name: file.name, url, title: file.name });
    }

    return NextResponse.json({ files: uploadedFiles });
  } catch (error: any) {
    console.error('Upload API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload files' }, { status: 500 });
  }
}
