import { NextRequest, NextResponse } from 'next/server';
import { getSheetsData } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loginType } = body; // 'internal' or 'client'

    if (loginType === 'client') {
      const { projectName, projectCode } = body;
      if (!projectName || !projectCode) {
        return NextResponse.json({ error: 'Project Name and Project Code are required.' }, { status: 400 });
      }

      // Fetch projects
      const sheetId = CONFIG.PROJECT.SHEET_ID;
      const sheetName = CONFIG.PROJECT.SHEET_NAME;
      const data = await getSheetsData(sheetId, `${sheetName}!A2:G1000`);

      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'No projects database found.' }, { status: 404 });
      }

      // Find project matching basicInfo.name and basicInfo.code
      let matchedProject: any = null;
      for (const row of data) {
        try {
          const basicInfo = row[1] ? JSON.parse(row[1]) : {};
          if (
            basicInfo.name?.toString().trim().toLowerCase() === projectName.toString().trim().toLowerCase() &&
            basicInfo.code?.toString().trim() === projectCode.toString().trim()
          ) {
            matchedProject = {
              id: row[0],
              basicInfo
            };
            break;
          }
        } catch (e) {
          // ignore parsing error
        }
      }

      if (!matchedProject) {
        return NextResponse.json({ error: 'Invalid Project Name or Project Code.' }, { status: 401 });
      }

      const user = {
        id: matchedProject.id,
        name: `${matchedProject.basicInfo.name} Client`,
        role: 'Client',
        email: 'client@rsdesign.com',
        avatar: '',
        status: 'active',
        projectName: matchedProject.basicInfo.name,
        projectId: matchedProject.id,
        projectCode: matchedProject.basicInfo.code
      };

      return NextResponse.json({ success: true, user });

    } else {
      // Internal User Login
      const { name, password } = body;
      if (!name || !password) {
        return NextResponse.json({ error: 'Name and Password are required.' }, { status: 400 });
      }

      const sheetId = CONFIG.USER.SHEET_ID;
      const sheetName = CONFIG.USER.SHEET_NAME;

      const data = await getSheetsData(sheetId, `${sheetName}!A2:I1000`);
      
      if (!data) return NextResponse.json({ error: 'No user data found.' }, { status: 404 });

      // Mapping: Name=0, Role=1, Email=2, Status=3, Password=5
      const userRow = data.find(row => 
        row[0]?.toString().trim().toLowerCase() === name.toString().trim().toLowerCase() && 
        row[5]?.toString().trim() === password.toString().trim()
      );

      if (!userRow) {
        return NextResponse.json({ error: 'Invalid name or password.' }, { status: 401 });
      }

      const status = userRow[3]?.toString().toLowerCase() || 'active';
      if (status === 'inactive') {
        return NextResponse.json({ error: 'Account is inactive.' }, { status: 403 });
      }

      const user = {
        id: name,
        name: userRow[0],
        role: userRow[1],
        email: userRow[2],
        avatar: userRow[4] || '',
        status: userRow[3]
      };

      return NextResponse.json({ success: true, user });
    }
  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
