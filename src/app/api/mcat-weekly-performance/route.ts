import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const pool = new Pool({
  host: 'bi-dwh-redshift-production.c98rtyhhgrpm.ap-south-1.redshift.amazonaws.com',
  user: 'rd_mktplace_pwrbi',
  password: 'p83z28CjbMjA',
  database: 'biredshiftdb',
  port: 5439, // Default Redshift port
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

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

const query1 = `
SELECT 
    DATE_TRUNC('week', report_date + INTERVAL '1 day')::date - INTERVAL '1 day' AS week_start_date,
    segments_product_type_l4 AS mcat_name,
    SUM(total_clicks) AS total_clicks,
    SUM(total_impressions) AS total_impressions,
    SUM(total_cost_inr) AS total_cost_inr,
    SUM(total_conversions) AS total_conversions
FROM im_datamart_bigquery.fact_bigquery_product_ads
WHERE report_date >= (SELECT MAX(report_date) FROM im_datamart_bigquery.fact_bigquery_product_ads) - INTERVAL '12 weeks'
GROUP BY 1, 2
ORDER BY 1 DESC, 2;
`;

const query2 = `
SELECT
    DATE_TRUNC('week', st_date) AS week_start_date,
    mcat_id AS eto_ofr_mcat_id,
    SUM(bl_approved) AS bl_approved,
    SUM(bl_sold) AS bl_sold_approved,
    SUM(trans) AS bl_txn_approved,
    SUM(blni) AS blni,
    SUM(total_cost_inr) AS total_cost_inr
FROM im_datamart_category.mcat_ads_campaign
WHERE
    time_period_flag = 'w'
    AND st_date >= CURRENT_DATE - INTERVAL '12 weeks'
    AND flag = 2
GROUP BY 1, 2
ORDER BY 1 DESC;
`;

const query3 = `
SELECT 
    a.st_date AS week_start_date,
    b.glcat_mcat_name AS mcat_name,
    SUM(a.bl_sold) AS bl_sold_approved,
    SUM(a.bl_approved) AS bl_approved,
    SUM(a.trans) AS bl_txn_approved,
    SUM(a.blni) AS blni
FROM im_datamart_category.mcat_ads_campaign a
LEFT JOIN im_dwh.dim_glcat_mcat b
    ON a.mcat_id = b.glcat_mcat_id
WHERE
    a.flag = 2
    AND a.time_period_flag = 'w'
    AND a.st_date >= (SELECT MAX(st_date) FROM im_datamart_category.mcat_ads_campaign WHERE flag = 2 AND time_period_flag = 'w') - INTERVAL '12 weeks'
GROUP BY 1, 2
ORDER BY 1 DESC, 2;
`;

export async function GET() {
  try {
    const [res1, res2, res3] = await Promise.all([
      pool.query(query1),
      pool.query(query2),
      pool.query(query3)
    ]);

    const mergedMap = new Map();

    // Map rows for the first query
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
        clicks,
        impressions,
        cost,
        conversions,
        ctr,
        bl_sold_approved: 0,
        bl_approved: 0,
        bl_txn_approved: 0,
        blni: 0
      });
    });

    // Map rows for the third query and merge with the first query data
    res3.rows.forEach(row => {
      const weekStr = extractDateString(row.week_start_date);

      const mcatName = row.mcat_name || 'Unknown';
      const key = `${weekStr}_${mcatName.toLowerCase()}`;

      const bl_sold_approved = parseInt(row.bl_sold_approved, 10) || 0;
      const bl_approved = parseInt(row.bl_approved, 10) || 0;
      const bl_txn_approved = parseInt(row.bl_txn_approved, 10) || 0;
      const blni = parseInt(row.blni, 10) || 0;

      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key);
        existing.bl_sold_approved = bl_sold_approved;
        existing.bl_approved = bl_approved;
        existing.bl_txn_approved = bl_txn_approved;
        existing.blni = blni;
      } else {
        mergedMap.set(key, {
          week_start_date: weekStr,
          mcat: mcatName,
          clicks: 0,
          impressions: 0,
          cost: 0,
          conversions: 0,
          ctr: 0,
          bl_sold_approved,
          bl_approved,
          bl_txn_approved,
          blni
        });
      }
    });

    const data = Array.from(mergedMap.values());

    // Map rows for the second query
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

    return NextResponse.json({ success: true, data, campaignData });
  } catch (error: any) {
    console.error('Error fetching Redshift data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
