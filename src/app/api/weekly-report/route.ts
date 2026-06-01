import { NextResponse } from 'next/server';
import { getAdsRunningRows, getWeeklyReportRows } from '@/lib/server/reportSheetCache';
import { WEEKLY_REPORT_METRICS } from '@/lib/weeklyReportMetrics';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type Granularity = 'group' | 'pmcat' | 'mcat';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const granularity = (searchParams.get('granularity') || 'group') as Granularity;
    const selectedGroup = searchParams.get('selectedGroup') || 'all';
    const selectedPmcat = searchParams.get('selectedPmcat') || 'all';
    const selectedMcat = searchParams.get('selectedMcat') || 'all';

    // Fetch pre-aggregated stats from SQL (includes product ads + cost ratios pre-calculated)
    const [aggregatedStats, adsRunningMcatsEnriched] = await Promise.all([
      getWeeklyReportRows(),
      getAdsRunningRows()
    ]);

    const adsRunningSet = new Set(adsRunningMcatsEnriched.map(m => m.mcat_name.toLowerCase().trim()));

    // Filter master ads running list based on current filters
    let filteredAdsMcats = adsRunningMcatsEnriched;
    if (granularity === 'group') {
      if (selectedGroup !== 'all') {
        filteredAdsMcats = filteredAdsMcats.filter(m => m.group_name === selectedGroup);
      }
    } else if (granularity === 'pmcat') {
      if (selectedPmcat !== 'all') {
        filteredAdsMcats = filteredAdsMcats.filter(m => m.pmcat_name === selectedPmcat);
      } else if (selectedGroup !== 'all') {
        filteredAdsMcats = filteredAdsMcats.filter(m => m.group_name === selectedGroup);
      }
    } else if (granularity === 'mcat') {
      if (selectedMcat !== 'all') {
        filteredAdsMcats = filteredAdsMcats.filter(m => m.mcat_name === selectedMcat);
      } else if (selectedPmcat !== 'all') {
        filteredAdsMcats = filteredAdsMcats.filter(m => m.pmcat_name === selectedPmcat);
      } else if (selectedGroup !== 'all') {
        filteredAdsMcats = filteredAdsMcats.filter(m => m.group_name === selectedGroup);
      }
    }

    const denomMcatCount = new Set(filteredAdsMcats.map(m => m.mcat_name.toLowerCase().trim())).size;
    const denomPmcatCount = new Set(filteredAdsMcats.map(m => m.pmcat_name.toLowerCase().trim())).size;
    const filteredAdsMcatsSet = new Set(filteredAdsMcats.map(m => m.mcat_name.toLowerCase().trim()));
    const filteredAdsPmcatsSet = new Set(filteredAdsMcats.map(m => m.pmcat_name.toLowerCase().trim()));

    // Gather available filter options
    const availableGroups = Array.from(new Set(aggregatedStats.map(s => s.group_name))).sort();
    let pmcatSource = aggregatedStats;
    if (selectedGroup !== 'all') pmcatSource = pmcatSource.filter(s => s.group_name === selectedGroup);
    const availablePmcats = Array.from(new Set(pmcatSource.map(s => s.pmcat_name))).sort();

    let mcatSource = aggregatedStats;
    if (selectedGroup !== 'all') mcatSource = mcatSource.filter(s => s.group_name === selectedGroup);
    if (selectedPmcat !== 'all') mcatSource = mcatSource.filter(s => s.pmcat_name === selectedPmcat);
    const availableMcats = Array.from(new Set(mcatSource.map(s => s.mcat_name))).sort();

    // Apply granularity + selection filters
    let baseFilteredData = aggregatedStats;
    if (granularity === 'group' && selectedGroup !== 'all') {
      baseFilteredData = baseFilteredData.filter(d => d.group_name === selectedGroup);
    } else if (granularity === 'pmcat') {
      if (selectedGroup !== 'all') baseFilteredData = baseFilteredData.filter(d => d.group_name === selectedGroup);
      if (selectedPmcat !== 'all') baseFilteredData = baseFilteredData.filter(d => d.pmcat_name === selectedPmcat);
    } else if (granularity === 'mcat') {
      if (selectedGroup !== 'all') baseFilteredData = baseFilteredData.filter(d => d.group_name === selectedGroup);
      if (selectedPmcat !== 'all') baseFilteredData = baseFilteredData.filter(d => d.pmcat_name === selectedPmcat);
      if (selectedMcat !== 'all') baseFilteredData = baseFilteredData.filter(d => d.mcat_name === selectedMcat);
    }

    // Get unique weeks (last 6) from filtered data
    const weeks = Array.from(new Set(baseFilteredData.map(d => d.week_start_date)))
      .sort((a, b) => a.localeCompare(b))
      .slice(-6);

    // Aggregate by week to produce final KPIs
    const calculateKpisForWeek = (week: string) => {
      const weekData = baseFilteredData.filter(d => d.week_start_date === week);
      const totals: Record<string, any> = {
        bl_approved: 0,
        bl_approved_sender: 0,
        total_cost: 0,
        bl_txn_approved: 0,
        bl_sold_approved: 0,
        blni: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        enq_approved: 0,
        total_calls: 0,
        unique_purchaser: 0,
      };

      const pmcatMap = new Map<string, { bl_approved: number; impressions: number; isAdRunning: boolean }>();
      const mcatMap = new Map<string, { clicks: number; bl_approved: number; isAdRunning: boolean }>();

      // Pre-initialize with master running categories
      filteredAdsMcats.forEach(m => {
        if (m.pmcat_name && !pmcatMap.has(m.pmcat_name)) {
          pmcatMap.set(m.pmcat_name, { bl_approved: 0, impressions: 0, isAdRunning: true });
        }
        if (m.mcat_name && !mcatMap.has(m.mcat_name)) {
          mcatMap.set(m.mcat_name, { clicks: 0, bl_approved: 0, isAdRunning: true });
        }
      });

      weekData.forEach(d => {
        totals.bl_approved += d.bl_approved;
        totals.bl_approved_sender += d.fenq_bl_senders + d.intent_bl_senders + d.direct_bl_senders + d.flpns_bl_senders + d.whatsapp_bl_senders;
        totals.total_cost += d.total_cost_inr;
        totals.bl_txn_approved += d.bl_txn_approved;
        totals.bl_sold_approved += d.bl_sold_approved;
        totals.blni += d.blni;
        totals.impressions += d.total_impressions;
        totals.clicks += d.total_clicks;
        totals.conversions += d.total_conversions;
        totals.enq_approved += d.enq_approved;
        totals.total_calls += d.calls_approved;
        totals.unique_purchaser += d.unq_purchaser;

        const mcatKey = d.mcat_name.toLowerCase().trim();
        const isMcatAdRunning = adsRunningSet.has(mcatKey);

        if (!pmcatMap.has(d.pmcat_name)) {
          pmcatMap.set(d.pmcat_name, { bl_approved: 0, impressions: 0, isAdRunning: isMcatAdRunning });
        }
        const pmcatEntry = pmcatMap.get(d.pmcat_name)!;
        pmcatEntry.bl_approved += d.bl_approved;
        pmcatEntry.impressions += d.total_impressions;
        if (isMcatAdRunning) pmcatEntry.isAdRunning = true;

        if (!mcatMap.has(d.mcat_name)) {
          mcatMap.set(d.mcat_name, { clicks: 0, bl_approved: 0, isAdRunning: isMcatAdRunning });
        }
        const mcatEntry = mcatMap.get(d.mcat_name)!;
        mcatEntry.clicks += d.total_clicks;
        mcatEntry.bl_approved += d.bl_approved;
      });

      // Use pre-calculated ratios from SQL
      const cost_per_bl = totals.bl_approved > 0 ? totals.total_cost / totals.bl_approved : 0;
      const cost_per_txn = totals.bl_txn_approved > 0 ? totals.total_cost / totals.bl_txn_approved : 0;
      const bl_sold_pct = totals.bl_approved > 0 ? (totals.bl_sold_approved / totals.bl_approved) * 100 : 0;
      const txn_pct = totals.bl_approved > 0 ? (totals.bl_txn_approved / totals.bl_approved) * 100 : 0;
      const blni_txn_pct = totals.bl_txn_approved > 0 ? (totals.blni / totals.bl_txn_approved) * 100 : 0;
      const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
      const cpc = totals.clicks > 0 ? totals.total_cost / totals.clicks : 0;
      const cost_per_conv = totals.conversions > 0 ? totals.total_cost / totals.conversions : 0;
      const total_req_approved = totals.enq_approved + totals.total_calls + totals.bl_approved;
      const blni_appr_pct = totals.bl_approved > 0 ? (totals.blni / totals.bl_approved) * 100 : 0;

      // Calculate PMCAT/MCAT diversity buckets
      let pmcat_0_5 = 0, pmcat_5_25 = 0, pmcat_25_100 = 0, pmcat_100_200 = 0, pmcat_200_400 = 0, pmcat_400_plus = 0;
      pmcatMap.forEach(val => {
        if (val.bl_approved >= 0 && val.bl_approved < 5) pmcat_0_5++;
        else if (val.bl_approved < 25) pmcat_5_25++;
        else if (val.bl_approved < 100) pmcat_25_100++;
        else if (val.bl_approved < 200) pmcat_100_200++;
        else if (val.bl_approved < 400) pmcat_200_400++;
        else pmcat_400_plus++;
      });

      let mcat_0_clicks = 0, mcat_1_10_clicks = 0, mcat_gt_10_clicks = 0;
      mcatMap.forEach(val => {
        if (val.clicks === 0) mcat_0_clicks++;
        else if (val.clicks <= 10) mcat_1_10_clicks++;
        else mcat_gt_10_clicks++;
      });

      // Calculate diversity KPIs
      let numMcatGe10 = 0, numPmcatGe25 = 0;
      mcatMap.forEach((val, key) => {
        const k = key.toLowerCase().trim();
        if (filteredAdsMcatsSet.has(k) && val.bl_approved >= 10) numMcatGe10++;
      });
      pmcatMap.forEach((val, key) => {
        const k = key.toLowerCase().trim();
        if (filteredAdsPmcatsSet.has(k) && val.bl_approved >= 25) numPmcatGe25++;
      });

      const pmcat_div_25 = denomPmcatCount > 0 ? (numPmcatGe25 / denomPmcatCount) * 100 : 0;
      const mcat_div_10 = denomMcatCount > 0 ? (numMcatGe10 / denomMcatCount) * 100 : 0;

      return {
        bl_approved: totals.bl_approved,
        bl_approved_sender: totals.bl_approved_sender,
        cost_per_bl,
        cost_per_txn,
        bl_sold_pct,
        txn_pct,
        blni_txn_pct,
        total_cost: totals.total_cost,
        pmcat_div_25,
        mcat_div_10,
        impressions: totals.impressions,
        clicks: totals.clicks,
        ctr,
        cpc,
        conversions: totals.conversions,
        cost_per_conv,
        total_req_approved,
        total_calls: totals.total_calls,
        enq_approved: totals.enq_approved,
        transactions: totals.bl_txn_approved,
        unique_sold: totals.bl_sold_approved,
        blni: totals.blni,
        blni_appr_pct,
        unique_purchaser: totals.unique_purchaser,
        pmcat_count: denomPmcatCount,
        pmcat_cov_25: pmcat_div_25,
        pmcat_0_5,
        pmcat_5_25,
        pmcat_25_100,
        pmcat_100_200,
        pmcat_200_400,
        pmcat_400_plus,
        mcat_0_clicks,
        mcat_1_10_clicks,
        mcat_gt_10_clicks,
        unq_prod_count: null,
      };
    };

    const dataByWeek = weeks.map(week => ({
      week,
      stats: calculateKpisForWeek(week) as Record<string, number | null>
    }));

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
    return NextResponse.json(responseBody);
  } catch (error: any) {
    console.error('Error in weekly-report route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
