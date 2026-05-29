import 'server-only';

import { Pool } from 'pg';

// ─── Server-side in-memory cache ────────────────────────────────────────────
// Prevents repeated Redshift round-trips for the same data within 5 minutes.
// Each Node process holds its own cache; safe for single-server deploys.
const SERVER_CACHE_TTL_MS = 5 * 60 * 1000;

type ServerCacheEntry<T> = { data: T; expiresAt: number };
const _serverCache = new Map<string, ServerCacheEntry<unknown>>();

function getServerCached<T>(key: string): T | undefined {
  const entry = _serverCache.get(key) as ServerCacheEntry<T> | undefined;
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  _serverCache.delete(key);
  return undefined;
}

function setServerCached<T>(key: string, data: T): void {
  _serverCache.set(key, { data, expiresAt: Date.now() + SERVER_CACHE_TTL_MS });
}

export type CampaignPeriod = 'daily' | 'weekly' | 'monthly';

export type DailyCampaignRow = {
  week_start_date: string;
  mcat_name: string;
  group_name: string;
  pmcat_name: string;
  bl_sold_approved: number;
  bl_approved: number;
  bl_txn_approved: number;
  blni: number;
  enq_approved: number;
  calls_approved: number;
  unq_purchaser: number;
  fenq_bl_senders: number;
  intent_bl_senders: number;
  direct_bl_senders: number;
  flpns_bl_senders: number;
  whatsapp_bl_senders: number;
  total_cost_inr: number;
  total_clicks: number;
  total_impressions: number;
  total_conversions: number;
};

declare global {
  var dailyCampaignPool: Pool | undefined;
  var adsRunningPool: Pool | undefined;
}

const dailyCampaignPoolConfig = {
  host: 'bi-dwh-redshift-production.c98rtyhhgrpm.ap-south-1.redshift.amazonaws.com',
  user: 'rd_mktplace_pwrbi',
  password: 'p83z28CjbMjA',
  database: 'biredshiftdb',
  port: 5439,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

const adsRunningPoolConfig = {
  host: 'bi-dwh-redshift-production.c98rtyhhgrpm.ap-south-1.redshift.amazonaws.com',
  user: 'rd_sushmita_87494',
  password: 'BWsxCY96G8',
  database: 'biredshiftdb',
  port: 5439,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

const getSharedPool = (globalKey: 'dailyCampaignPool' | 'adsRunningPool', poolConfig: object) => {
  if (process.env.NODE_ENV === 'production') {
    return new Pool(poolConfig);
  }

  if (!globalThis[globalKey]) {
    globalThis[globalKey] = new Pool(poolConfig);
  }

  return globalThis[globalKey] as Pool;
};

const dailyCampaignPool = getSharedPool('dailyCampaignPool', dailyCampaignPoolConfig);
const adsRunningPool = getSharedPool('adsRunningPool', adsRunningPoolConfig);

const extractDateString = (val: unknown): string => {
  if (!val) return '';
  if (typeof val === 'string') return val.split('T')[0];
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
};

export const fetchDailyCampaignData = async (period: CampaignPeriod): Promise<DailyCampaignRow[]> => {
  const cacheKey = `campaign:${period}`;
  const cachedResult = getServerCached<DailyCampaignRow[]>(cacheKey);
  if (cachedResult) return cachedResult;

  let timePeriodFlag = 'd';
  let dateRangeFilter = "a.st_date >= CURRENT_DATE - INTERVAL '30 days' AND a.st_date < CURRENT_DATE";
  let productAdsDateTrunc = 'report_date';
  let campaignDateTrunc = 'a.st_date::date';

  if (period === 'weekly') {
    timePeriodFlag = 'w';
    dateRangeFilter = "a.st_date >= DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day') - INTERVAL '85 day' AND a.st_date < DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day') - INTERVAL '1 day'";
    productAdsDateTrunc = "DATE_TRUNC('week', report_date + INTERVAL '1 day')::date - INTERVAL '1 day'";
    campaignDateTrunc = 'a.st_date::date';
  } else if (period === 'monthly') {
    timePeriodFlag = 'm';
    dateRangeFilter = "a.st_date >= CURRENT_DATE - INTERVAL '365 days' AND a.st_date < CURRENT_DATE";
    productAdsDateTrunc = "DATE_TRUNC('month', report_date)::date";
    campaignDateTrunc = "DATE_TRUNC('month', a.st_date)::date";
  }

  const query = `
    WITH product_ads_agg AS (
        SELECT
            TRIM(LOWER(segments_product_type_l4)) AS mcat_name_key,
            ${productAdsDateTrunc} AS report_date,
            SUM(total_clicks)       AS total_clicks,
            SUM(total_impressions)  AS total_impressions,
            SUM(total_conversions)  AS total_conversions
        FROM im_datamart_bigquery.fact_bigquery_product_ads
        GROUP BY 1, 2
    )
    SELECT
        ${campaignDateTrunc} AS week_start_date,
        b.glcat_mcat_name AS mcat_name,
        b.glcat_grp_name AS group_name,
        b.prime_pmcat_name AS pmcat_name,
        SUM(a.bl_sold)        AS bl_sold_approved,
        SUM(a.bl_approved)    AS bl_approved,
        SUM(a.trans)          AS bl_txn_approved,
        SUM(a.blni)           AS blni,
        SUM(a.total_cost_inr) AS total_cost_inr,
        SUM(a.enq_approved)   AS enq_approved,
        SUM(a.calls_approved) AS calls_approved,
        SUM(a.unq_purchaser)  AS unq_purchaser,
        SUM(a.fenq_bl_senders) AS fenq_bl_senders,
        SUM(a.intent_bl_senders) AS intent_bl_senders,
        SUM(a.direct_bl_senders) AS direct_bl_senders,
        SUM(a.flpns_bl_senders) AS flpns_bl_senders,
        SUM(a.whatsapp_bl_senders) AS whatsapp_bl_senders,
        SUM(p.total_clicks)        AS total_clicks,
        SUM(p.total_impressions)   AS total_impressions,
        SUM(p.total_conversions)   AS total_conversions
    FROM im_datamart_category.mcat_ads_campaign a
    LEFT JOIN im_dwh.dim_glcat_mcat b
        ON a.mcat_id = b.glcat_mcat_id
    LEFT JOIN product_ads_agg p
        ON TRIM(LOWER(b.glcat_mcat_name)) = p.mcat_name_key
        AND ${campaignDateTrunc} = p.report_date
    WHERE
        a.time_period_flag = '${timePeriodFlag}'
        AND ${dateRangeFilter}
        AND a.flag = 2
    GROUP BY 1, 2, 3, 4
    ORDER BY 1 DESC, 2;
  `;

  const result = await dailyCampaignPool.query(query);

  const data = result.rows.map(row => ({
    week_start_date: extractDateString(row.week_start_date),
    mcat_name: row.mcat_name || 'Unknown MCAT',
    group_name: row.group_name || 'Unknown Group',
    pmcat_name: row.pmcat_name || 'Unknown PMCAT',
    bl_sold_approved: parseInt(row.bl_sold_approved, 10) || 0,
    bl_approved: parseInt(row.bl_approved, 10) || 0,
    bl_txn_approved: parseInt(row.bl_txn_approved, 10) || 0,
    blni: parseInt(row.blni, 10) || 0,
    enq_approved: parseInt(row.enq_approved, 10) || 0,
    calls_approved: parseInt(row.calls_approved, 10) || 0,
    unq_purchaser: parseInt(row.unq_purchaser, 10) || 0,
    fenq_bl_senders: parseInt(row.fenq_bl_senders, 10) || 0,
    intent_bl_senders: parseInt(row.intent_bl_senders, 10) || 0,
    direct_bl_senders: parseInt(row.direct_bl_senders, 10) || 0,
    flpns_bl_senders: parseInt(row.flpns_bl_senders, 10) || 0,
    whatsapp_bl_senders: parseInt(row.whatsapp_bl_senders, 10) || 0,
    total_cost_inr: parseFloat(row.total_cost_inr) || 0,
    total_clicks: parseInt(row.total_clicks, 10) || 0,
    total_impressions: parseInt(row.total_impressions, 10) || 0,
    total_conversions: parseFloat(row.total_conversions) || 0,
  }));
  setServerCached(cacheKey, data);
  return data;
};

export type AdsRunningMcat = {
  flag: string;
  mcat_name: string;
  group_name: string;
  pmcat_name: string;
};

export const fetchAdsRunningMcatsEnriched = async (): Promise<AdsRunningMcat[]> => {
  const cacheKey = 'adsRunning';
  const cachedResult = getServerCached<AdsRunningMcat[]>(cacheKey);
  if (cachedResult) return cachedResult;

  // Fetch ads-running data from Redash query results, then enrich MCAT ids with names
  const REDASH_HOST = process.env.REDASH_HOST || 'https://redash.intermesh.net';
  const REDASH_API_KEY = process.env.REDASH_API_KEY || 'N9kwAb9BYe59Dl6IP5ciuezX4lgGnmV31mk0BF79';
  const REDASH_QUERY_ID = process.env.REDASH_QUERY_ID || '1676';

  const redashUrl = `${REDASH_HOST.replace(/\/$/, '')}/api/queries/${encodeURIComponent(REDASH_QUERY_ID)}/results.json?api_key=${encodeURIComponent(REDASH_API_KEY)}`;

  let redashResp;
  try {
    redashResp = await fetch(redashUrl);
  } catch (err: any) {
    const msg = err && err.message ? err.message : String(err);
    throw new Error(`Failed to fetch Redash query results: ${msg}`);
  }

  if (!redashResp.ok) {
    const txt = await redashResp.text().catch(() => '[no body]');
    throw new Error(`Redash returned ${redashResp.status} ${redashResp.statusText}: ${txt}`);
  }

  const redashJson = await redashResp.json().catch((e: any) => {
    throw new Error(`Failed to parse Redash JSON response: ${e && e.message ? e.message : String(e)}`);
  });

  const rows: any[] = (redashJson && redashJson.query_result && redashJson.query_result.data && Array.isArray(redashJson.query_result.data.rows))
    ? redashJson.query_result.data.rows
    : [];

  // collect unique MCAT ids
  const ids = Array.from(new Set(rows.map(r => r.fk_glcat_mcat_id).filter(Boolean).map(String)));

  const idToNames = new Map<string, { mcat?: string; group?: string; pmcat?: string }>();
  if (ids.length > 0) {
    try {
      const res = await dailyCampaignPool.query(
        `SELECT glcat_mcat_id, glcat_mcat_name, glcat_grp_name, prime_pmcat_name FROM im_dwh.dim_glcat_mcat WHERE glcat_mcat_id = ANY($1)`,
        [ids]
      );
      res.rows.forEach((r: any) => {
        idToNames.set(String(r.glcat_mcat_id), {
          mcat: r.glcat_mcat_name ? String(r.glcat_mcat_name).trim() : '',
          group: r.glcat_grp_name ? String(r.glcat_grp_name).trim() : '',
          pmcat: r.prime_pmcat_name ? String(r.prime_pmcat_name).trim() : ''
        });
      });
    } catch (err: any) {
      console.warn('Failed to enrich MCAT ids:', err && err.message ? err.message : err);
    }
  }

  const validFlags = new Set(['high', 'low', 'medium']);
  const data: AdsRunningMcat[] = rows
    .filter(row => row.iil_google_ads_lable_name)
    .map(row => {
      const idKey = row.fk_glcat_mcat_id ? String(row.fk_glcat_mcat_id) : '';
      const names = idToNames.get(idKey) || { mcat: '', group: '', pmcat: '' };
      return {
        flag: String(row.iil_google_ads_lable_name).trim(),
        mcat_name: names.mcat || '',
        group_name: names.group || '',
        pmcat_name: names.pmcat || ''
      } as AdsRunningMcat;
    })
    .filter(r => r.flag && validFlags.has(r.flag.toLowerCase()));

  setServerCached(cacheKey, data);
  return data;
};

export const fetchAdsRunningMcats = async (): Promise<string[]> => {
  const data = await fetchAdsRunningMcatsEnriched();
  return data.map(d => d.mcat_name);
};
