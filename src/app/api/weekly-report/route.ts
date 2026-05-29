import { NextResponse } from 'next/server';
import { fetchAdsRunningMcatsEnriched, fetchWeeklyAggregatedStats } from '@/lib/server/campaignData';
import { WEEKLY_REPORT_METRICS } from '@/lib/weeklyReportMetrics';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Simple in-memory response cache for this route to speed repeated identical requests
const ROUTE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
type RouteCacheEntry = { data: any; expiresAt: number };
const _routeCache = new Map<string, RouteCacheEntry>();
const getRouteCached = (key: string) => {
  const e = _routeCache.get(key) as RouteCacheEntry | undefined;
  if (e && Date.now() < e.expiresAt) return e.data;
  _routeCache.delete(key);
  return undefined;
};
const setRouteCached = (key: string, data: any) => _routeCache.set(key, { data, expiresAt: Date.now() + ROUTE_CACHE_TTL_MS });

type Granularity = 'group' | 'pmcat' | 'mcat';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const granularity = (searchParams.get('granularity') || 'group') as Granularity;
    const selectedGroup = searchParams.get('selectedGroup') || 'all';
    const selectedPmcat = searchParams.get('selectedPmcat') || 'all';
    const selectedMcat = searchParams.get('selectedMcat') || 'all';

    // Route-level cache: if an identical request was recently served, return it immediately
    const cacheKey = `weekly-report:${new URL(request.url).searchParams.toString()}`;
    const cached = getRouteCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch pre-aggregated stats from SQL (all KPIs already calculated)
    const [aggregatedStats, adsRunningMcatsEnriched] = await Promise.all([
      fetchWeeklyAggregatedStats('weekly'),
      fetchAdsRunningMcatsEnriched()
    ]);

    const adsRunningSet = new Set(adsRunningMcatsEnriched.map(m => m.mcat_name.toLowerCase().trim()));

    // Group by granularity and apply filters
    let filteredStats = aggregatedStats;
    if (granularity === 'group' && selectedGroup !== 'all') {
      filteredStats = filteredStats.filter(s => s.group_name === selectedGroup);
    } else if (granularity === 'pmcat') {
      if (selectedGroup !== 'all') filteredStats = filteredStats.filter(s => s.group_name === selectedGroup);
      if (selectedPmcat !== 'all') filteredStats = filteredStats.filter(s => s.pmcat_name === selectedPmcat);
    } else if (granularity === 'mcat') {
      if (selectedGroup !== 'all') filteredStats = filteredStats.filter(s => s.group_name === selectedGroup);
      if (selectedPmcat !== 'all') filteredStats = filteredStats.filter(s => s.pmcat_name === selectedPmcat);
      if (selectedMcat !== 'all') filteredStats = filteredStats.filter(s => s.mcat_name === selectedMcat);
    }

    // Gather available filter options
    const availableGroups = Array.from(new Set(aggregatedStats.map(s => s.group_name))).sort();
    let pmcatSource = aggregatedStats;
    if (selectedGroup !== 'all') pmcatSource = pmcatSource.filter(s => s.group_name === selectedGroup);
    const availablePmcats = Array.from(new Set(pmcatSource.map(s => s.pmcat_name))).sort();

    let mcatSource = aggregatedStats;
    if (selectedGroup !== 'all') mcatSource = mcatSource.filter(s => s.group_name === selectedGroup);
    if (selectedPmcat !== 'all') mcatSource = mcatSource.filter(s => s.pmcat_name === selectedPmcat);
    const availableMcats = Array.from(new Set(mcatSource.map(s => s.mcat_name))).sort();

    // Get unique weeks (last 6) from filtered data
    const weeks = Array.from(new Set(filteredStats.map(s => s.week_start_date)))
      .sort((a, b) => a.localeCompare(b))
      .slice(-6);

    // Aggregate by week to produce final report
    const dataByWeek = weeks.map(week => {
      const weekStats = filteredStats.filter(s => s.week_start_date === week);
      
      // Sum metrics across all rows for this week
      const aggregated = {
        bl_approved: 0,
        bl_approved_sender: 0,
        cost_per_bl: 0,
        cost_per_txn: 0,
        bl_sold_pct: 0,
        txn_pct: 0,
        blni_txn_pct: 0,
        total_cost: 0,
        pmcat_div_25: 0,
        mcat_div_10: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        conversions: 0,
        cost_per_conv: 0,
        total_req_approved: 0,
        total_calls: 0,
        enq_approved: 0,
        transactions: 0,
        unique_sold: 0,
        blni: 0,
        blni_appr_pct: 0,
        unique_purchaser: 0,
        pmcat_count: 0,
        pmcat_cov_25: 0,
        pmcat_0_5: 0,
        pmcat_5_25: 0,
        pmcat_25_100: 0,
        pmcat_100_200: 0,
        pmcat_200_400: 0,
        pmcat_400_plus: 0,
        mcat_0_clicks: 0,
        mcat_1_10_clicks: 0,
        mcat_gt_10_clicks: 0,
        unq_prod_count: null,
      };

      let totalCost = 0;
      let totalBlApproved = 0;
      let totalBlTxn = 0;
      let totalBlSold = 0;
      let totalBlni = 0;

      weekStats.forEach(stat => {
        aggregated.bl_approved += stat.bl_approved;
        aggregated.bl_approved_sender += stat.total_senders;
        aggregated.total_cost += stat.total_cost_inr;
        aggregated.transactions += stat.bl_txn_approved;
        aggregated.unique_sold += stat.bl_sold_approved;
        aggregated.blni += stat.blni;
        aggregated.enq_approved += stat.enq_approved;
        aggregated.total_calls += stat.calls_approved;
        aggregated.unique_purchaser += stat.unq_purchaser;
        aggregated.total_req_approved += stat.enq_approved + stat.calls_approved + stat.bl_approved;

        totalCost += stat.total_cost_inr;
        totalBlApproved += stat.bl_approved;
        totalBlTxn += stat.bl_txn_approved;
        totalBlSold += stat.bl_sold_approved;
        totalBlni += stat.blni;
      });

      // Recalculate weighted averages from pre-calculated values
      if (totalBlApproved > 0) {
        aggregated.cost_per_bl = totalCost / totalBlApproved;
        aggregated.bl_sold_pct = (totalBlSold / totalBlApproved) * 100;
        aggregated.txn_pct = (totalBlTxn / totalBlApproved) * 100;
        aggregated.blni_appr_pct = (totalBlni / totalBlApproved) * 100;
      }
      if (totalBlTxn > 0) {
        aggregated.cost_per_txn = totalCost / totalBlTxn;
        aggregated.blni_txn_pct = (totalBlni / totalBlTxn) * 100;
      }

      return {
        week,
        stats: aggregated as Record<string, number | null>
      };
    });

    // Calculate best-ever metrics
    const bestEver: Record<string, number | null> = {};
    if (dataByWeek.length > 0) {
      WEEKLY_REPORT_METRICS.forEach(metric => {
        if (metric.type === 'na') {
          bestEver[metric.key] = null;
          return;
        }

        let bestVal: number | null = null;
        dataByWeek.forEach(entry => {
          const val = (entry.stats as Record<string, number | null>)[metric.key];
          if (val === null || val === undefined) return;

          if (metric.type === 'currency' && metric.key.includes('cost_per')) {
            if (val > 0 && (bestVal === null || val < bestVal)) bestVal = val;
          } else if (bestVal === null || val > bestVal) {
            bestVal = val;
          }
        });

        bestEver[metric.key] = bestVal || 0;
      });
    }

    const responseBody = {
      success: true,
      data: {
        availableGroups,
        availablePmcats,
        availableMcats,
        weeks,
        reportData: {
          dataByWeek,
          bestEver
        }
      }
    };
    try { setRouteCached(cacheKey, responseBody); } catch (e) { /* ignore cache set errors */ }
    return NextResponse.json(responseBody);
  } catch (error: any) {
    console.error('Error in weekly-report route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
