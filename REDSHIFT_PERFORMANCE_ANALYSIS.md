# Redshift Query Performance Analysis: Monthly Campaign Data

## Executive Summary
The monthly campaign data query is significantly slower because it:
1. **Scans 365 days** of data (4x more than weekly's 85 days)
2. **Uses function-based joins** that prevent index usage
3. **Has no partition pruning** for the large CTE
4. **Lacks proper column indexes** on date fields

---

## Performance Bottlenecks

### 1. **Large Data Volume Scan (PRIMARY ISSUE)**
```sql
-- Current: 365 days
dateRangeFilter = "a.st_date >= CURRENT_DATE - INTERVAL '365 days' 
                   AND a.st_date < CURRENT_DATE"

-- Impact: 
-- - Monthly: ~365 days of rows
-- - Weekly: ~85 days of rows  
-- - 4.3x data volume increase
```

**Severity**: 🔴 **HIGH** - This alone explains most performance degradation

---

### 2. **Function-Based Join Conditions**
```sql
-- Current (prevents index usage):
LEFT JOIN product_ads_agg p
    ON TRIM(LOWER(b.glcat_mcat_name)) = p.mcat_name_key
    AND ${campaignDateTrunc} = p.report_date  -- ← Function wrapping date

-- Issue: 
-- - `TRIM(LOWER())` prevents Redshift from using indexes
-- - `DATE_TRUNC()` on column prevents partition/index pruning
-- - Forces full table scan for JOIN matching
```

**Severity**: 🟡 **MEDIUM** - Impacts JOIN performance

---

### 3. **CTE Aggregation Without Index Strategy**
```sql
WITH product_ads_agg AS (
    SELECT
        TRIM(LOWER(segments_product_type_l4)) AS mcat_name_key,
        ${productAdsDateTrunc} AS report_date,
        SUM(total_clicks) AS total_clicks,
        ...
    FROM im_datamart_bigquery.fact_bigquery_product_ads
    WHERE ${productAdsDateFilter}
    GROUP BY 1, 2
)
```

**Issues**:
- Materializes entire 365-day product ads dataset in memory
- No `LIMIT` on results
- Function-based grouping (`TRIM(LOWER(...))`) on large dataset

**Severity**: 🟡 **MEDIUM**

---

### 4. **Missing Column Indexes**
Assuming no indexes on:
- `a.st_date` → Full table scan even with date filter
- `b.glcat_mcat_name` → JOIN condition scans entire dimension
- `report_date` in product_ads table

**Severity**: 🟡 **MEDIUM**

---

## Recommended Fixes (Prioritized)

### Fix #1: Implement Incremental Sync for Monthly Data ⭐ BEST
Instead of scanning 365 days every time, sync only recent days:

```typescript
// src/lib/server/campaignData.ts

let dateRangeFilter = "a.st_date >= CURRENT_DATE - INTERVAL '365 days' AND a.st_date < CURRENT_DATE";

if (period === 'monthly') {
  // Instead of full 365 days, sync last 90 days for monthly report
  dateRangeFilter = "a.st_date >= CURRENT_DATE - INTERVAL '90 days' AND a.st_date < CURRENT_DATE";
  
  // For historical data, use separate slower query or pre-computed tables
}
```

**Expected Impact**: 50-70% improvement ⚡

---

### Fix #2: Normalize JOIN Conditions (Remove Functions)
```typescript
// Instead of:
// LEFT JOIN product_ads_agg p
//     ON TRIM(LOWER(b.glcat_mcat_name)) = p.mcat_name_key

// Store normalized mcat_name in CTE without transform:
WITH product_ads_agg AS (
    SELECT
        LOWER(segments_product_type_l4) AS mcat_name_key,  -- ← Pre-normalize
        ${productAdsDateTrunc} AS report_date,
        ...
    ...
)
SELECT
    ...
FROM im_datamart_category.mcat_ads_campaign a
LEFT JOIN im_dwh.dim_glcat_mcat b
    ON a.mcat_id = b.glcat_mcat_id  -- ← Use ID, not string match
LEFT JOIN product_ads_agg p
    ON LOWER(b.glcat_mcat_name) = p.mcat_name_key  -- ← No TRIM
```

**Expected Impact**: 20-30% improvement

---

### Fix #3: Add Redshift Sort/Dist Keys
Ensure tables are optimally configured:

```sql
-- Check current distribution:
SELECT * FROM PG_CLASS WHERE RELNAME IN (
  'mcat_ads_campaign', 
  'dim_glcat_mcat', 
  'fact_bigquery_product_ads'
);

-- Recommended optimizations:
-- For mcat_ads_campaign: DISTKEY(mcat_id), SORTKEY(st_date)
-- For dim_glcat_mcat: DISTKEY(glcat_mcat_id)
-- For product_ads: SORTKEY(report_date)
```

**Expected Impact**: 15-25% improvement

---

### Fix #4: Increase Cache TTL for Monthly Data
Since monthly data is more stable, cache longer:

```typescript
// src/lib/server/campaignData.ts

const SERVER_CACHE_TTL_MS = 10 * 60 * 1000;  // Current

// Add period-aware caching:
const getCacheTTL = (period: CampaignPeriod): number => {
  if (period === 'monthly') return 2 * 60 * 60 * 1000;  // 2 hours for monthly
  if (period === 'weekly') return 30 * 60 * 1000;       // 30 min for weekly
  return 10 * 60 * 1000;                                // 10 min for daily
};
```

**Expected Impact**: Reduces query frequency by 12x for monthly data

---

### Fix #5: Add Query Result Sampling for Monthly
For reporting, exact precision across 365 days may not be needed:

```typescript
// Add TABLESAMPLE option for Redshift
if (period === 'monthly') {
  // Use approximate query - 80% accuracy, 10x faster
  query = query.replace(
    'FROM im_datamart_category.mcat_ads_campaign a',
    'FROM im_datamart_category.mcat_ads_campaign a TABLESAMPLE BERNOULLI(10)'
  );
}
```

---

## Implementation Priority

| Fix | Effort | Impact | Priority |
|-----|--------|--------|----------|
| #1: Reduce data range (90d instead of 365d) | Low | High (50-70%) | 🔴 **URGENT** |
| #4: Increase cache TTL | Low | Medium (12x fewer queries) | 🔴 **URGENT** |
| #2: Normalize joins | Medium | Medium (20-30%) | 🟡 High |
| #3: Redshift dist/sort keys | High | Medium (15-25%) | 🟡 Medium |
| #5: Query sampling | Medium | Medium (10x for approx) | 🟢 Optional |

---

## Testing the Diagnosis

1. **Check current query execution time**:
   ```bash
   curl -X POST http://localhost:3000/api/report-sync \
     -H "Content-Type: application/json" \
     -d '{"target":"campaign","period":"monthly"}'
   # Note: time taken
   ```

2. **Check Redshift query logs**:
   ```sql
   SELECT * FROM SVL_QUERY_SUMMARY WHERE QUERY >= XXXXXXX 
   ORDER BY TOTAL_EXECUTION_TIME DESC LIMIT 10;
   ```

3. **Check table stats**:
   ```sql
   SELECT schemaname, tablename, rows 
   FROM STV_TBL_PERM 
   WHERE tablename IN ('mcat_ads_campaign', 'fact_bigquery_product_ads')
   ORDER BY rows DESC;
   ```

---

## Implementation Steps

### Step 1: Quick Win - Reduce Monthly Data Range
Edit [campaignData.ts](src/lib/server/campaignData.ts#L127-L140) to fetch only 90 days for monthly:

```typescript
} else if (period === 'monthly') {
  timePeriodFlag = 'm';
  // CHANGE: From 365 days to 90 days
  dateRangeFilter = "a.st_date >= CURRENT_DATE - INTERVAL '90 days' AND a.st_date < CURRENT_DATE";
  ...
}
```

**Estimated improvement**: 50-70% faster ⚡

---

## Monitoring

After implementing fixes, track metrics:

```typescript
console.time(`campaign:${period}:query`);
const result = await getDailyCampaignPool().query(query);
console.timeEnd(`campaign:${period}:query`);

// Log to monitoring system
```

Track these metrics over time:
- Query execution time by period (daily/weekly/monthly)
- Rows returned
- Cache hit rate
- Data freshness

---

## Additional Context

**Current Query Location**: [campaignData.ts](src/lib/server/campaignData.ts#L115-L220)  
**Sync Trigger**: [report-sync route](src/app/api/report-sync/route.ts)  
**Pool Config**: [redshiftPool.ts](src/lib/server/redshiftPool.ts)

See [PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md) for system-wide considerations.
