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

const query = `
SELECT 
    DATE_TRUNC('week', report_date) AS week_start_date,
    segments_product_type_l4,
    SUM(total_clicks) AS total_clicks,
    SUM(total_impressions) AS total_impressions,
    SUM(total_cost_inr) AS total_cost_inr,
    SUM(total_conversions) AS total_conversions
FROM im_datamart_bigquery.fact_bigquery_product_ads
WHERE report_date >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY 1, 2
ORDER BY 1 DESC;
`;

export async function GET() {
  try {
    const res = await pool.query(query);

    // Map rows to ensure proper types, calculated CTR, and avoid nulls
    const data = res.rows.map(row => {
      const clicks = parseInt(row.total_clicks, 10) || 0;
      const impressions = parseInt(row.total_impressions, 10) || 0;
      const cost = parseFloat(row.total_cost_inr) || 0;
      const conversions = parseFloat(row.total_conversions) || 0;
      
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

      // Extract the YYYY-MM-DD from week_start_date (which comes as a Date object or string from pg)
      let weekStr = '';
      if (row.week_start_date) {
        const d = new Date(row.week_start_date);
        weekStr = d.toISOString().split('T')[0];
      }

      return {
        week_start_date: weekStr,
        mcat: row.segments_product_type_l4 || 'Unknown',
        clicks,
        impressions,
        cost,
        conversions,
        ctr
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching Redshift data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
