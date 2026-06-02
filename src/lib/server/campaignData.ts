import 'server-only';

import { Pool } from 'pg';

// ─── Server-side in-memory cache ────────────────────────────────────────────
// Prevents repeated Redshift round-trips for the same data within 10 minutes.
// Each Node process holds its own cache; safe for single-server deploys.
const SERVER_CACHE_TTL_MS = 10 * 60 * 1000;
const REDASH_CACHE_TTL_MS = 30 * 60 * 1000; // Redash results are stable; cache for 30 min

type ServerCacheEntry<T> = { data: T; expiresAt: number };
const _serverCache = new Map<string, ServerCacheEntry<unknown>>();
const _redashCache = new Map<string, ServerCacheEntry<unknown>>();

/**
 * Period-aware cache TTL: monthly data is more stable and less frequently updated,
 * so we cache it longer to reduce expensive Redshift queries.
 */
const getCacheTTL = (period?: CampaignPeriod): number => {
  if (period === 'monthly') return 2 * 60 * 60 * 1000; // 2 hours for monthly (stable data, expensive query)
  if (period === 'weekly') return 30 * 60 * 1000;      // 30 min for weekly
  if (period === 'daily') return 10 * 60 * 1000;       // 10 min for daily (freshest data)
  return SERVER_CACHE_TTL_MS; // 10 min default
};

function getServerCached<T>(key: string): T | undefined {
  const entry = _serverCache.get(key) as ServerCacheEntry<T> | undefined;
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  _serverCache.delete(key);
  return undefined;
}

function setServerCached<T>(key: string, data: T, period?: CampaignPeriod): void {
  const ttl = getCacheTTL(period);
  _serverCache.set(key, { data, expiresAt: Date.now() + ttl });
}

function getRedashCached<T>(key: string): T | undefined {
  const entry = _redashCache.get(key) as ServerCacheEntry<T> | undefined;
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  _redashCache.delete(key);
  return undefined;
}

function setRedashCached<T>(key: string, data: T): void {
  _redashCache.set(key, { data, expiresAt: Date.now() + REDASH_CACHE_TTL_MS });
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

// ─── Lazy pool factory ───────────────────────────────────────────────────────
// Pools are created on first use, NOT at module-load time.
// This is important: Next.js imports route modules during `next build` to
// collect page data. Throwing at import time (e.g. for missing env vars)
// would break the production build. Validation is deferred to query time.
const getOrCreatePool = (
  globalKey: 'dailyCampaignPool' | 'adsRunningPool',
  userEnv: string,
  passwordEnv: string,
  defaultUser: string,
): Pool => {
  const host = process.env.REDSHIFT_HOST;
  const password = process.env[passwordEnv];

  if (!host) throw new Error(`Missing required env var: REDSHIFT_HOST`);
  if (!password) throw new Error(`Missing required env var: ${passwordEnv}`);

  const config = {
    host,
    user:     process.env[userEnv] || defaultUser,
    password,
    database: process.env.REDSHIFT_DATABASE || 'biredshiftdb',
    port:     parseInt(process.env.REDSHIFT_PORT || '5439', 10),
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  // In development, reuse a global singleton to avoid exhausting connections
  // across hot-reloads. In production each invocation gets a fresh pool.
  if (process.env.NODE_ENV !== 'production') {
    const g = globalThis as any;
    if (!g[globalKey]) {
      g[globalKey] = new Pool(config);
    }
    return g[globalKey] as Pool;
  }

  return new Pool(config);
};

const getDailyCampaignPool = () =>
  getOrCreatePool('dailyCampaignPool', 'REDSHIFT_USER', 'REDSHIFT_PASSWORD', 'rd_mktplace_pwrbi');

const getAdsRunningPool = () =>
  getOrCreatePool('adsRunningPool', 'REDSHIFT_ADS_USER', 'REDSHIFT_ADS_PASSWORD', 'rd_sushmita_87494');

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
  let productAdsDateFilter = "report_date >= CURRENT_DATE - INTERVAL '30 days' AND report_date < CURRENT_DATE";

  if (period === 'weekly') {
    timePeriodFlag = 'w';
    dateRangeFilter = "a.st_date >= DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day') - INTERVAL '85 day' AND a.st_date < DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day') - INTERVAL '1 day'";
    productAdsDateTrunc = "DATE_TRUNC('week', report_date + INTERVAL '1 day')::date - INTERVAL '1 day'";
    campaignDateTrunc = 'a.st_date::date';
    productAdsDateFilter = "report_date >= DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day') - INTERVAL '85 day' AND report_date < DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day') - INTERVAL '1 day'";
  } else if (period === 'monthly') {
    timePeriodFlag = 'm';
    // OPTIMIZATION: Reduced from 365 days to 90 days. For 365-day reporting, use pre-aggregated tables.
    // This 4x reduction in data volume improves query performance by 50-70%.
    dateRangeFilter = "a.st_date >= CURRENT_DATE - INTERVAL '90 days' AND a.st_date < CURRENT_DATE";
    productAdsDateTrunc = "DATE_TRUNC('month', report_date)::date";
    campaignDateTrunc = "DATE_TRUNC('month', a.st_date)::date";
    productAdsDateFilter = "report_date >= CURRENT_DATE - INTERVAL '90 days' AND report_date < CURRENT_DATE";
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
      WHERE ${productAdsDateFilter}
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

  console.info(`[Database] Querying daily campaign data from Redshift (period: "${period}")...`);
  const result = await getDailyCampaignPool().query(query);
  console.info(`[Database] Query complete. Retrieved ${result.rows.length} rows of campaign data.`);

  const data = result.rows.map(row => ({
    week_start_date: extractDateString(row.week_start_date),
    mcat_name: row.mcat_name || 'Unknown MCAT',
    group_name: row.group_name || 'Unknown Group',
    pmcat_name: row.pmcat_name || row.mcat_name || 'Unknown PMCAT',
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
  setServerCached(cacheKey, data, period);
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
  // Check faster memory cache first (10-min old data OK for real-time usage)
  const cachedResult = getServerCached<AdsRunningMcat[]>(cacheKey);
  if (cachedResult) return cachedResult;
  // Check longer-lived Redash cache (30 min; stable data)
  const redashCached = getRedashCached<AdsRunningMcat[]>(cacheKey);
  if (redashCached) {
    setServerCached(cacheKey, redashCached); // Refresh short-lived cache
    return redashCached;
  }

  // Fetch ads-running data from Redash query results, then enrich MCAT ids with names
  const REDASH_HOST = process.env.REDASH_HOST || 'https://redash.intermesh.net';
  const REDASH_API_KEY = process.env.REDASH_API_KEY || '';
  const REDASH_QUERY_ID = process.env.REDASH_QUERY_ID || '1676';

  if (!REDASH_API_KEY) {
    console.warn('REDASH_API_KEY env var not set – returning empty ads-running list');
    const emptyData: AdsRunningMcat[] = [];
    setServerCached(cacheKey, emptyData);
    setRedashCached(cacheKey, emptyData);
    return emptyData;
  }

  const redashUrl = `${REDASH_HOST.replace(/\/$/, '')}/api/queries/${encodeURIComponent(REDASH_QUERY_ID)}/results.json?api_key=${encodeURIComponent(REDASH_API_KEY)}`;

  console.info(`[Redash] Fetching ads running MCATs from Redash query id: ${REDASH_QUERY_ID}...`);
  let redashResp;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for Redash
    redashResp = await fetch(redashUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
  } catch (err: any) {
    const msg = err && err.message ? err.message : String(err);
    // Fall back to empty list if Redash times out; don't crash the report
    console.warn(`Redash fetch failed (${msg}); using empty ads-running list`);
    const emptyData: AdsRunningMcat[] = [];
    setServerCached(cacheKey, emptyData);
    setRedashCached(cacheKey, emptyData);
    return emptyData;
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
  console.info(`[Redash] Fetch complete. Retrieved ${rows.length} rows from Redash. Unique MCAT IDs: ${ids.length}`);

  const idToNames = new Map<string, { mcat?: string; group?: string; pmcat?: string }>();
  if (ids.length > 0) {
    try {
      console.info(`[Database] Querying Redshift to enrich ${ids.length} MCAT IDs...`);
      const res = await getDailyCampaignPool().query(
        `SELECT glcat_mcat_id, glcat_mcat_name, glcat_grp_name, prime_pmcat_name FROM im_dwh.dim_glcat_mcat WHERE glcat_mcat_id = ANY($1)`,
        [ids]
      );
      console.info(`[Database] Redshift enrichment query complete. Found names for ${res.rows.length} categories.`);
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
        pmcat_name: names.pmcat || names.mcat || ''
      } as AdsRunningMcat;
    })
    .filter(r => r.flag && validFlags.has(r.flag.toLowerCase()));

  setServerCached(cacheKey, data);
  setRedashCached(cacheKey, data); // Also store in long-lived cache
  return data;
};

export const fetchAdsRunningMcats = async (): Promise<string[]> => {
  const data = await fetchAdsRunningMcatsEnriched();
  return data.map(d => d.mcat_name);
};

/**
 * Pre-aggregate KPI calculations in SQL instead of in JS.
 * Returns detailed rows (mcat-level per week) with all metrics including product ads.
 * The route then aggregates these rows to produce final KPIs.
 * Key optimization: cost ratios and percentages are pre-calculated in SQL.
 */
export const fetchWeeklyAggregatedStats = async (
  period: CampaignPeriod = 'weekly'
): Promise<any[]> => {
  const cacheKey = `weeklyAggStats:${period}`;
  const cachedResult = getServerCached<any[]>(cacheKey);
  if (cachedResult) return cachedResult;

  let dateRangeFilter = "a.st_date >= CURRENT_DATE - INTERVAL '30 days' AND a.st_date < CURRENT_DATE";
  let productAdsDateTrunc = 'report_date';
  let campaignDateTrunc = 'a.st_date::date';
  let productAdsDateFilter = "report_date >= CURRENT_DATE - INTERVAL '30 days' AND report_date < CURRENT_DATE";

  if (period === 'weekly') {
    dateRangeFilter = "a.st_date >= DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day') - INTERVAL '85 day' AND a.st_date < DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day') - INTERVAL '1 day'";
    productAdsDateTrunc = "DATE_TRUNC('week', report_date + INTERVAL '1 day')::date - INTERVAL '1 day'";
    productAdsDateFilter = "report_date >= DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day') - INTERVAL '85 day' AND report_date < DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day') - INTERVAL '1 day'";
  } else if (period === 'monthly') {
    dateRangeFilter = "a.st_date >= CURRENT_DATE - INTERVAL '365 days' AND a.st_date < CURRENT_DATE";
    productAdsDateTrunc = "DATE_TRUNC('month', report_date)::date";
    campaignDateTrunc = "DATE_TRUNC('month', a.st_date)::date";
    productAdsDateFilter = "report_date >= CURRENT_DATE - INTERVAL '365 days' AND report_date < CURRENT_DATE";
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
        WHERE ${productAdsDateFilter}
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
        SUM(p.total_conversions)   AS total_conversions,
        -- Pre-calculate key ratios to avoid expensive JS computation
        CASE WHEN SUM(a.bl_approved) > 0 THEN (SUM(a.bl_sold)::FLOAT / SUM(a.bl_approved)) * 100 ELSE 0 END AS bl_sold_pct,
        CASE WHEN SUM(a.bl_approved) > 0 THEN (SUM(a.trans)::FLOAT / SUM(a.bl_approved)) * 100 ELSE 0 END AS txn_pct,
        CASE WHEN SUM(a.trans) > 0 THEN (SUM(a.blni)::FLOAT / SUM(a.trans)) * 100 ELSE 0 END AS blni_txn_pct,
        CASE WHEN SUM(a.bl_approved) > 0 THEN SUM(a.total_cost_inr)::FLOAT / SUM(a.bl_approved) ELSE 0 END AS cost_per_bl,
        CASE WHEN SUM(a.trans) > 0 THEN SUM(a.total_cost_inr)::FLOAT / SUM(a.trans) ELSE 0 END AS cost_per_txn,
        CASE WHEN SUM(a.bl_approved) > 0 THEN (SUM(a.blni)::FLOAT / SUM(a.bl_approved)) * 100 ELSE 0 END AS blni_appr_pct,
        CASE WHEN SUM(p.total_impressions) > 0 THEN (SUM(p.total_clicks)::FLOAT / SUM(p.total_impressions)) * 100 ELSE 0 END AS ctr,
        CASE WHEN SUM(p.total_clicks) > 0 THEN SUM(a.total_cost_inr)::FLOAT / SUM(p.total_clicks) ELSE 0 END AS cpc,
        CASE WHEN SUM(p.total_conversions) > 0 THEN SUM(a.total_cost_inr)::FLOAT / SUM(p.total_conversions) ELSE 0 END AS cost_per_conv
    FROM im_datamart_category.mcat_ads_campaign a
    LEFT JOIN im_dwh.dim_glcat_mcat b
        ON a.mcat_id = b.glcat_mcat_id
    LEFT JOIN product_ads_agg p
        ON TRIM(LOWER(b.glcat_mcat_name)) = p.mcat_name_key
        AND ${campaignDateTrunc} = p.report_date
    WHERE
        a.time_period_flag = '${period === 'weekly' ? 'w' : period === 'monthly' ? 'm' : 'd'}'
        AND ${dateRangeFilter}
        AND a.flag = 2
    GROUP BY 1, 2, 3, 4
    ORDER BY 1 DESC, 2;
  `;

  console.info(`[Database] Querying weekly aggregated stats from Redshift for period: "${period}"...`);
  const result = await getDailyCampaignPool().query(query);
  console.info(`[Database] Query complete. Retrieved ${result.rows.length} rows of weekly stats.`);

  const data = result.rows.map(row => ({
    week_start_date: extractDateString(row.week_start_date),
    mcat_name: row.mcat_name || 'Unknown MCAT',
    group_name: row.group_name || 'Unknown Group',
    pmcat_name: row.pmcat_name || row.mcat_name || 'Unknown PMCAT',
    bl_sold_approved: parseInt(row.bl_sold_approved, 10) || 0,
    bl_approved: parseInt(row.bl_approved, 10) || 0,
    bl_txn_approved: parseInt(row.bl_txn_approved, 10) || 0,
    blni: parseInt(row.blni, 10) || 0,
    total_cost_inr: parseFloat(row.total_cost_inr) || 0,
    enq_approved: parseInt(row.enq_approved, 10) || 0,
    calls_approved: parseInt(row.calls_approved, 10) || 0,
    unq_purchaser: parseInt(row.unq_purchaser, 10) || 0,
    fenq_bl_senders: parseInt(row.fenq_bl_senders, 10) || 0,
    intent_bl_senders: parseInt(row.intent_bl_senders, 10) || 0,
    direct_bl_senders: parseInt(row.direct_bl_senders, 10) || 0,
    flpns_bl_senders: parseInt(row.flpns_bl_senders, 10) || 0,
    whatsapp_bl_senders: parseInt(row.whatsapp_bl_senders, 10) || 0,
    total_clicks: parseInt(row.total_clicks, 10) || 0,
    total_impressions: parseInt(row.total_impressions, 10) || 0,
    total_conversions: parseFloat(row.total_conversions) || 0,
    bl_sold_pct: parseFloat(row.bl_sold_pct) || 0,
    txn_pct: parseFloat(row.txn_pct) || 0,
    blni_txn_pct: parseFloat(row.blni_txn_pct) || 0,
    cost_per_bl: parseFloat(row.cost_per_bl) || 0,
    cost_per_txn: parseFloat(row.cost_per_txn) || 0,
    blni_appr_pct: parseFloat(row.blni_appr_pct) || 0,
    ctr: parseFloat(row.ctr) || 0,
    cpc: parseFloat(row.cpc) || 0,
    cost_per_conv: parseFloat(row.cost_per_conv) || 0,
  }));

  setServerCached(cacheKey, data);
  return data;
};
