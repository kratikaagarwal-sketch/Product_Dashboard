import 'server-only';

import {
  fetchAdsRunningMcatsEnriched,
  fetchDailyCampaignData,
  fetchWeeklyAggregatedStats,
} from './campaignData';
import { readJsonCache, writeJsonCache } from './jsonStore';

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

export const getCampaignRows = async (period: 'daily' | 'weekly' | 'monthly') => {
  const fileName =
    period === 'daily'
      ? CACHE_FILES.campaignDaily
      : period === 'weekly'
        ? CACHE_FILES.campaignWeekly
        : CACHE_FILES.campaignMonthly;

  return readOrFetchRows<any>(fileName, () => fetchDailyCampaignData(period));
};

export const getAdsRunningRows = async () => {
  return readOrFetchRows<any>(CACHE_FILES.adsRunning, () => fetchAdsRunningMcatsEnriched());
};

export const syncWeeklyReportRows = async () => {
  const rows = await fetchWeeklyAggregatedStats('weekly');
  await writeJsonCache(CACHE_FILES.weeklyReport, rows);
  return rows.length;
};

export const syncCampaignRows = async (period: 'daily' | 'weekly' | 'monthly') => {
  const rows = await fetchDailyCampaignData(period);
  const fileName =
    period === 'daily'
      ? CACHE_FILES.campaignDaily
      : period === 'weekly'
        ? CACHE_FILES.campaignWeekly
        : CACHE_FILES.campaignMonthly;

  await writeJsonCache(fileName, rows);
  return rows.length;
};

export const syncAdsRunningRows = async () => {
  const rows = await fetchAdsRunningMcatsEnriched();
  await writeJsonCache(CACHE_FILES.adsRunning, rows);
  return rows.length;
};

export const getReportCacheKey = buildKey;
