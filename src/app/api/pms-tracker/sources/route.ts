import { NextResponse } from 'next/server';
import { listSheetTitles } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';
import { isProjectSheetTitle } from '@/lib/pms-tracker';

const SHEET_ID = CONFIG.PMS_TRACKER.SHEET_ID;

export async function GET() {
  try {
    const titles = await listSheetTitles(SHEET_ID);
    const projects = titles.filter(isProjectSheetTitle).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      template: CONFIG.PMS_TRACKER.TEMPLATES_SHEET,
      projects,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET PMS Sources):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
