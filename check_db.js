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
  SELECT table_schema, table_name 
  FROM information_schema.columns 
  WHERE column_name = 'mcat_name' 
  LIMIT 10
`)
.then(res => {
  console.log("Tables with mcat_name:");
  console.log(res.rows);
  return pool.query(`
    SELECT table_schema, table_name 
    FROM information_schema.columns 
    WHERE column_name = 'mcat_id' 
    LIMIT 10
  `);
})
.then(res => {
  console.log("Tables with mcat_id:");
  console.log(res.rows);
  process.exit(0);
})
.catch(err => {
  console.error(err);
  process.exit(1);
});
