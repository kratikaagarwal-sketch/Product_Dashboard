import { NextResponse } from 'next/server';
import { type CampaignPeriod } from '@/lib/server/campaignData';
import { getCampaignRows, getCompactCampaignRows } from '@/lib/server/reportSheetCache';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'daily') as CampaignPeriod;
    const format = searchParams.get('format');
    const data = format === 'compact'
      ? await getCompactCampaignRows(period)
      : await getCampaignRows(period);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in daily-campaign route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
