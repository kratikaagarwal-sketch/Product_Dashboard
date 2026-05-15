import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: 'bi-dwh-redshift-production.c98rtyhhgrpm.ap-south-1.redshift.amazonaws.com',
  user: 'rd_mktplace_pwrbi',
  password: 'p83z28CjbMjA',
  database: 'biredshiftdb',
  port: 5439, // Default Redshift port
  ssl: { rejectUnauthorized: false }
});

const query1 = `
SELECT
    glcat_grp_id,
    glcat_grp_name,
    COUNT(DISTINCT CASE 
        WHEN approv_date IS NOT NULL 
        AND flag = 'BL' 
        AND eto_ofr_approv = 'A' 
        THEN appr_eto_ofr_display_id 
    END) AS bl_approved

FROM (
    SELECT DISTINCT
        'BL' AS flag,
        bl.appr_eto_ofr_display_id,
        bl.mcat_id,
        bl.eto_ofr_approv,
        bl.eto_ofr_approv_date_orig::DATE AS approv_date

    FROM (
        SELECT
            eto_ofr_mcat_id AS mcat_id,
            eto_ofr_display_id AS appr_eto_ofr_display_id,
            eto_ofr_approv,
            eto_ofr_approv_date_orig

        FROM im_dwh_rpt.fact_eto_ofr_live
        WHERE DATE(eto_ofr_postdate_orig) = CURRENT_DATE - 1

        UNION ALL

        SELECT
            eto_ofr_mcat_id,
            eto_ofr_display_id,
            eto_ofr_approv,
            eto_ofr_approv_date_orig

        FROM im_dwh_rpt.fact_eto_ofr_expired
        WHERE DATE(eto_ofr_postdate_orig) = CURRENT_DATE - 1

        UNION ALL

        SELECT
            fk_glcat_mcat_id,
            eto_ofr_display_id,
            eto_ofr_approv,
            eto_ofr_approv_date_orig

        FROM im_dwh_rpt.fact_eto_ofr_temp_del
        WHERE DATE(eto_ofr_postdate_orig) = CURRENT_DATE - 1

    ) bl

) final

LEFT JOIN im_dwh_rpt.dim_glcat_mcat 
    ON final.mcat_id = glcat_mcat_id

WHERE glcat_grp_id IN (7, 27, 40, 34, 93, 114, 30, 25, 117, 74, 14, 102, 29, 13, 121, 122)

GROUP BY glcat_grp_id, glcat_grp_name
ORDER BY glcat_grp_name;
`;

const query2 = `
SELECT
    gl.glcat_grp_name,

    COUNT(DISTINCT b.sold_fk_eto_ofr_display_id) AS BL_Sold,
    COUNT(DISTINCT b.eto_lead_pur_id) AS Trans,
    COUNT(DISTINCT d.eto_ofr_reject_id) AS BLNI

FROM (
    SELECT
        eto_ofr_display_id,
        eto_ofr_mcat_id AS mcat_id,
        eto_ofr_approv_date_orig,
        ETO_OFR_PAGE_REFERRER

    FROM im_dwh_rpt.fact_eto_ofr_live
    WHERE eto_ofr_approv_date_orig >= CURRENT_DATE - INTERVAL '1 day'
      AND eto_ofr_approv_date_orig < CURRENT_DATE

    UNION ALL

    SELECT
        eto_ofr_display_id,
        eto_ofr_mcat_id,
        eto_ofr_approv_date_orig,
        ETO_OFR_PAGE_REFERRER

    FROM im_dwh_rpt.fact_eto_ofr_expired
    WHERE eto_ofr_approv_date_orig >= CURRENT_DATE - INTERVAL '1 day'
      AND eto_ofr_approv_date_orig < CURRENT_DATE

    UNION ALL

    SELECT
        eto_ofr_display_id,
        fk_glcat_mcat_id,
        eto_ofr_approv_date_orig,
        ETO_OFR_PAGE_REFERRER

    FROM im_dwh_rpt.fact_eto_ofr_temp_del
    WHERE eto_ofr_approv_date_orig >= CURRENT_DATE - INTERVAL '1 day'
      AND eto_ofr_approv_date_orig < CURRENT_DATE
) a

-- ✅ JOINS FIRST
LEFT JOIN (
    SELECT
        fk_eto_ofr_display_id AS sold_fk_eto_ofr_display_id,
        eto_lead_pur_id
    FROM im_dwh_rpt.fact_eto_lead_pur
    WHERE eto_pur_date >= CURRENT_DATE - INTERVAL '1 day'
      AND eto_pur_date < CURRENT_DATE
      AND fk_eto_ofr_display_id > 0
      AND ETO_LEAD_PUR_TYPE = 'B'
) b 
ON a.eto_ofr_display_id = b.sold_fk_eto_ofr_display_id

LEFT JOIN (
    SELECT
        fk_eto_ofr_id,
        eto_ofr_reject_id
    FROM im_dwh_rpt.fact_eto_ofr_rejected
    WHERE eto_ofr_reject_dt >= CURRENT_DATE - INTERVAL '1 day'
      AND eto_ofr_reject_dt < CURRENT_DATE
      AND eto_ofr_reject_reason IN (1, 3, 5, 7, 10, 11)
) d 
ON a.eto_ofr_display_id = d.fk_eto_ofr_id

LEFT JOIN im_dwh_rpt.dim_glcat_mcat gl 
ON a.mcat_id = gl.glcat_mcat_id

-- ✅ THEN FILTER
WHERE UPPER(a.ETO_OFR_PAGE_REFERRER) LIKE '%PRD_ADS%'
  AND a.ETO_OFR_PAGE_REFERRER NOT ILIKE '%utm_content=pharma%'
  AND gl.glcat_grp_id IN (7, 27, 40, 34, 93, 114, 30, 25, 117, 74, 14, 102, 29, 13, 121, 122)

GROUP BY gl.glcat_grp_name
ORDER BY gl.glcat_grp_name;
`;

export async function GET() {
  try {
    const [res1, res2] = await Promise.all([
      pool.query(query1),
      pool.query(query2)
    ]);

    const map = new Map();
    
    // Process query 1
    for (const row of res1.rows) {
      map.set(row.glcat_grp_name, {
        glcat_grp_id: row.glcat_grp_id,
        glcat_grp_name: row.glcat_grp_name,
        bl_approved: parseInt(row.bl_approved, 10) || 0,
        bl_sold: 0,
        trans: 0,
        blni: 0
      });
    }

    // Process query 2
    for (const row of res2.rows) {
      if (map.has(row.glcat_grp_name)) {
        const entry = map.get(row.glcat_grp_name);
        entry.bl_sold = parseInt(row.bl_sold, 10) || 0;
        entry.trans = parseInt(row.trans, 10) || 0;
        entry.blni = parseInt(row.blni, 10) || 0;
      } else {
        map.set(row.glcat_grp_name, {
          glcat_grp_id: null,
          glcat_grp_name: row.glcat_grp_name,
          bl_approved: 0,
          bl_sold: parseInt(row.bl_sold, 10) || 0,
          trans: parseInt(row.trans, 10) || 0,
          blni: parseInt(row.blni, 10) || 0
        });
      }
    }

    const data = Array.from(map.values());

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Error fetching Redshift data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
