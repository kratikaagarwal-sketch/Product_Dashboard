# Weekly & Campaign Report Performance Optimization

## Status Summary
Target: **Load reports in < 10 seconds**  
Implemented optimizations: **3/5 (60%)**

---

## ✅ Completed Optimizations

### 1. **Server Cache TTL Extended** (5 min → 10 min)
- **File**: `src/lib/server/campaignData.ts`
- **Impact**: Reduces repeated Redshift queries within the 10-min window
- **Expected savings**: 2–3 seconds (if data is fresh in cache)

### 2. **Product Ads Date Filter** 
- **File**: `src/lib/server/campaignData.ts`
- **What**: Added `WHERE ${productAdsDateFilter}` to the `product_ads_agg` CTE
- **Impact**: Prevents full-table scans of `fact_bigquery_product_ads`; queries only relevant date ranges
- **Expected savings**: 1–2 seconds (Redshift query time)

### 3. **Route-Level Response Cache** (5 min TTL)
- **File**: `src/app/api/weekly-report/route.ts`
- **What**: Added in-memory response cache keyed by query parameters
- **Impact**: Identical repeated requests (e.g., refreshing the page) return instantly
- **Expected savings**: 3–5 seconds (for repeat requests within 5 min)

### 4. **Redash Fetch Cache & Timeout** (30 min TTL)
- **File**: `src/lib/server/campaignData.ts`
- **What**: 
  - Separate 30-minute cache for Redash results (ads-running data is stable)
  - 15-second timeout with graceful fallback (empty list if timeout)
  - Dual-tier cache: 10-min short-lived + 30-min long-lived
- **Impact**: Redash only fetched once per 30 min; timeouts don't crash reports
- **Expected savings**: 2–4 seconds (Redash fetch eliminated most of the time)

---

## Expected Total Improvement
- **First load (cold cache)**: 2–3 sec saved = ~6–8 sec if original was ~10–12 sec
- **Subsequent loads (warm cache)**: 5–8 sec saved = **1–2 sec load time** ✓

---

## ⏳ Remaining Optimizations (Priority Order)

### 3. **SQL-Level KPI Aggregation** (Medium effort, High impact)
- Move the `calculateKpisForWeek()` loops into the database
- Pre-aggregate metrics like `pmcat_div_25`, `mcat_div_10`, cost ratios
- Benefit: Reduces JS computation + smaller JSON payload
- Estimated savings: 0.5–1 sec

### 4. **Redshift Query Plans & Indexes** (High effort, Medium impact)
- Review execution plans for `mcat_ads_campaign` joins
- Add indexes on `glcat_mcat_id`, `time_period_flag`, date columns
- Benefit: Faster SQL execution for fresh queries
- Estimated savings: 1–2 sec (for cold cache scenarios)

### 5. **Client-Side Lazy Loading** (Medium effort, Low impact)
- Show summary cards first; load detailed breakdowns async
- Use skeleton screens for charts
- Benefit: Perceived faster load + non-blocking UX
- Estimated savings: 0 sec (only perceived; full data still needs to be fetched)

---

## Testing Tips

### Check Load Times
```bash
# Measure first load
time curl "http://localhost:3000/api/weekly-report?granularity=group"

# Measure cached load (within 5 min)
time curl "http://localhost:3000/api/weekly-report?granularity=group"
```

### Monitor Cache Hits
Add this to `src/lib/server/campaignData.ts` for logging:
```typescript
console.log(`[CACHE] adsRunning cache hit/miss - returning cached data`);
console.log(`[CACHE] campaignData cache hit/miss for period: ${period}`);
```

### Monitor Redash Timeout
Check server logs for:
```
Redash fetch failed (...); using empty ads-running list
```
If this appears frequently, increase the 15-second timeout.

---

## Configuration Env Vars (Review)
- `REDASH_HOST` - Redash API endpoint (default: `https://redash.intermesh.net`)
- `REDASH_API_KEY` - Redash query API key (in use)
- `REDASH_QUERY_ID` - Redash query ID (default: `1676`)

Increase timeout in code if Redash is consistently slow:
```typescript
const timeoutId = setTimeout(() => controller.abort(), 15000); // ← Change to 20000 if needed
```

---

## Next Steps
1. **Test current implementation** — measure actual load times
2. **If still > 10s**: Implement SQL aggregation (3)
3. **If still > 10s**: Profile Redshift queries and add indexes (4)
4. **For perceived performance**: Add client-side lazy loading (5)

---

*Last updated: 2026-05-29*
