import { NextResponse } from 'next/server';
import { getWeeklyReportResponse, type WeeklyReportGranularity } from '@/lib/server/reportSheetCache';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const granularity = (searchParams.get('granularity') || 'group') as WeeklyReportGranularity;
    const selectedGroup = searchParams.get('selectedGroup') || 'all';
    const selectedPmcat = searchParams.get('selectedPmcat') || 'all';
    const selectedMcat = searchParams.get('selectedMcat') || 'all';

    const response = await getWeeklyReportResponse({
      granularity,
      selectedGroup,
      selectedPmcat,
      selectedMcat,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in weekly-report route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
