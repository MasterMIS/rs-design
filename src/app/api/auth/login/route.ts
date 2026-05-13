import { NextRequest, NextResponse } from 'next/server';
import { getSheetsData } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json();
    const sheetId = CONFIG.USER.SHEET_ID;
    const sheetName = CONFIG.USER.SHEET_NAME;

    const data = await getSheetsData(sheetId, `${sheetName}!A2:I1000`);
    
    if (!data) return NextResponse.json({ error: 'No user data found' }, { status: 404 });

    // Mapping: Name=0, Role=1, Email=2, Status=3, Avatar=4, Password=5
    const userRow = data.find(row => 
      row[0]?.toString().trim().toLowerCase() === name.toString().trim().toLowerCase() && 
      row[5]?.toString().trim() === password.toString().trim()
    );

    if (!userRow) {
      return NextResponse.json({ error: 'Invalid name or password' }, { status: 401 });
    }

    const status = userRow[3]?.toString().toLowerCase() || 'active';
    if (status === 'inactive') {
      return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
    }

    const user = {
      id: name,
      name: userRow[0],
      role: userRow[1],
      email: userRow[2],
      avatar: userRow[4],
      status: userRow[3]
    };

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
