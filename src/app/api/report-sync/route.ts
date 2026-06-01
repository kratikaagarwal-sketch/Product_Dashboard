import { NextResponse } from 'next/server';
import {
  syncAdsRunningRows,
  syncCampaignRows,
  syncWeeklyReportRows,
} from '@/lib/server/reportSheetCache';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type SyncTarget = 'weekly-report' | 'campaign' | 'ads-running' | 'all';
type CampaignPeriod = 'daily' | 'weekly' | 'monthly';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const target = (body.target as SyncTarget) || 'all';
    const period = (body.period as CampaignPeriod) || 'weekly';

    const results: Record<string, number> = {};

    if (target === 'all' || target === 'weekly-report') {
      results.weeklyReport = await syncWeeklyReportRows();
    }

    if (target === 'all' || target === 'campaign') {
      results.campaign = await syncCampaignRows(period);
    }

    if (target === 'all' || target === 'ads-running') {
      results.adsRunning = await syncAdsRunningRows();
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Error in report-sync route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
