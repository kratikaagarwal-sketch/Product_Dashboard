"use client";

import React, { useState, useEffect, useMemo } from 'react';
import ChartComponent from '../ChartComponent';

const C = { t: '#00cba4', b: '#4d9fff', g: '#3dd68c', r: '#ff6168', a: '#ffb547', p: '#a78bfa', d: '#4a6070' };

const METRICS = [
  { key: 'clicks', label: 'Clicks' },
  { key: 'impressions', label: 'Impressions' },
  { key: 'cost', label: 'Cost (INR)' },
  { key: 'conversions', label: 'Conversions' },
  { key: 'ctr', label: 'CTR %' },
  { key: 'bl_approved', label: 'BL Approved' },
  { key: 'txn_approved_pct', label: 'Txn (Approved) %' },
  { key: 'bl_sold_pct', label: 'BL Sold %' },
  { key: 'cost_per_txn', label: 'Cost / Txn' }
];

export default function McatWeeklyPerformanceTab() {
  const [data, setData] = useState<any[]>([]);
  const [campaignData, setCampaignData] = useState<any[]>([]);
  const [hierarchy, setHierarchy] = useState<Record<string, { pmcat: string; group: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [granularity, setGranularity] = useState<'group' | 'pmcat' | 'mcat'>('mcat');
  
  // Cascading Filters
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedPmcat, setSelectedPmcat] = useState<string>('all');
  const [selectedMcat, setSelectedMcat] = useState<string>('all');

  const [rankMetric, setRankMetric] = useState<string>('ctr');

  useEffect(() => {
    // Fetch both Redshift data and Hierarchy JSON
    Promise.all([
      fetch('/api/mcat-weekly-performance').then(r => r.json()),
      fetch('/mcat_hierarchy.json').then(r => r.json()).catch(() => ({}))
    ])
    .then(([resRedshift, resHierarchy]) => {
      if (resRedshift.success) {
        setHierarchy(resHierarchy);
        setData(resRedshift.data);
        setCampaignData(resRedshift.campaignData || []);

        // Default week
        const weeks = Array.from(new Set(resRedshift.data.map((d: any) => d.week_start_date))).sort((a: any, b: any) => b.localeCompare(a));
        if (weeks.length > 0) setSelectedWeek(weeks[0] as string);
      } else {
        setError(resRedshift.error || 'Failed to fetch Redshift data');
      }
      setLoading(false);
    })
    .catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  // Enriched Data (Join Redshift with Hierarchy)
  const enrichedData = useMemo(() => {
    return data.map(d => {
      const lookupKey = d.mcat ? d.mcat.toString().trim().toLowerCase() : '';
      const h = hierarchy[lookupKey];
      return {
        ...d,
        mcat: d.mcat || 'Unknown',
        group: h?.group || 'Unknown Group',
        pmcat: h?.pmcat || 'Unknown PMCAT'
      };
    });
  }, [data, hierarchy]);

  const weeks = useMemo(() => Array.from(new Set(data.map(d => d.week_start_date))).sort((a: any, b: any) => b.localeCompare(a)) as string[], [data]);

  // Derive unique options for cascading dropdowns based on the selected week & hierarchy
  const availableGroups = useMemo(() => {
    return Array.from(new Set(enrichedData.map(d => d.group))).sort();
  }, [enrichedData]);

  const availablePmcats = useMemo(() => {
    let filtered = enrichedData;
    if (selectedGroup !== 'all') filtered = filtered.filter(d => d.group === selectedGroup);
    return Array.from(new Set(filtered.map(d => d.pmcat))).sort();
  }, [enrichedData, selectedGroup]);

  const availableMcats = useMemo(() => {
    let filtered = enrichedData;
    if (selectedGroup !== 'all') filtered = filtered.filter(d => d.group === selectedGroup);
    if (selectedPmcat !== 'all') filtered = filtered.filter(d => d.pmcat === selectedPmcat);
    return Array.from(new Set(filtered.map(d => d.mcat))).sort();
  }, [enrichedData, selectedGroup, selectedPmcat]);

  // Aggregate stats based on current cascading filters
  const kpiStats = useMemo(() => {
    let filtered = enrichedData.filter(d => d.week_start_date === selectedWeek);
    
    if (selectedGroup !== 'all') filtered = filtered.filter(d => d.group === selectedGroup);
    if (granularity !== 'group' && selectedPmcat !== 'all') filtered = filtered.filter(d => d.pmcat === selectedPmcat);
    if (granularity === 'mcat' && selectedMcat !== 'all') filtered = filtered.filter(d => d.mcat === selectedMcat);

    const totals = { clicks: 0, impressions: 0, cost: 0, conversions: 0, ctr: 0, bl_sold_approved: 0, bl_approved: 0, bl_txn_approved: 0, blni: 0, txn_approved_pct: 0, bl_sold_pct: 0, cost_per_txn: 0 };
    filtered.forEach(d => {
      totals.clicks += d.clicks || 0;
      totals.impressions += d.impressions || 0;
      totals.cost += d.cost || 0;
      totals.conversions += d.conversions || 0;
      totals.bl_sold_approved += d.bl_sold_approved || 0;
      totals.bl_approved += d.bl_approved || 0;
      totals.bl_txn_approved += d.bl_txn_approved || 0;
      totals.blni += d.blni || 0;
    });
    
    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    totals.txn_approved_pct = totals.bl_approved > 0 ? (totals.bl_txn_approved / totals.bl_approved) * 100 : 0;
    totals.bl_sold_pct = totals.bl_approved > 0 ? (totals.bl_sold_approved / totals.bl_approved) * 100 : 0;
    totals.cost_per_txn = totals.bl_txn_approved > 0 ? totals.cost / totals.bl_txn_approved : 0;
    return totals;
  }, [enrichedData, selectedWeek, granularity, selectedGroup, selectedPmcat, selectedMcat]);

  // Roll up data by Granularity for the Ranking Analysis
  const rankingData = useMemo(() => {
    // Start with the selected week
    let weeklyData = enrichedData.filter(d => d.week_start_date === selectedWeek);
    
    // Apply higher-level filters if selected
    if (selectedGroup !== 'all') weeklyData = weeklyData.filter(d => d.group === selectedGroup);
    if (granularity === 'mcat' && selectedPmcat !== 'all') weeklyData = weeklyData.filter(d => d.pmcat === selectedPmcat);

    // Roll up logic
    const rolledUp = new Map<string, any>();
    
    weeklyData.forEach(d => {
      let key = d.mcat;
      if (granularity === 'pmcat') key = d.pmcat;
      if (granularity === 'group') key = d.group;

      if (!rolledUp.has(key)) {
        rolledUp.set(key, { name: key, clicks: 0, impressions: 0, cost: 0, conversions: 0, ctr: 0, bl_sold_approved: 0, bl_approved: 0, bl_txn_approved: 0, blni: 0 });
      }
      const existing = rolledUp.get(key);
      existing.clicks += d.clicks || 0;
      existing.impressions += d.impressions || 0;
      existing.cost += d.cost || 0;
      existing.conversions += d.conversions || 0;
      existing.bl_sold_approved += d.bl_sold_approved || 0;
      existing.bl_approved += d.bl_approved || 0;
      existing.bl_txn_approved += d.bl_txn_approved || 0;
      existing.blni += d.blni || 0;
    });

    const rolledUpArr = Array.from(rolledUp.values()).map(d => ({
      ...d,
      ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
      txn_approved_pct: d.bl_approved > 0 ? (d.bl_txn_approved / d.bl_approved) * 100 : 0,
      bl_sold_pct: d.bl_approved > 0 ? (d.bl_sold_approved / d.bl_approved) * 100 : 0,
      cost_per_txn: d.bl_txn_approved > 0 ? d.cost / d.bl_txn_approved : 0
    }));

    const sorted = [...rolledUpArr].sort((a, b) => b[rankMetric] - a[rankMetric]);
    
    const bottomSorted = [...rolledUpArr]
      .filter(d => rankMetric !== 'ctr' || d.impressions > 100) 
      .sort((a, b) => a[rankMetric] - b[rankMetric]);

    return {
      top10: sorted.slice(0, 10),
      bottom10: bottomSorted.slice(0, 10)
    };
  }, [enrichedData, selectedWeek, granularity, selectedGroup, selectedPmcat, rankMetric]);

  // AI Insights Generation
  const aiInsights = useMemo(() => {
    if (rankingData.top10.length === 0) return [];
    
    const insights = [];
    const topPerformer = rankingData.top10[0];
    const topCost = [...rankingData.top10, ...rankingData.bottom10].sort((a,b) => b.cost - a.cost)[0];
    const avgCtr = kpiStats.ctr;

    const metricLabel = METRICS.find(m => m.key === rankMetric)?.label || rankMetric;

    insights.push(`Top Driver: ${topPerformer.name} is leading the selected group with the highest ${metricLabel}.`);
    
    if (topCost && topCost.cost > 0) {
      insights.push(`Budget Focus: ${topCost.name} consumed the highest budget (₹${topCost.cost.toLocaleString(undefined, {maximumFractionDigits: 0})}) this week.`);
    }

    if (rankingData.bottom10.length > 0) {
      const bottom = rankingData.bottom10[0];
      insights.push(`Action Required: ${bottom.name} is heavily underperforming in ${metricLabel}. Consider pausing or optimizing its bids.`);
    }

    if (avgCtr > 2.5) {
      insights.push(`Healthy Engagement: Overall CTR of ${avgCtr.toFixed(1)}% is performing above the 2.5% threshold benchmark.`);
    } else {
      insights.push(`Low Engagement: Overall CTR is ${avgCtr.toFixed(1)}%, which is below the optimal target benchmark.`);
    }

    return insights;
  }, [rankingData, rankMetric, kpiStats]);

  const formatVal = (val: number, metric: string) => {
    if (metric === 'cost' || metric === 'cost_per_txn') return `₹${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (metric === 'ctr' || metric === 'txn_approved_pct' || metric === 'bl_sold_pct') return `${val.toFixed(1)}%`;
    return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const resetFilters = (level: string) => {
    if (level === 'group') {
      setSelectedGroup('all'); setSelectedPmcat('all'); setSelectedMcat('all');
    }
    if (level === 'pmcat') {
      setSelectedPmcat('all'); setSelectedMcat('all');
    }
  };

  if (loading) {
    return (
      <div className="tab on" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--bdr2)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Querying Redshift & Loading Hierarchy...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab on">
        <div className="alert alert-warn">
          <strong>Connection Error:</strong> {error}
        </div>
      </div>
    );
  }

  const getEntityTitle = () => {
    if (granularity === 'group') return selectedGroup === 'all' ? 'All Groups' : selectedGroup;
    if (granularity === 'pmcat') return selectedPmcat === 'all' ? (selectedGroup === 'all' ? 'All PMCATs' : `PMCATs in ${selectedGroup}`) : selectedPmcat;
    return selectedMcat === 'all' ? (selectedPmcat === 'all' ? 'All MCATs' : `MCATs in ${selectedPmcat}`) : selectedMcat;
  };

  return (
    <div className="tab on">
      {/* Top Filter Bar */}
      <div className="camp-filter-bar" style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <label>Granularity View</label>
            <select value={granularity} onChange={(e) => {
              setGranularity(e.target.value as any);
              resetFilters('group'); // Reset filters when changing view level
            }} style={{ background: 'var(--bg2)', border: '1px solid var(--teal)', color: 'var(--teal)' }}>
              <option value="group">Group Level</option>
              <option value="pmcat">PMCAT Level</option>
              <option value="mcat">MCAT Level</option>
            </select>
          </div>
          <div>
            <label>Week Starting</label>
            <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
              {weeks.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>

        {/* Cascading Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', padding: '10px', background: 'var(--bg2)', borderRadius: '8px' }}>
          <div>
            <label>Group Filter</label>
            <select value={selectedGroup} onChange={(e) => { setSelectedGroup(e.target.value); resetFilters('pmcat'); }} style={{ maxWidth: '250px' }}>
              <option value="all">All Groups</option>
              {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          
          {(granularity === 'pmcat' || granularity === 'mcat') && (
            <div>
              <label>PMCAT Filter</label>
              <select value={selectedPmcat} onChange={(e) => { setSelectedPmcat(e.target.value); resetFilters('mcat'); }} style={{ maxWidth: '250px' }}>
                <option value="all">All PMCATs</option>
                {availablePmcats.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}

          {granularity === 'mcat' && (
            <div>
              <label>MCAT Filter</label>
              <select value={selectedMcat} onChange={(e) => setSelectedMcat(e.target.value)} style={{ maxWidth: '250px' }}>
                <option value="all">All MCATs</option>
                {availableMcats.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="banner" style={{ marginBottom: '18px' }}>
        <div className="bn-left">
          <div style={{ fontSize: '24px' }}>⚡</div>
          <div>
            <div className="bn-title" style={{ color: C.t }}>
              {getEntityTitle()}
            </div>
            <div className="bn-sub">Week of {selectedWeek} · Redshift DWH</div>
          </div>
        </div>
        <div className="bn-stats" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div><div className="bn-val" style={{ color: C.b }}>{kpiStats.impressions.toLocaleString()}</div><div className="bn-lbl">Impressions</div></div>
          <div><div className="bn-val" style={{ color: C.t }}>{kpiStats.clicks.toLocaleString()}</div><div className="bn-lbl">Clicks</div></div>
          <div><div className="bn-val" style={{ color: C.g }}>{kpiStats.ctr.toFixed(1)}%</div><div className="bn-lbl">CTR</div></div>
          <div><div className="bn-val" style={{ color: C.r }}>₹{kpiStats.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div className="bn-lbl">Cost (INR)</div></div>
          <div><div className="bn-val" style={{ color: C.a }}>{kpiStats.conversions.toLocaleString()}</div><div className="bn-lbl">Conversions</div></div>
          <div><div className="bn-val" style={{ color: C.p }}>{kpiStats.bl_approved.toLocaleString()}</div><div className="bn-lbl">BL Approved</div></div>
          <div><div className="bn-val" style={{ color: '#66bb6a' }}>{kpiStats.bl_sold_approved.toLocaleString()}</div><div className="bn-lbl">BL Sold</div></div>
          <div><div className="bn-val" style={{ color: C.d }}>{kpiStats.bl_txn_approved.toLocaleString()}</div><div className="bn-lbl">Txn Approved</div></div>
          <div><div className="bn-val" style={{ color: '#ff8a65' }}>{kpiStats.blni.toLocaleString()}</div><div className="bn-lbl">BLNI</div></div>
          <div><div className="bn-val" style={{ color: '#29b6f6' }}>{kpiStats.txn_approved_pct.toFixed(1)}%</div><div className="bn-lbl">Txn (Appr) %</div></div>
          <div><div className="bn-val" style={{ color: '#ffca28' }}>{kpiStats.bl_sold_pct.toFixed(1)}%</div><div className="bn-lbl">BL Sold %</div></div>
          <div><div className="bn-val" style={{ color: '#ef5350' }}>₹{kpiStats.cost_per_txn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div className="bn-lbl">Cost / Txn</div></div>
        </div>
      </div>

      {/* AI Insights Section */}
      <div className="sh" style={{ marginTop: '30px' }}>
        <h2>✨ AI Generated Insights <span>Based on selected filters</span></h2>
      </div>
      <div className="cc" style={{ margin: 0, marginBottom: '25px', background: 'var(--bg2)', border: '1px solid var(--teal)' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {aiInsights.map((insight, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ color: 'var(--teal)' }}>✦</span>
              <span style={{ fontSize: '14px', lineHeight: '1.4' }}>{insight}</span>
            </li>
          ))}
          {aiInsights.length === 0 && <li style={{ color: 'var(--muted)' }}>Not enough data to generate insights for this selection.</li>}
        </ul>
      </div>

      <div className="sh" style={{ marginTop: '30px' }}>
        <h2>{granularity.toUpperCase()} Ranking Analysis <span>Week of {selectedWeek}</span></h2>
      </div>

      {/* Metric Selector for Rankings */}
      <div className="ai-tabs" style={{ marginBottom: '20px' }}>
        {METRICS.map(m => (
          <button 
            key={m.key} 
            className={`ai-tab ${rankMetric === m.key ? 'on' : ''}`} 
            onClick={() => setRankMetric(m.key)}
          >
            Rank by {m.label}
          </button>
        ))}
      </div>

      <div className="cg" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
        <div className="cc" style={{ margin: 0 }}>
          <div className="ct">🏆 Top 10 {granularity.toUpperCase()}s</div>
          <div className="cs">Highest {METRICS.find(m => m.key === rankMetric)?.label}</div>
          <div className="tw" style={{ marginTop: '15px' }}>
            <table className="dt">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>{granularity.toUpperCase()} Name</th>
                  <th className="num">{METRICS.find(m => m.key === rankMetric)?.label}</th>
                </tr>
              </thead>
              <tbody>
                {rankingData.top10.map((item, idx) => (
                  <tr key={item.name + idx}>
                    <td style={{ color: 'var(--muted)', width: '40px' }}>#{idx + 1}</td>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td className="num hi">{formatVal(item[rankMetric], rankMetric)}</td>
                  </tr>
                ))}
                {rankingData.top10.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center' }}>No data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="cc" style={{ margin: 0 }}>
          <div className="ct">⚠️ Bottom 10 {granularity.toUpperCase()}s</div>
          <div className="cs">Lowest {METRICS.find(m => m.key === rankMetric)?.label} {rankMetric === 'ctr' ? '(Min 100 Impr)' : ''}</div>
          <div className="tw" style={{ marginTop: '15px' }}>
            <table className="dt">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>{granularity.toUpperCase()} Name</th>
                  <th className="num">{METRICS.find(m => m.key === rankMetric)?.label}</th>
                </tr>
              </thead>
              <tbody>
                {rankingData.bottom10.map((item, idx) => (
                  <tr key={item.name + idx}>
                    <td style={{ color: 'var(--muted)', width: '40px' }}>#{idx + 1}</td>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td className="num bd">{formatVal(item[rankMetric], rankMetric)}</td>
                  </tr>
                ))}
                {rankingData.bottom10.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center' }}>No data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Time-Series Trend */}
      <div className="sh" style={{ marginTop: '30px' }}>
        <h2>12-Week Trend <span>{getEntityTitle()}</span></h2>
      </div>
      <div className="cg" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="cc w" style={{ gridColumn: 'span 1' }}>
          <div className="ct">Clicks & Impressions Trend</div>
          <ChartComponent 
            type="line" 
            height={300}
            data={{
              labels: weeks.slice().reverse(),
              datasets: [
                {
                  label: 'Impressions',
                  data: weeks.slice().reverse().map(w => {
                    let wData = enrichedData.filter(d => d.week_start_date === w);
                    if (selectedGroup !== 'all') wData = wData.filter(d => d.group === selectedGroup);
                    if (granularity !== 'group' && selectedPmcat !== 'all') wData = wData.filter(d => d.pmcat === selectedPmcat);
                    if (granularity === 'mcat' && selectedMcat !== 'all') wData = wData.filter(d => d.mcat === selectedMcat);
                    return wData.reduce((sum, d) => sum + d.impressions, 0);
                  }),
                  borderColor: C.b,
                  backgroundColor: C.b + '18',
                  yAxisID: 'y',
                  tension: 0.35,
                  fill: true
                },
                {
                  label: 'Clicks',
                  data: weeks.slice().reverse().map(w => {
                    let wData = enrichedData.filter(d => d.week_start_date === w);
                    if (selectedGroup !== 'all') wData = wData.filter(d => d.group === selectedGroup);
                    if (granularity !== 'group' && selectedPmcat !== 'all') wData = wData.filter(d => d.pmcat === selectedPmcat);
                    if (granularity === 'mcat' && selectedMcat !== 'all') wData = wData.filter(d => d.mcat === selectedMcat);
                    return wData.reduce((sum, d) => sum + d.clicks, 0);
                  }),
                  borderColor: C.t,
                  backgroundColor: C.t + '18',
                  yAxisID: 'y1',
                  tension: 0.35,
                  fill: true
                }
              ]
            }} 
            options={{
              scales: {
                y: { type: 'linear', display: true, position: 'left' },
                y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } }
              }
            }} 
          />
        </div>
        <div className="cc" style={{ gridColumn: 'span 1' }}>
          <div className="ct">CTR % Trend</div>
          <ChartComponent 
            type="line" 
            height={300}
            data={{
              labels: weeks.slice().reverse(),
              datasets: [{
                label: 'CTR%',
                data: weeks.slice().reverse().map(w => {
                  let wData = enrichedData.filter(d => d.week_start_date === w);
                  if (selectedGroup !== 'all') wData = wData.filter(d => d.group === selectedGroup);
                  if (granularity !== 'group' && selectedPmcat !== 'all') wData = wData.filter(d => d.pmcat === selectedPmcat);
                  if (granularity === 'mcat' && selectedMcat !== 'all') wData = wData.filter(d => d.mcat === selectedMcat);
                  const imp = wData.reduce((sum, d) => sum + d.impressions, 0);
                  const clk = wData.reduce((sum, d) => sum + d.clicks, 0);
                  return imp > 0 ? (clk / imp) * 100 : 0;
                }),
                borderColor: C.g,
                tension: 0.35,
                fill: false
              }]
            }} 
          />
        </div>
      </div>

      {/* Campaign Conversion Analysis */}
      <div className="sh" style={{ marginTop: '30px' }}>
        <h2>Campaign Conversions (by MCAT ID) <span>From mcat_ads_campaign</span></h2>
      </div>
      <div className="tw cc">
        <table className="dt">
          <thead>
            <tr>
              <th>MCAT ID</th>
              <th className="num">BL Approved</th>
              <th className="num">BL Sold</th>
              <th className="num">Txn</th>
              <th className="num">BLNI</th>
              <th className="num">Cost (INR)</th>
            </tr>
          </thead>
          <tbody>
            {campaignData
              .filter(d => d.week_start_date === selectedWeek)
              .sort((a,b) => b.bl_approved - a.bl_approved)
              .slice(0, 50)
              .map((item, idx) => (
              <tr key={item.mcat_id + idx}>
                <td style={{ fontWeight: 500 }}>{item.mcat_id}</td>
                <td className="num">{item.bl_approved.toLocaleString()}</td>
                <td className="num">{item.bl_sold_approved.toLocaleString()}</td>
                <td className="num">{item.bl_txn_approved.toLocaleString()}</td>
                <td className="num">{item.blni.toLocaleString()}</td>
                <td className="num">₹{item.total_cost_inr.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
              </tr>
            ))}
            {campaignData.filter(d => d.week_start_date === selectedWeek).length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center' }}>No data</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
