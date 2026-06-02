import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getRedshiftPool } from '@/lib/server/redshiftPool';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const getPool = () => getRedshiftPool({
  globalKey: 'mcatWeeklyPool',
});

const getDevPool = () => getRedshiftPool({
  globalKey: 'mcatWeeklyDevPool',
  userEnv: 'REDSHIFT_DEV_USER',
  passwordEnv: 'REDSHIFT_DEV_PASSWORD',
});

function debugLog(msg: string) {
  try {
    const logPath = path.join(process.cwd(), 'api-debug.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) {
    console.error('Failed to write debug log:', e);
  }
}


function extractDateString(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val.split('T')[0];
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

const query4 = `
SELECT 
    a.iil_google_ads_lable_name AS flag,
    gl.glcat_mcat_name,
    gl.glcat_grp_name,
    gl.prime_pmcat_name
FROM im_dwh.glcat_mcat_addn_attributes g
JOIN im_dwh.iil_google_ads_lable_master a
    ON a.iil_google_ads_lable_master_id = g.fk_iil_google_ads_lable_master_id
JOIN im_dwh.dim_glcat_mcat gl
    ON gl.glcat_mcat_id = g.fk_glcat_mcat_id
WHERE g.fk_glcat_mcat_id IN (
    SELECT iil_eligible_mcatid 
    FROM im_dwh.fact_iil_google_ads_eligibility 
    WHERE iil_eligible_status IN (2, 5)
)
AND lower(a.iil_google_ads_lable_name) IN ('high', 'low', 'medium');
`;

export async function GET(request: Request) {
  debugLog('GET request received');
  try {
    const pool = getPool();
    const devPool = getDevPool();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'weekly';

    let flag = 'w';
    let interval = '12 weeks';
    let query1Date = `DATE_TRUNC('week', report_date + INTERVAL '1 day')::date - INTERVAL '1 day' AS week_start_date`;
    let query1Interval = `12 weeks`;
    let query2Date = `st_date::date AS week_start_date`;
    let query3Date = `a.st_date::date AS week_start_date`;

    let query2Where = `
    time_period_flag = 'w'
    AND st_date >= DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day') - INTERVAL '85 day'
    AND st_date <  DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day') - INTERVAL '1 day'
    AND flag = 2
    `;

    let query3Where = `
    a.time_period_flag = 'w'
    AND a.st_date >= DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day') - INTERVAL '85 day'
    AND a.st_date <  DATE_TRUNC('week', CURRENT_DATE + INTERVAL '1 day') - INTERVAL '1 day'
    AND a.flag = 2
    `;

    if (period === 'daily') {
      flag = 'd';
      interval = '30 days';
      query1Date = `report_date::date AS week_start_date`;
      query1Interval = `30 days`;
      query2Date = `st_date::date AS week_start_date`;
      query3Date = `a.st_date::date AS week_start_date`;
      query2Where = `
      time_period_flag = 'd'
      AND st_date >= CURRENT_DATE - INTERVAL '30 days'
      AND flag = 2
      `;
      query3Where = `
      a.time_period_flag = 'd'
      AND a.st_date >= (SELECT MAX(st_date) FROM im_datamart_category.mcat_ads_campaign WHERE flag = 2 AND time_period_flag = 'd') - INTERVAL '30 days'
      AND a.flag = 2
      `;
    } else if (period === 'monthly') {
      flag = 'm';
      interval = '365 days';
      query1Date = `DATE_TRUNC('month', report_date)::date AS week_start_date`;
      query1Interval = `365 days`;
      query2Date = `DATE_TRUNC('month', st_date)::date AS week_start_date`;
      query3Date = `DATE_TRUNC('month', a.st_date)::date AS week_start_date`;
      query2Where = `
      time_period_flag = 'm'
      AND st_date >= CURRENT_DATE - INTERVAL '365 days'
      AND flag = 2
      `;
      query3Where = `
      a.time_period_flag = 'm'
      AND a.st_date >= (SELECT MAX(st_date) FROM im_datamart_category.mcat_ads_campaign WHERE flag = 2 AND time_period_flag = 'm') - INTERVAL '365 days'
      AND a.flag = 2
      `;
    }

    const query1 = `
SELECT 
    ${query1Date},
    segments_product_type_l4 AS mcat_name,
    SUM(total_clicks) AS total_clicks,
    SUM(total_impressions) AS total_impressions,
    SUM(total_cost_inr) AS total_cost_inr,
    SUM(total_conversions) AS total_conversions
FROM im_datamart_bigquery.fact_bigquery_product_ads
WHERE report_date >= (SELECT MAX(report_date) FROM im_datamart_bigquery.fact_bigquery_product_ads) - INTERVAL '${query1Interval}'
GROUP BY 1, 2
ORDER BY 1 DESC, 2;
    `;

    const query2 = `
SELECT
    ${query2Date},
    mcat_id AS eto_ofr_mcat_id,
    SUM(bl_approved) AS bl_approved,
    SUM(bl_sold) AS bl_sold_approved,
    SUM(trans) AS bl_txn_approved,
    SUM(blni) AS blni,
    SUM(total_cost_inr) AS total_cost_inr
FROM im_datamart_category.mcat_ads_campaign
WHERE
    ${query2Where}
GROUP BY 1, 2
ORDER BY 1 DESC;
    `;

    const query3 = `
SELECT 
    ${query3Date},
    b.glcat_mcat_name AS mcat_name,
    b.glcat_grp_name AS group_name,
    b.prime_pmcat_name AS pmcat_name,
    SUM(a.bl_sold) AS bl_sold_approved,
    SUM(a.bl_approved) AS bl_approved,
    SUM(a.trans) AS bl_txn_approved,
    SUM(a.blni) AS blni,
    SUM(a.total_cost_inr) AS total_cost_inr
FROM im_datamart_category.mcat_ads_campaign a
LEFT JOIN im_dwh.dim_glcat_mcat b
    ON a.mcat_id = b.glcat_mcat_id
WHERE
    ${query3Where}
GROUP BY 1, 2, 3, 4
ORDER BY 1 DESC, 2;
    `;

    debugLog('Executing Redshift queries...');
    const t0 = Date.now();
    const [res1, res2, res3, res4] = await Promise.all([
      pool.query(query1),
      pool.query(query2),
      pool.query(query3),
      devPool.query(query4)
    ]);
    debugLog(`Queries done in ${Date.now() - t0} ms. Row counts: res1=${res1?.rows?.length}, res2=${res2?.rows?.length}, res3=${res3?.rows?.length}, res4=${res4?.rows?.length}`);

    const mergedMap = new Map();

    debugLog('Mapping res1...');
    res1.rows.forEach(row => {
      const clicks = parseInt(row.total_clicks, 10) || 0;
      const impressions = parseInt(row.total_impressions, 10) || 0;
      const cost = parseFloat(row.total_cost_inr) || 0;
      const conversions = parseFloat(row.total_conversions) || 0;
      
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

      const weekStr = extractDateString(row.week_start_date);

      const mcatName = row.mcat_name || 'Unknown';
      const key = `${weekStr}_${mcatName.toLowerCase()}`;

      mergedMap.set(key, {
        week_start_date: weekStr,
        mcat: mcatName,
        group: 'Unknown Group',
        pmcat: mcatName,
        clicks,
        impressions,
        cost, // fallback to raw ads cost
        conversions,
        ctr,
        bl_sold_approved: 0,
        bl_approved: 0,
        bl_txn_approved: 0,
        blni: 0
      });
    });
    debugLog(`res1 mapping complete. mergedMap size: ${mergedMap.size}`);

    debugLog('Mapping res3...');
    res3.rows.forEach(row => {
      const weekStr = extractDateString(row.week_start_date);

      const mcatName = row.mcat_name || 'Unknown';
      const key = `${weekStr}_${mcatName.toLowerCase()}`;

      const bl_sold_approved = parseInt(row.bl_sold_approved, 10) || 0;
      const bl_approved = parseInt(row.bl_approved, 10) || 0;
      const bl_txn_approved = parseInt(row.bl_txn_approved, 10) || 0;
      const blni = parseInt(row.blni, 10) || 0;
      const cost = parseFloat(row.total_cost_inr) || 0;

      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key);
        existing.bl_sold_approved = bl_sold_approved;
        existing.bl_approved = bl_approved;
        existing.bl_txn_approved = bl_txn_approved;
        existing.blni = blni;
        existing.cost = cost; // Overwrite with campaign table cost
        existing.group = row.group_name || 'Unknown Group';
        existing.pmcat = row.pmcat_name || mcatName;
      } else {
        mergedMap.set(key, {
          week_start_date: weekStr,
          mcat: mcatName,
          group: row.group_name || 'Unknown Group',
          pmcat: row.pmcat_name || mcatName,
          clicks: 0,
          impressions: 0,
          cost, // Set campaign cost
          conversions: 0,
          ctr: 0,
          bl_sold_approved,
          bl_approved,
          bl_txn_approved,
          blni
        });
      }
    });
    debugLog(`res3 mapping complete. mergedMap size: ${mergedMap.size}`);

    const data = Array.from(mergedMap.values());

    debugLog('Mapping res2...');
    const campaignData = res2.rows.map(row => {
      const weekStr = extractDateString(row.week_start_date);

      return {
        week_start_date: weekStr,
        mcat_id: row.eto_ofr_mcat_id || 'Unknown',
        bl_approved: parseInt(row.bl_approved, 10) || 0,
        bl_sold_approved: parseInt(row.bl_sold_approved, 10) || 0,
        bl_txn_approved: parseInt(row.bl_txn_approved, 10) || 0,
        blni: parseInt(row.blni, 10) || 0,
        total_cost_inr: parseFloat(row.total_cost_inr) || 0
      };
    });
    debugLog(`res2 mapping complete. campaignData count: ${campaignData.length}`);

    debugLog('Mapping res4...');
    const adsRunningMcats = res4.rows.map(row => ({
      mcat: row.glcat_mcat_name || 'Unknown',
      group: row.glcat_grp_name || 'Unknown Group',
      pmcat: (row.prime_pmcat_name && String(row.prime_pmcat_name).trim())
        ? String(row.prime_pmcat_name).trim()
        : (row.glcat_mcat_name && String(row.glcat_mcat_name).trim())
          ? String(row.glcat_mcat_name).trim()
          : 'Unknown PMCAT'
    }));
    debugLog(`res4 mapping complete. adsRunningMcats count: ${adsRunningMcats.length}`);

    debugLog('Returning JSON response...');
    const response = NextResponse.json({ success: true, data, campaignData, adsRunningMcats });
    debugLog('JSON response created successfully');
    return response;
  } catch (error: any) {
    debugLog(`ERROR CAUGHT: ${error.message}\nStack: ${error.stack}`);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
