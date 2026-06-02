import 'server-only';

import { createHash } from 'crypto';
import {
  fetchAdsRunningMcatsEnriched,
  fetchDailyCampaignData,
  fetchWeeklyAggregatedStats,
} from './campaignData';
import { getJsonCacheMeta, readJsonCache, writeJsonCache } from './jsonStore';
import { WEEKLY_REPORT_METRICS } from '@/lib/weeklyReportMetrics';
import {
  type CompactCampaignRowsPayload,
  encodeCompactCampaignRows,
} from '@/lib/campaignCompact';

const CACHE_FILES = {
  weeklyReport: 'weekly-report.json',
  campaignDaily: 'campaign-daily.json',
  campaignWeekly: 'campaign-weekly.json',
  campaignMonthly: 'campaign-monthly.json',
  adsRunning: 'ads-running.json',
} as const;

const normalizeKeyPart = (value: unknown) => String(value ?? '').trim().toLowerCase();

const buildKey = (...parts: unknown[]) => parts.map(normalizeKeyPart).join('|');

const readRows = async <T,>(fileName: string): Promise<T[] | null> => {
  const cached = await readJsonCache<T[]>(fileName);
  return Array.isArray(cached) ? cached : null;
};

const readOrFetchRows = async <T,>(fileName: string, fetcher: () => Promise<T[]>): Promise<T[]> => {
  try {
    const cached = await readRows<T>(fileName);
    if (cached) return cached;
  } catch {
    // Fall back to a live refresh when the cache file is missing or malformed.
  }

  const rows = await fetcher();
  await writeJsonCache(fileName, rows);
  return rows;
};

export const getWeeklyReportRows = async () => {
  return readOrFetchRows<any>(CACHE_FILES.weeklyReport, () => fetchWeeklyAggregatedStats('weekly'));
};

const getCampaignCacheFileName = (period: 'daily' | 'weekly' | 'monthly') => {
  return period === 'daily'
    ? CACHE_FILES.campaignDaily
    : period === 'weekly'
      ? CACHE_FILES.campaignWeekly
      : CACHE_FILES.campaignMonthly;
};

const getCompactCampaignCacheFileName = (period: 'daily' | 'weekly' | 'monthly') => {
  return `compact/${getCampaignCacheFileName(period)}`;
};

export const getCampaignRows = async (period: 'daily' | 'weekly' | 'monthly') => {
  const fileName = getCampaignCacheFileName(period);
  return readOrFetchRows<any>(fileName, () => fetchDailyCampaignData(period));
};

export const getCompactCampaignRows = async (
  period: 'daily' | 'weekly' | 'monthly',
): Promise<CompactCampaignRowsPayload> => {
  const rawFileName = getCampaignCacheFileName(period);
  const compactFileName = getCompactCampaignCacheFileName(period);
  const rawMeta = await getJsonCacheMeta(rawFileName);
  const cached = await readJsonCache<CompactCampaignRowsPayload>(compactFileName);

  if (
    cached?.format === 'compact-campaign-rows' &&
    cached.source?.period === period &&
    cached.source?.mtimeMs === (rawMeta?.mtimeMs ?? null) &&
    cached.source?.size === (rawMeta?.size ?? null)
  ) {
    return cached;
  }

  const rows = await getCampaignRows(period);
  const freshRawMeta = await getJsonCacheMeta(rawFileName);
  const payload = encodeCompactCampaignRows(rows, {
    period,
    mtimeMs: freshRawMeta?.mtimeMs ?? null,
    size: freshRawMeta?.size ?? null,
  });

  await writeJsonCache(compactFileName, payload);
  return payload;
};

export const getAdsRunningRows = async () => {
  return readOrFetchRows<any>(CACHE_FILES.adsRunning, () => fetchAdsRunningMcatsEnriched());
};

export const syncWeeklyReportRows = async () => {
  console.info('[Sync] Starting sync: Weekly Report...');
  const rows = await fetchWeeklyAggregatedStats('weekly');
  console.info(`[Sync] Stats retrieved successfully. Writing ${rows.length} rows to cache: ${CACHE_FILES.weeklyReport}`);
  await writeJsonCache(CACHE_FILES.weeklyReport, rows);
  console.info('[Sync] Warming weekly report response cache...');
  await warmWeeklyReportResponseCache(rows);
  console.info('[Sync] Sync complete: Weekly Report.');
  return rows.length;
};

export const syncCampaignRows = async (period: 'daily' | 'weekly' | 'monthly') => {
  console.info(`[Sync] Starting sync: Campaign data (period: ${period})...`);
  const rows = await fetchDailyCampaignData(period);
  const fileName = getCampaignCacheFileName(period);

  console.info(`[Sync] Campaign data retrieved. Writing raw rows to cache: ${fileName}`);
  await writeJsonCache(fileName, rows);
  const rawMeta = await getJsonCacheMeta(fileName);

  const compactFileName = getCompactCampaignCacheFileName(period);
  console.info(`[Sync] Encoding and writing compact campaign data to cache: ${compactFileName}`);
  await writeJsonCache(
    compactFileName,
    encodeCompactCampaignRows(rows, {
      period,
      mtimeMs: rawMeta?.mtimeMs ?? null,
      size: rawMeta?.size ?? null,
    }),
  );
  console.info(`[Sync] Sync complete: Campaign data (period: ${period}).`);
  return rows.length;
};

export const syncAdsRunningRows = async () => {
  console.info('[Sync] Starting sync: Ads Running MCATs...');
  const rows = await fetchAdsRunningMcatsEnriched();
  console.info(`[Sync] Ads Running stats retrieved. Writing ${rows.length} rows to cache: ${CACHE_FILES.adsRunning}`);
  await writeJsonCache(CACHE_FILES.adsRunning, rows);
  console.info('[Sync] Sync complete: Ads Running MCATs.');
  return rows.length;
};

export const getReportCacheKey = buildKey;

export type WeeklyReportGranularity = 'group' | 'pmcat' | 'mcat';

export type WeeklyReportQuery = {
  granularity: WeeklyReportGranularity;
  selectedGroup: string;
  selectedPmcat: string;
  selectedMcat: string;
};

export type WeeklyReportResponseData = {
  availableGroups: string[];
  availablePmcats: string[];
  availableMcats: string[];
  weeks: string[];
  reportData: {
    dataByWeek: Array<{
      week: string;
      stats: Record<string, number | null>;
    }>;
    bestEver: Record<string, number | null>;
  };
};

export type WeeklyReportApiResponse = {
  success: true;
  data: WeeklyReportResponseData;
};

const WEEKLY_REPORT_RESPONSE_DIR = 'weekly-report-responses';
const DEFAULT_WEEKLY_REPORT_QUERY: WeeklyReportQuery = {
  granularity: 'group',
  selectedGroup: 'all',
  selectedPmcat: 'all',
  selectedMcat: 'all',
};

const normalizeWeeklyReportQuery = (query: WeeklyReportQuery) => ({
  granularity: query.granularity,
  selectedGroup: normalizeKeyPart(query.selectedGroup),
  selectedPmcat: normalizeKeyPart(query.selectedPmcat),
  selectedMcat: normalizeKeyPart(query.selectedMcat),
});

const getWeeklyReportResponseCacheFileName = async (query: WeeklyReportQuery) => {
  const [weeklyMeta, adsMeta] = await Promise.all([
    getJsonCacheMeta(CACHE_FILES.weeklyReport),
    getJsonCacheMeta(CACHE_FILES.adsRunning),
  ]);

  const version = {
    weekly: weeklyMeta ? `${weeklyMeta.mtimeMs}:${weeklyMeta.size}` : 'missing',
    ads: adsMeta ? `${adsMeta.mtimeMs}:${adsMeta.size}` : 'missing',
  };

  const key = createHash('sha1')
    .update(JSON.stringify({ query: normalizeWeeklyReportQuery(query), version }))
    .digest('hex');

  return `${WEEKLY_REPORT_RESPONSE_DIR}/${key}.json`;
};

const getWeekSet = (baseFilteredData: any[]) => {
  const weeks = Array.from(new Set(baseFilteredData.map(d => d.week_start_date)))
    .sort((a, b) => a.localeCompare(b))
    .slice(-6);
  return weeks;
};

const calculateWeeklyReportResponse = async (
  query: WeeklyReportQuery,
  aggregatedStats: any[],
  adsRunningMcatsEnriched: any[],
): Promise<WeeklyReportApiResponse> => {
  const adsRunningSet = new Set(
    adsRunningMcatsEnriched.map(m => m.mcat_name.toLowerCase().trim()),
  );

  let filteredAdsMcats = adsRunningMcatsEnriched;
  if (query.granularity === 'group') {
    if (query.selectedGroup !== 'all') {
      filteredAdsMcats = filteredAdsMcats.filter(m => m.group_name === query.selectedGroup);
    }
  } else if (query.granularity === 'pmcat') {
    if (query.selectedPmcat !== 'all') {
      filteredAdsMcats = filteredAdsMcats.filter(m => m.pmcat_name === query.selectedPmcat);
    } else if (query.selectedGroup !== 'all') {
      filteredAdsMcats = filteredAdsMcats.filter(m => m.group_name === query.selectedGroup);
    }
  } else if (query.granularity === 'mcat') {
    if (query.selectedMcat !== 'all') {
      filteredAdsMcats = filteredAdsMcats.filter(m => m.mcat_name === query.selectedMcat);
    } else if (query.selectedPmcat !== 'all') {
      filteredAdsMcats = filteredAdsMcats.filter(m => m.pmcat_name === query.selectedPmcat);
    } else if (query.selectedGroup !== 'all') {
      filteredAdsMcats = filteredAdsMcats.filter(m => m.group_name === query.selectedGroup);
    }
  }

  const denomMcatCount = new Set(filteredAdsMcats.map(m => m.mcat_name.toLowerCase().trim())).size;
  const denomPmcatCount = new Set(filteredAdsMcats.map(m => m.pmcat_name.toLowerCase().trim())).size;
  const filteredAdsMcatsSet = new Set(filteredAdsMcats.map(m => m.mcat_name.toLowerCase().trim()));
  const filteredAdsPmcatsSet = new Set(filteredAdsMcats.map(m => m.pmcat_name.toLowerCase().trim()));

  const availableGroups = Array.from(new Set(aggregatedStats.map(s => s.group_name))).sort();
  let pmcatSource = aggregatedStats;
  if (query.selectedGroup !== 'all') pmcatSource = pmcatSource.filter(s => s.group_name === query.selectedGroup);
  const availablePmcats = Array.from(new Set(pmcatSource.map(s => s.pmcat_name))).sort();

  let mcatSource = aggregatedStats;
  if (query.selectedGroup !== 'all') mcatSource = mcatSource.filter(s => s.group_name === query.selectedGroup);
  if (query.selectedPmcat !== 'all') mcatSource = mcatSource.filter(s => s.pmcat_name === query.selectedPmcat);
  const availableMcats = Array.from(new Set(mcatSource.map(s => s.mcat_name))).sort();

  let baseFilteredData = aggregatedStats;
  if (query.granularity === 'group' && query.selectedGroup !== 'all') {
    baseFilteredData = baseFilteredData.filter(d => d.group_name === query.selectedGroup);
  } else if (query.granularity === 'pmcat') {
    if (query.selectedGroup !== 'all') baseFilteredData = baseFilteredData.filter(d => d.group_name === query.selectedGroup);
    if (query.selectedPmcat !== 'all') baseFilteredData = baseFilteredData.filter(d => d.pmcat_name === query.selectedPmcat);
  } else if (query.granularity === 'mcat') {
    if (query.selectedGroup !== 'all') baseFilteredData = baseFilteredData.filter(d => d.group_name === query.selectedGroup);
    if (query.selectedPmcat !== 'all') baseFilteredData = baseFilteredData.filter(d => d.pmcat_name === query.selectedPmcat);
    if (query.selectedMcat !== 'all') baseFilteredData = baseFilteredData.filter(d => d.mcat_name === query.selectedMcat);
  }

  const weeks = getWeekSet(baseFilteredData);

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
    stats: calculateKpisForWeek(week) as Record<string, number | null>,
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

  return {
    success: true,
    data: {
      availableGroups,
      availablePmcats,
      availableMcats,
      weeks,
      reportData: {
        dataByWeek,
        bestEver,
      },
    },
  };
};

const buildWeeklyReportResponse = async (
  query: WeeklyReportQuery,
  aggregatedStats?: any[],
): Promise<WeeklyReportApiResponse> => {
  const [rows, adsRunningMcatsEnriched] = aggregatedStats
    ? [aggregatedStats, await getAdsRunningRows()]
    : await Promise.all([getWeeklyReportRows(), getAdsRunningRows()]);

  return calculateWeeklyReportResponse(query, rows, adsRunningMcatsEnriched);
};

export const getWeeklyReportResponse = async (query: WeeklyReportQuery) => {
  const cacheFileName = await getWeeklyReportResponseCacheFileName(query);
  const cached = await readJsonCache<WeeklyReportApiResponse>(cacheFileName);
  if (cached) return cached;

  const response = await buildWeeklyReportResponse(query);
  await writeJsonCache(cacheFileName, response);
  return response;
};

const warmWeeklyReportResponseCache = async (rows: any[]) => {
  console.info('[Sync] Warming DEFAULT weekly report response cache...');
  const response = await buildWeeklyReportResponse(DEFAULT_WEEKLY_REPORT_QUERY, rows);
  const cacheFileName = await getWeeklyReportResponseCacheFileName(DEFAULT_WEEKLY_REPORT_QUERY);
  await writeJsonCache(cacheFileName, response);
  console.info(`[Sync] Cache warmed and written to: ${cacheFileName}`);
};
