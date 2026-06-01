import { NextResponse } from 'next/server';
import { getAdsRunningRows } from '@/lib/server/reportSheetCache';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const data = await getAdsRunningRows();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching Ads Running MCATs:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

