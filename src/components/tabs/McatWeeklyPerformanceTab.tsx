"use client";

import React, { useState, useEffect, useMemo } from 'react';
import ChartComponent from '../ChartComponent';

const C = { t: '#00cba4', b: '#4d9fff', g: '#3dd68c', r: '#ff6168', a: '#ffb547', p: '#a78bfa', d: '#4a6070' };

export default function McatWeeklyPerformanceTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedMcat, setSelectedMcat] = useState<string>('all');
  const [rankMetric, setRankMetric] = useState<string>('ctr');

  useEffect(() => {
    fetch('/api/mcat-weekly-performance')
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setData(res.data);
          // Set default week to the most recent week
          const weeks = Array.from(new Set(res.data.map((d: any) => d.week_start_date))).sort((a: any, b: any) => b.localeCompare(a));
          if (weeks.length > 0) {
            setSelectedWeek(weeks[0] as string);
          }
        } else {
          setError(res.error || 'Failed to fetch data');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const weeks = useMemo(() => Array.from(new Set(data.map(d => d.week_start_date))).sort((a: any, b: any) => b.localeCompare(a)) as string[], [data]);
  const mcats = useMemo(() => Array.from(new Set(data.map(d => d.mcat))).sort() as string[], [data]);

  // Aggregate stats for the selected week and MCAT
  const kpiStats = useMemo(() => {
    let filtered = data.filter(d => d.week_start_date === selectedWeek);
    if (selectedMcat !== 'all') {
      filtered = filtered.filter(d => d.mcat === selectedMcat);
    }
    
    const totals = { clicks: 0, impressions: 0, cost: 0, conversions: 0, ctr: 0 };
    filtered.forEach(d => {
      totals.clicks += d.clicks;
      totals.impressions += d.impressions;
      totals.cost += d.cost;
      totals.conversions += d.conversions;
    });
    
    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    return totals;
  }, [data, selectedWeek, selectedMcat]);

  // Ranking analysis for the selected week (Always across ALL MCATs)
  const rankingData = useMemo(() => {
    const weeklyData = data.filter(d => d.week_start_date === selectedWeek);
    
    const sorted = [...weeklyData].sort((a, b) => b[rankMetric] - a[rankMetric]);
    
    // For bottom 10, filter out zeros if it's a ratio like CTR or strictly numeric if we want meaningful bottoms.
    // Or just take the actual bottom.
    const bottomSorted = [...weeklyData]
      .filter(d => rankMetric !== 'ctr' || d.impressions > 100) // minimum threshold for bottom CTR to avoid noise
      .sort((a, b) => a[rankMetric] - b[rankMetric]);

    return {
      top10: sorted.slice(0, 10),
      bottom10: bottomSorted.slice(0, 10)
    };
  }, [data, selectedWeek, rankMetric]);

  const formatVal = (val: number, metric: string) => {
    if (metric === 'cost') return `₹${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (metric === 'ctr') return `${val.toFixed(2)}%`;
    return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  if (loading) {
    return (
      <div className="tab on" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--bdr2)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Querying Redshift cluster...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab on">
        <div className="alert alert-warn">
          <strong>Redshift Connection Error:</strong> {error}
        </div>
      </div>
    );
  }

  const METRICS = [
    { key: 'clicks', label: 'Clicks' },
    { key: 'impressions', label: 'Impressions' },
    { key: 'cost', label: 'Cost (INR)' },
    { key: 'conversions', label: 'Conversions' },
    { key: 'ctr', label: 'CTR %' }
  ];

  return (
    <div className="tab on">
      {/* Banner & Filters */}
      <div className="camp-filter-bar" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <div>
            <label>Week Starting</label>
            <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
              {weeks.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <label>MCAT Filter</label>
            <select value={selectedMcat} onChange={(e) => setSelectedMcat(e.target.value)} style={{ maxWidth: '300px' }}>
              <option value="all">All MCATs</option>
              {mcats.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="banner" style={{ marginBottom: '18px' }}>
        <div className="bn-left">
          <div style={{ fontSize: '24px' }}>⚡</div>
          <div>
            <div className="bn-title" style={{ color: C.t }}>
              {selectedMcat === 'all' ? 'All MCATs Overview' : selectedMcat}
            </div>
            <div className="bn-sub">Week of {selectedWeek} · Redshift DWH</div>
          </div>
        </div>
        <div className="bn-stats" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div><div className="bn-val" style={{ color: C.b }}>{kpiStats.impressions.toLocaleString()}</div><div className="bn-lbl">Impressions</div></div>
          <div><div className="bn-val" style={{ color: C.t }}>{kpiStats.clicks.toLocaleString()}</div><div className="bn-lbl">Clicks</div></div>
          <div><div className="bn-val" style={{ color: C.g }}>{kpiStats.ctr.toFixed(2)}%</div><div className="bn-lbl">CTR</div></div>
          <div><div className="bn-val" style={{ color: C.r }}>₹{kpiStats.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div className="bn-lbl">Cost (INR)</div></div>
          <div><div className="bn-val" style={{ color: C.a }}>{kpiStats.conversions.toLocaleString()}</div><div className="bn-lbl">Conversions</div></div>
        </div>
      </div>

      <div className="sh" style={{ marginTop: '30px' }}>
        <h2>MCAT Ranking Analysis <span>Week of {selectedWeek} — Across All MCATs</span></h2>
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
          <div className="ct">🏆 Top 10 MCATs</div>
          <div className="cs">Highest {METRICS.find(m => m.key === rankMetric)?.label}</div>
          <div className="tw" style={{ marginTop: '15px' }}>
            <table className="dt">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>MCAT</th>
                  <th className="num">{METRICS.find(m => m.key === rankMetric)?.label}</th>
                </tr>
              </thead>
              <tbody>
                {rankingData.top10.map((item, idx) => (
                  <tr key={item.mcat + idx}>
                    <td style={{ color: 'var(--muted)', width: '40px' }}>#{idx + 1}</td>
                    <td style={{ fontWeight: 500 }}>{item.mcat}</td>
                    <td className="num hi">{formatVal(item[rankMetric], rankMetric)}</td>
                  </tr>
                ))}
                {rankingData.top10.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center' }}>No data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="cc" style={{ margin: 0 }}>
          <div className="ct">⚠️ Bottom 10 MCATs</div>
          <div className="cs">Lowest {METRICS.find(m => m.key === rankMetric)?.label} {rankMetric === 'ctr' ? '(Min 100 Impr)' : ''}</div>
          <div className="tw" style={{ marginTop: '15px' }}>
            <table className="dt">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>MCAT</th>
                  <th className="num">{METRICS.find(m => m.key === rankMetric)?.label}</th>
                </tr>
              </thead>
              <tbody>
                {rankingData.bottom10.map((item, idx) => (
                  <tr key={item.mcat + idx}>
                    <td style={{ color: 'var(--muted)', width: '40px' }}>#{idx + 1}</td>
                    <td style={{ fontWeight: 500 }}>{item.mcat}</td>
                    <td className="num bd">{formatVal(item[rankMetric], rankMetric)}</td>
                  </tr>
                ))}
                {rankingData.bottom10.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center' }}>No data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Time-Series Trend for selected MCAT/All */}
      <div className="sh" style={{ marginTop: '30px' }}>
        <h2>12-Week Trend <span>{selectedMcat === 'all' ? 'All MCATs' : selectedMcat}</span></h2>
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
                    return data.filter(d => d.week_start_date === w && (selectedMcat === 'all' || d.mcat === selectedMcat))
                               .reduce((sum, d) => sum + d.impressions, 0);
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
                    return data.filter(d => d.week_start_date === w && (selectedMcat === 'all' || d.mcat === selectedMcat))
                               .reduce((sum, d) => sum + d.clicks, 0);
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
                  const wData = data.filter(d => d.week_start_date === w && (selectedMcat === 'all' || d.mcat === selectedMcat));
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
    </div>
  );
}
