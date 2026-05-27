import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

declare global {
  var adsRunningPool: Pool | undefined;
}

const poolConfig = {
  host: 'bi-dwh-redshift-development.c98rtyhhgrpm.ap-south-1.redshift.amazonaws.com',
  user: 'rd_kishalay_113578',
  password: 'Vt4r4024J4ii',
  database: 'biredshiftdevelopment',
  port: 5439,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool(poolConfig);
} else {
  if (!globalThis.adsRunningPool) {
    globalThis.adsRunningPool = new Pool(poolConfig);
  }
  pool = globalThis.adsRunningPool;
}

export async function GET() {
  try {
    const query = `
      SELECT 
          a.iil_google_ads_lable_name AS flag,
          gl.glcat_mcat_name
      FROM im_dwh_rpt.glcat_mcat_addn_attributes g
      JOIN im_dwh.iil_google_ads_lable_master a
          ON a.iil_google_ads_lable_master_id = g.fk_iil_google_ads_lable_master_id
      JOIN im_dwh_rpt.dim_glcat_mcat gl
          ON gl.glcat_mcat_id = g.fk_glcat_mcat_id
      WHERE g.fk_glcat_mcat_id IN (
          SELECT iil_eligible_mcatid 
          FROM im_dwh.fact_iil_google_ads_eligibility 
          WHERE iil_eligible_status IN (2, 5)
      )
    `;

    const result = await pool.query(query);

    // Filter to only 'High', 'Low', 'Medium' and return array of mcat_names
    const validFlags = new Set(['high', 'low', 'medium']);
    const adsRunningMcats = result.rows
      .filter(row => row.flag && validFlags.has(row.flag.toLowerCase().trim()))
      .map(row => row.glcat_mcat_name.trim());

    return NextResponse.json({ success: true, data: adsRunningMcats });

  } catch (error: any) {
    console.error('Error fetching Ads Running MCATs:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
