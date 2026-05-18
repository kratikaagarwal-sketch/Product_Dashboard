const {Pool} = require('pg');
const pool = new Pool({
  host:'bi-dwh-redshift-production.c98rtyhhgrpm.ap-south-1.redshift.amazonaws.com', 
  user:'rd_mktplace_pwrbi', 
  password:'p83z28CjbMjA', 
  database:'biredshiftdb', 
  port:5439, 
  ssl:{rejectUnauthorized:false}
});

pool.query(`
  SELECT mcat_name 
  FROM im_datamart_category.mcat_ads_campaign 
  LIMIT 1
`)
.then(res => {
  console.log("mcat_name exists:", res.rows);
  process.exit(0);
})
.catch(err => {
  console.log("No mcat_name in table. Trying mapping table.");
  pool.query(`
    SELECT table_schema, table_name 
    FROM information_schema.columns 
    WHERE column_name = 'mcat_name' 
    LIMIT 10
  `).then(r => {
    console.log(r.rows);
    process.exit(0);
  });
});
