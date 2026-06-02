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
    // If Redshift credentials are not configured, skip sync gracefully instead of failing/spamming console
    if (!process.env.REDSHIFT_HOST || !process.env.REDSHIFT_PASSWORD) {
      console.info('Sync skipped: REDSHIFT_HOST or REDSHIFT_PASSWORD env var is not configured.');
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Sync skipped: Database credentials are not configured.'
      });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const target = (body.target as SyncTarget) || 'all';
    const period = (body.period as CampaignPeriod) || 'weekly';

    console.info(`[API/report-sync] Triggered sync target: "${target}" (period: "${period}")`);
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

    console.info('[API/report-sync] Sync completed successfully:', results);
    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Error in report-sync route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
