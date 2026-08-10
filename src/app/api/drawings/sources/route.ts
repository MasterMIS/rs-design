import { NextResponse } from 'next/server';
import { listSheetTitles } from '@/lib/google-sheets';
import { CONFIG } from '@/lib/config';
import { isDrawingProjectSheetTitle } from '@/lib/drawings';

const SHEET_ID = CONFIG.DRAWING_SCHEDULE.SHEET_ID;

export async function GET() {
  try {
    const titles = await listSheetTitles(SHEET_ID);
    const projects = titles.filter(isDrawingProjectSheetTitle).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      template: CONFIG.DRAWING_SCHEDULE.TEMPLATES_SHEET,
      projects,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API Error (GET Drawing Sources):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
