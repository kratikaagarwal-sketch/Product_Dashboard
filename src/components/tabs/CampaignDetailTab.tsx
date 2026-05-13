"use client";

import React, { useState, useMemo } from 'react';
import ChartComponent from '../ChartComponent';
import { CAMPAIGNS, HIERARCHY_DATA } from '@/lib/constants';

const C = { t: '#00cba4', b: '#4d9fff', g: '#3dd68c', r: '#ff6168', a: '#ffb547', p: '#a78bfa', d: '#4a6070' };

export default function CampaignDetailTab() {
  const [period, setPeriod] = useState<'weekly' | 'daily' | 'monthly'>('weekly');
  const [campaignKey, setCampaignKey] = useState('bc');
  const [pmcatKey, setPmcatKey] = useState('all');
  const [mcatKey, setMcatKey] = useState('all');
  
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);

  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);

  React.useEffect(() => {
    if (period === 'daily') {
      setLoadingDaily(true);
      fetch('/api/campaign-daily')
        .then(r => r.json())
        .then(res => {
          if (res.success) {
            setDailyData(res.data);
          } else {
            setDailyError(res.error || 'Failed to fetch data');
          }
          setLoadingDaily(false);
        })
        .catch(e => {
          setDailyError(e.message);
          setLoadingDaily(false);
        });
    }
    if (period === 'weekly') {
      setLoadingWeekly(true);
      fetch('/api/campaign-weekly')
        .then(r => r.json())
        .then(res => {
          if (res.success) {
            setWeeklyData(res.data);
          } else {
            setWeeklyError(res.error || 'Failed to fetch data');
          }
          setLoadingWeekly(false);
        })
        .catch(e => {
          setWeeklyError(e.message);
          setLoadingWeekly(false);
        });
    }
    if (period === 'monthly') {
      setLoadingMonthly(true);
      fetch('/api/campaign-monthly')
        .then(r => r.json())
        .then(res => {
          if (res.success) {
            setMonthlyData(res.data);
          } else {
            setMonthlyError(res.error || 'Failed to fetch data');
          }
          setLoadingMonthly(false);
        })
        .catch(e => {
          setMonthlyError(e.message);
          setLoadingMonthly(false);
        });
    }
  }, [period]);

  const campaign = CAMPAIGNS[campaignKey];
  
  const [hierarchyData, setHierarchyData] = useState<any>({});

  React.useEffect(() => {
    fetch('/hierarchy.json')
      .then(r => r.json())
      .then(data => setHierarchyData(data))
      .catch(e => console.error("Failed to load hierarchy data", e));
  }, []);

  const CAMPAIGN_TO_GROUP: Record<string, string> = {
    bc: 'Building Construction Material, Equipment, Civil Engineering and Real Estate',
    ind_eng: 'Industrial & Engineering Products, Spares and Supplies',
    ind_pm: 'Industrial Plants, Machinery & Equipment',
    mech: 'Mechanical Components & Parts',
    packaging: 'Packaging Material, Supplies & Machines',
    tools: 'Tools, Machine Tools, Power Tools & Hand Tools',
    kitchen: 'Kitchen Containers, Utensils, Stove, Cookware, Tableware and Food Choppers'
  };

  // Cascading logic
  const pmcats = useMemo(() => {
    const groupName = CAMPAIGN_TO_GROUP[campaignKey];
    if (!groupName || !hierarchyData[groupName]) return {};
    return hierarchyData[groupName].pmcats || {};
  }, [campaignKey, hierarchyData]);

  const mcats = useMemo(() => {
    if (pmcatKey === 'all' || !pmcats[pmcatKey]) return {};
    return pmcats[pmcatKey].mcats || {};
  }, [pmcatKey, pmcats]);

  // Derived data based on filters
  const scale = useMemo(() => {
    if (mcatKey !== 'all') return 0.12;
    if (pmcatKey !== 'all') return 0.38;
    return 1.0;
  }, [pmcatKey, mcatKey]);

  const scaledData = useMemo(() => {
    const last = campaign.weeks.length - 1;
    return {
      bl: Math.round(campaign.bl[last] * scale),
      costBL: campaign.costBL[last], // Efficiency remains same or could be slightly adjusted
      spend: campaign.spend[last] * scale,
      blBest: Math.round(campaign.blBest * scale)
    };
  }, [campaign, scale]);

  const blTrendData = {
    labels: campaign.weeks,
    datasets: [{
      label: 'BL Approved',
      data: campaign.bl.map((v: number) => Math.round(v * scale)),
      borderColor: campaign.color,
      backgroundColor: campaign.color + '18',
      fill: true,
      tension: 0.35
    }, {
      label: 'Best Ever',
      data: Array(campaign.weeks.length).fill(Math.round(campaign.blBest * scale)),
      borderColor: 'var(--red)',
      borderWidth: 1.5,
      borderDash: [6, 3],
      pointRadius: 0,
      fill: false
    }]
  };

  const costBlTrendData = {
    labels: campaign.weeks,
    datasets: [{
      label: 'Cost / BL',
      data: campaign.costBL,
      borderColor: campaign.color,
      tension: 0.35,
      fill: false
    }]
  };

  const spendTrendData = {
    labels: campaign.weeks,
    datasets: [{
      label: 'Weekly Spend',
      data: campaign.spend.map((v: number) => v * scale),
      backgroundColor: campaign.color + 'cc',
      borderRadius: 4
    }]
  };

  const impClkData = {
    labels: campaign.weeks,
    datasets: [
      {
        label: 'Impressions (M)',
        data: campaign.impr.map((v: number) => v * scale),
        borderColor: 'var(--blue)',
        backgroundColor: 'var(--blue)18',
        yAxisID: 'y',
        tension: 0.35,
        fill: true
      },
      {
        label: 'Clicks (K)',
        data: campaign.clicks.map((v: number) => v * scale),
        borderColor: 'var(--teal)',
        backgroundColor: 'var(--teal)18',
        yAxisID: 'y1',
        tension: 0.35,
        fill: true
      }
    ]
  };

  const ctrTrendData = {
    labels: campaign.weeks,
    datasets: [{
      label: 'CTR%',
      data: campaign.ctr,
      borderColor: 'var(--blue)',
      tension: 0.35,
      fill: false
    }]
  };

  const cpcTrendData = {
    labels: campaign.weeks,
    datasets: [{
      label: 'Avg CPC',
      data: campaign.cpc,
      borderColor: 'var(--blue)',
      tension: 0.35,
      fill: false
    }]
  };

  const convTrendData = {
    labels: campaign.weeks,
    datasets: [{
      label: 'Conversions',
      data: campaign.conv.map((v: number) => v * scale),
      borderColor: campaign.color,
      tension: 0.35,
      fill: false
    }]
  };

  const costConvTrendData = {
    labels: campaign.weeks,
    datasets: [{
      label: 'Cost / Conv',
      data: campaign.costConv,
      borderColor: campaign.color,
      tension: 0.35,
      fill: false
    }]
  };

  const txnPctTrendData = {
    labels: campaign.weeks,
    datasets: [{
      label: 'Transaction %',
      data: campaign.txnPct,
      borderColor: campaign.color,
      tension: 0.35,
      fill: false
    }]
  };

  const budgetUtilData = {
    labels: campaign.weeks,
    datasets: [{
      label: 'Budget Util %',
      data: campaign.budgetPct,
      borderColor: 'var(--blue)',
      tension: 0.35,
      fill: false
    }]
  };

  // Focus Charts Data
  const pmcatBktData = {
    labels: campaign.pmcatBkt?.labels || [],
    datasets: [{
      data: campaign.pmcatBkt?.latest || [],
      backgroundColor: [C.r, C.a, C.b, C.t, C.g, C.p],
      borderRadius: 4
    }]
  };

  const pmcatCovTrendData = {
    labels: campaign.weeks,
    datasets: [
      {
        label: 'Coverage%',
        data: campaign.pmcatCov,
        borderColor: 'var(--blue)',
        fill: false,
        tension: 0.35
      },
      {
        label: 'Target 80%',
        data: Array(campaign.weeks.length).fill(80),
        borderColor: 'var(--red)',
        borderWidth: 1.5,
        borderDash: [6, 3],
        pointRadius: 0,
        fill: false
      }
    ]
  };

  const clickBktData = {
    labels: ['0 Clicks', '1-10 Clicks', '10+ Clicks'],
    datasets: [{
      data: [
        campaign.clicks0[campaign.weeks.length - 1],
        campaign.clicks110[campaign.weeks.length - 1],
        campaign.clicks10p[campaign.weeks.length - 1]
      ],
      backgroundColor: [C.r, C.a, C.g],
      borderRadius: 4
    }]
  };

  const prodCntTrendData = {
    labels: campaign.weeks,
    datasets: [{
      label: 'Products',
      data: campaign.prods,
      borderColor: 'var(--blue)',
      tension: 0.35,
      fill: false
    }]
  };

  const getBadgeClass = (value: string, invert = false) => {
    if (!value || value === 'N/A' || value === '0.00%') return 'neu';
    const n = parseFloat(value);
    if (isNaN(n)) return 'neu';
    const isPositive = n > 0;
    if (invert) return isPositive ? 'down' : 'up';
    return isPositive ? 'up' : 'down';
  };

  return (
    <div className="tab on">
      {/* Sub-navigation for Period */}
      <div className="ai-tabs" style={{ marginBottom: '20px' }}>
        <button className={`ai-tab ${period === 'daily' ? 'on' : ''}`} onClick={() => setPeriod('daily')}>Daily View</button>
        <button className={`ai-tab ${period === 'weekly' ? 'on' : ''}`} onClick={() => setPeriod('weekly')}>Weekly View</button>
        <button className={`ai-tab ${period === 'monthly' ? 'on' : ''}`} onClick={() => setPeriod('monthly')}>Monthly Performance</button>
      </div>

      {/* Filter Bar */}
      <div className="camp-filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div>
            <label>Campaign</label>
            <select value={campaignKey} onChange={(e) => { setCampaignKey(e.target.value); setPmcatKey('all'); setMcatKey('all'); }}>
              {Object.keys(CAMPAIGNS).map(k => <option key={k} value={k}>{CAMPAIGNS[k].name}</option>)}
            </select>
          </div>
          <div>
            <label>PMCAT</label>
            <select value={pmcatKey} onChange={(e) => { setPmcatKey(e.target.value); setMcatKey('all'); }}>
              <option value="all">All PMCATs</option>
              {Object.keys(pmcats).map(pk => <option key={pk} value={pk}>{pmcats[pk].name}</option>)}
            </select>
          </div>
          <div>
            <label>MCAT</label>
            <select value={mcatKey} onChange={(e) => setMcatKey(e.target.value)}>
              <option value="all">All MCATs</option>
              {Object.keys(mcats).map(mk => <option key={mk} value={mk}>{mcats[mk]}</option>)}
            </select>
          </div>
        </div>
        <div id="filter-badge" className="filter-pill" style={{ display: (pmcatKey !== 'all' || mcatKey !== 'all') ? 'inline-flex' : 'none' }}>
          🔍 {mcatKey !== 'all' ? 'MCAT Focus' : 'PMCAT Focus'}
        </div>
      </div>

      {period === 'weekly' && (
        <div id="weekly-content">
          {/* Banner */}
          <div className="banner" style={{ marginBottom: '18px' }}>
            <div className="bn-left">
              <div style={{ fontSize: '24px' }}>📈</div>
              <div>
                <div className="bn-title" style={{ color: campaign.color }}>
                  {campaign.name} {mcatKey !== 'all' ? ` — ${mcats[mcatKey]}` : (pmcatKey !== 'all' ? ` — ${pmcats[pmcatKey].name}` : '')}
                </div>
                <div className="bn-sub">Latest Week Snapshot · Budget: {campaign.budget}</div>
              </div>
            </div>
            <div className="bn-stats">
              <div><div className="bn-val" style={{ color: campaign.color }}>{scaledData.bl.toLocaleString()}</div><div className="bn-lbl">Latest BL</div></div>
              <div><div className="bn-val" style={{ color: campaign.color }}>₹{scaledData.costBL}</div><div className="bn-lbl">Cost/BL</div></div>
              <div><div className="bn-val" style={{ color: 'var(--green)' }}>{campaign.delta.bl}</div><div className="bn-lbl">vs LW</div></div>
              <div><div className="bn-val" style={{ color: 'var(--teal)' }}>{scaledData.blBest.toLocaleString()}</div><div className="bn-lbl">Best Ever</div></div>
            </div>
          </div>

          {/* Live Weekly Redshift Snapshot */}
          {loadingWeekly && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--teal)' }}>
              <div style={{ fontSize: '30px', marginBottom: '10px' }}>⏳</div>
              <h3>Querying Redshift cluster (Weekly)...</h3>
            </div>
          )}
          {weeklyError && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--red)' }}>
              <div style={{ fontSize: '30px', marginBottom: '10px' }}>❌</div>
              <h3>Error connecting to database</h3>
              <p>{weeklyError}</p>
            </div>
          )}
          {!loadingWeekly && !weeklyError && weeklyData.length > 0 && (() => {
            const currentWeekly = weeklyData.find(d => d.glcat_grp_name?.toLowerCase().includes(campaign.name.split(' ')[0].toLowerCase())) || { bl_approved: 0, bl_sold: 0, trans: 0, blni: 0 };
            return (
              <div style={{ marginBottom: '40px', padding: '20px', background: 'var(--bg2)', borderRadius: '8px', border: '1px solid var(--tdim)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '18px', color: 'var(--fg)', margin: 0 }}>⚡ Live 7-Day Performance <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--dim)', marginLeft: '10px' }}>Redshift DWH</span></h2>
                </div>
                
                <div className="kg">
                  <div className="kc best">
                    <div className="kl">BL Approved (7D)</div>
                    <div className="kv">{currentWeekly.bl_approved.toLocaleString()}</div>
                    <span className="badge up">Live</span>
                  </div>
                  <div className="kc">
                    <div className="kl">BL Sold (7D)</div>
                    <div className="kv">{currentWeekly.bl_sold.toLocaleString()}</div>
                    <span className="badge neu">Live</span>
                  </div>
                  <div className="kc best">
                    <div className="kl">Transactions (7D)</div>
                    <div className="kv">{currentWeekly.trans.toLocaleString()}</div>
                    <span className="badge up">Live</span>
                  </div>
                  <div className="kc">
                    <div className="kl">BL Rejected (7D)</div>
                    <div className="kv">{currentWeekly.blni.toLocaleString()}</div>
                    <span className="badge down">Live</span>
                  </div>
                </div>

                <div className="cg" style={{ gridTemplateColumns: '2fr 1fr', marginTop: '20px' }}>
                  <div className="cc" style={{ gridColumn: 'span 1' }}>
                    <div className="ct">7-Day Funnel Metrics</div>
                    <div className="cs">Approved → Sold → Transacted</div>
                    <ChartComponent type="bar" height={300} data={{
                      labels: ['BL Approved', 'BL Sold', 'Transactions', 'Rejected'],
                      datasets: [{
                        label: 'Volume (Last 7 Days)',
                        data: [currentWeekly.bl_approved, currentWeekly.bl_sold, currentWeekly.trans, currentWeekly.blni],
                        backgroundColor: [campaign.color, 'var(--teal)', 'var(--green)', 'var(--red)'],
                        borderRadius: 4
                      }]
                    }} />
                  </div>
                  <div className="cc" style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column' }}>
                    <div className="ct">Diagnostics</div>
                    <div className="cs">Weekly insights</div>
                    <div className="hyg-actions" style={{ flexGrow: 1, marginTop: '10px' }}>
                      <div className="hyg-action warn">
                        <div className="hyg-action-tag" style={{ color: 'var(--amber)' }}>Review</div>
                        <div className="hyg-action-title">Weekly Drop-off</div>
                        <div className="hyg-action-body">Conversion from Approved to Sold is low this week. Review pricing.</div>
                        <button className="btn btn-p" style={{ marginTop: '10px', width: '100%', padding: '6px 0', fontSize: '12px' }}>Check Pricing Strategy</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* KPI Cards Grid */}
          <div className="sh">
            <h2>All KPIs & Diagnostics <span>Latest week snapshot</span></h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px', alignItems: 'start', marginBottom: '25px' }}>
            <div className="kg" style={{ marginBottom: 0 }}>
            <div className={`kc ${campaign.bl[campaign.weeks.length - 1] === campaign.blBest ? 'best' : ''}`}>
              <div className="kl">BL Approved</div>
              <div className="kv">{scaledData.bl.toLocaleString()}</div>
              <span className={`badge ${getBadgeClass(campaign.delta.bl)}`}>{campaign.delta.bl}</span>
              <div className="ks">Best: {scaledData.blBest.toLocaleString()}</div>
            </div>
            <div className={`kc ${campaign.costBL[campaign.weeks.length - 1] === campaign.costBLBest ? 'best' : ''}`}>
              <div className="kl">Cost / BL</div>
              <div className="kv">₹{scaledData.costBL.toFixed(1)}</div>
              <span className={`badge ${getBadgeClass(campaign.delta.costBL, true)}`}>{campaign.delta.costBL}</span>
              <div className="ks">Best: ₹{campaign.costBLBest}</div>
            </div>
            <div className="kc">
              <div className="kl">Weekly Spend</div>
              <div className="kv">₹{scaledData.spend.toFixed(1)}K</div>
              <span className={`badge ${getBadgeClass(campaign.delta.spend, true)}`}>{campaign.delta.spend}</span>
            </div>
            <div className="kc">
              <div className="kl">Impressions</div>
              <div className="kv">{(campaign.impr[campaign.weeks.length - 1] * scale).toFixed(1)}M</div>
              <span className="badge neu">Latest</span>
            </div>
            <div className="kc">
              <div className="kl">Clicks</div>
              <div className="kv">{(campaign.clicks[campaign.weeks.length - 1] * scale).toFixed(1)}K</div>
              <span className="badge neu">Latest</span>
            </div>
            <div className="kc">
              <div className="kl">CTR</div>
              <div className="kv">{campaign.ctr[campaign.weeks.length - 1].toFixed(2)}%</div>
              <span className={`badge ${getBadgeClass(campaign.delta.ctr)}`}>{campaign.delta.ctr}</span>
            </div>
            <div className="kc">
              <div className="kl">Avg CPC</div>
              <div className="kv">₹{campaign.cpc[campaign.weeks.length - 1].toFixed(2)}</div>
              <span className={`badge ${getBadgeClass(campaign.delta.cpc, true)}`}>{campaign.delta.cpc}</span>
            </div>
            <div className="kc">
              <div className="kl">Conversions</div>
              <div className="kv">{Math.round(campaign.conv[campaign.weeks.length - 1] * scale).toLocaleString()}</div>
              <span className={`badge ${getBadgeClass(campaign.delta.conv)}`}>{campaign.delta.conv}</span>
            </div>
            <div className="kc">
              <div className="kl">Cost/Conv</div>
              <div className="kv">₹{campaign.costConv[campaign.weeks.length - 1].toFixed(1)}</div>
              <span className={`badge ${getBadgeClass(campaign.delta.costConv, true)}`}>{campaign.delta.costConv}</span>
            </div>
            <div className="kc">
              <div className="kl">PMCAT Coverage</div>
              <div className="kv">{campaign.pmcatCov[campaign.weeks.length - 1] != null ? campaign.pmcatCov[campaign.weeks.length - 1].toFixed(1) + '%' : 'N/A'}</div>
              <span className="badge neu">Latest</span>
              <div className="ks">Target: 80%</div>
            </div>
            <div className="kc">
              <div className="kl">Txn %</div>
              <div className="kv">{campaign.txnPct[campaign.weeks.length - 1].toFixed(1)}%</div>
              <span className="badge up">Latest</span>
            </div>
            <div className="kc">
              <div className="kl">Budget Used</div>
              <div className="kv">{campaign.budgetPct[campaign.weeks.length - 1] != null ? campaign.budgetPct[campaign.weeks.length - 1].toFixed(1) + '%' : 'N/A'}</div>
              <span className="badge neu">of {campaign.budget}</span>
            </div>
          </div>

            <div className="cc" style={{ margin: 0, height: '100%' }}>
              <div className="ct">Recommended Actions</div>
              <div className="cs">Fix these to improve campaign efficiency</div>
              <div className="hyg-actions" style={{ marginTop: '10px' }}>
                <div className="hyg-action" style={{ paddingBottom: '15px' }}>
                  <div className="hyg-action-tag" style={{ color: 'var(--red)' }}>Critical</div>
                  <div className="hyg-action-title">Cost per BL Surge</div>
                  <div className="hyg-action-body" style={{ marginBottom: '10px' }}>Cost/BL increased <span style={{ color: 'var(--red)' }}>▲ 18%</span> this week. Pause bottom 10% MCATs.</div>
                  <button className="btn btn-p" style={{ width: '100%', padding: '6px 0', fontSize: '12px' }}>Review Bottom MCATs</button>
                </div>
                <div className="hyg-action warn" style={{ paddingBottom: '15px' }}>
                  <div className="hyg-action-tag" style={{ color: 'var(--amber)' }}>Warning</div>
                  <div className="hyg-action-title">Budget Under-utilization</div>
                  <div className="hyg-action-body" style={{ marginBottom: '10px' }}>Only using 65% of daily budget. Increase bids on top performing PMCATs.</div>
                  <button className="btn" style={{ width: '100%', padding: '6px 0', fontSize: '12px', border: '1px solid var(--bdr2)', background: 'transparent', color: 'var(--fg)' }}>Adjust Bids</button>
                </div>
              </div>
            </div>
          </div>

          {/* Focus Charts Panel */}
          {(pmcatKey !== 'all' || mcatKey !== 'all') && (
            <div id="filter-panel">
              <div className="sh">
                <h2 id="filter-panel-title">{mcatKey !== 'all' ? 'MCAT Focus Analysis' : 'PMCAT Focus Analysis'}</h2>
              </div>
              <div className="cg">
                <div className="cc">
                  <div className="ct">PMCAT BL Bucket Distribution</div>
                  <div className="cs">Latest week — PMCATs by BL count</div>
                  <ChartComponent type="bar" data={pmcatBktData} />
                </div>
                <div className="cc">
                  <div className="ct">Coverage % Trend</div>
                  <div className="cs">vs 80% target</div>
                  <ChartComponent type="line" data={pmcatCovTrendData} />
                </div>
                <div className="cc">
                  <div className="ct">Product Click Buckets</div>
                  <div className="cs">0 clicks · 1-10 · &gt;10 clicks</div>
                  <ChartComponent type="bar" data={clickBktData} />
                </div>
                <div className="cc">
                  <div className="ct">Unique Product Count Weekly</div>
                  <div className="cs">Products active in feed</div>
                  <ChartComponent type="line" data={prodCntTrendData} />
                </div>
              </div>
            </div>
          )}

          <div className="sh">
            <h2>Campaign Trends <span>Over {campaign.weeks.length} weeks</span></h2>
          </div>
          <div className="cg">
            <div className="cc w">
              <div className="ct">BL Approved — Weekly Trend</div>
              <div className="cs">Weekly BL vs Best Ever (dotted)</div>
              <ChartComponent type="line" data={blTrendData} />
            </div>
            <div className="cc">
              <div className="ct">Cost / BL (₹)</div>
              <ChartComponent type="line" data={costBlTrendData} />
            </div>
            <div className="cc">
              <div className="ct">Weekly Spend (₹K)</div>
              <ChartComponent type="bar" data={spendTrendData} />
            </div>
          </div>

          <div className="cg">
            <div className="cc w">
              <div className="ct">Impressions & Clicks — Weekly</div>
              <ChartComponent type="line" data={impClkData} options={{
                scales: {
                  y: { type: 'linear', display: true, position: 'left' },
                  y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } }
                }
              }} />
            </div>
            <div className="cc">
              <div className="ct">CTR Weekly (%)</div>
              <ChartComponent type="line" data={ctrTrendData} />
            </div>
            <div className="cc">
              <div className="ct">Avg CPC (₹)</div>
              <ChartComponent type="line" data={cpcTrendData} />
            </div>
          </div>

          <div className="cg">
            <div className="cc">
              <div className="ct">Conversions Weekly</div>
              <ChartComponent type="line" data={convTrendData} />
            </div>
            <div className="cc">
              <div className="ct">Cost / Conversion (₹)</div>
              <ChartComponent type="line" data={costConvTrendData} />
            </div>
            <div className="cc">
              <div className="ct">Transaction % Weekly</div>
              <ChartComponent type="line" data={txnPctTrendData} />
            </div>
            <div className="cc">
              <div className="ct">Budget Utilisation (%)</div>
              <ChartComponent type="line" data={budgetUtilData} />
            </div>
          </div>

          {/* Data Table */}
          <div className="sh">
            <h2>Weekly Performance Data <span>Full history</span></h2>
          </div>
          <div className="tw cc">
            <table className="dt">
              <thead>
                <tr>
                  <th>Week</th>
                  <th className="num">BL Approved</th>
                  <th className="num">Cost / BL</th>
                  <th className="num">Spend (K)</th>
                  <th className="num">Impr (L)</th>
                  <th className="num">Clicks</th>
                  <th className="num">CTR %</th>
                  <th className="num">CPC</th>
                </tr>
              </thead>
              <tbody>
                {campaign.weeks.map((w: string, i: number) => (
                  <tr key={w}>
                    <td style={{ color: i === campaign.weeks.length - 1 ? 'var(--teal)' : 'var(--muted)' }}>{w}</td>
                    <td className="num hi">{Math.round(campaign.bl[i] * scale).toLocaleString()}</td>
                    <td className="num">₹{campaign.costBL[i]}</td>
                    <td className="num">₹{(campaign.spend[i] * scale).toFixed(1)}K</td>
                    <td className="num">{(campaign.impr[i] * scale).toFixed(1)}L</td>
                    <td className="num">{Math.round(campaign.clicks[i] * scale)}</td>
                    <td className="num">{campaign.ctr[i]}%</td>
                    <td className="num">₹{campaign.cpc[i]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {period === 'daily' && (
        <div id="daily-content">
          <div className="alert alert-info" style={{ marginBottom: '20px' }}>
            <strong>Daily Cockpit:</strong> Real-time Redshift connection active. Data reflects last 24 hours.
          </div>
          
          {loadingDaily && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--teal)' }}>
              <div style={{ fontSize: '30px', marginBottom: '10px' }}>⏳</div>
              <h3>Querying Redshift cluster...</h3>
            </div>
          )}
          
          {dailyError && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--red)' }}>
              <div style={{ fontSize: '30px', marginBottom: '10px' }}>❌</div>
              <h3>Error connecting to database</h3>
              <p>{dailyError}</p>
            </div>
          )}
          
          {!loadingDaily && !dailyError && (() => {
            const currentDaily = dailyData.find(d => d.glcat_grp_name?.toLowerCase().includes(campaign.name.split(' ')[0].toLowerCase())) || { bl_approved: 0, bl_sold: 0, trans: 0, blni: 0 };
            
            return (
              <>
                <div className="banner" style={{ marginBottom: '18px' }}>
                  <div className="bn-left">
                    <div style={{ fontSize: '24px' }}>⚡</div>
                    <div>
                      <div className="bn-title" style={{ color: campaign.color }}>
                        {campaign.name}
                      </div>
                      <div className="bn-sub">Live 24h Snapshot · Redshift DWH</div>
                    </div>
                  </div>
                  <div className="bn-stats">
                    <div><div className="bn-val" style={{ color: campaign.color }}>{currentDaily.bl_approved.toLocaleString()}</div><div className="bn-lbl">BL Approved</div></div>
                    <div><div className="bn-val" style={{ color: 'var(--teal)' }}>{currentDaily.bl_sold.toLocaleString()}</div><div className="bn-lbl">BL Sold</div></div>
                    <div><div className="bn-val" style={{ color: 'var(--green)' }}>{currentDaily.trans.toLocaleString()}</div><div className="bn-lbl">Transactions</div></div>
                    <div><div className="bn-val" style={{ color: 'var(--red)' }}>{currentDaily.blni.toLocaleString()}</div><div className="bn-lbl">BL Rejected</div></div>
                  </div>
                </div>

                <div className="sh">
                  <h2>Live KPIs <span>Performance over last 24h</span></h2>
                </div>
                <div className="kg">
                  <div className="kc best">
                    <div className="kl">BL Approved</div>
                    <div className="kv">{currentDaily.bl_approved.toLocaleString()}</div>
                    <span className="badge up">Live</span>
                  </div>
                  <div className="kc">
                    <div className="kl">BL Sold</div>
                    <div className="kv">{currentDaily.bl_sold.toLocaleString()}</div>
                    <span className="badge neu">Live</span>
                  </div>
                  <div className="kc best">
                    <div className="kl">Transactions</div>
                    <div className="kv">{currentDaily.trans.toLocaleString()}</div>
                    <span className="badge up">Live</span>
                  </div>
                  <div className="kc">
                    <div className="kl">BL Rejected (BLNI)</div>
                    <div className="kv">{currentDaily.blni.toLocaleString()}</div>
                    <span className="badge down">Live</span>
                  </div>
                </div>

                <div className="sh">
                  <h2>Campaign Diagnostics <span>Recommended Actions</span></h2>
                </div>
                <div className="cg" style={{ gridTemplateColumns: '2fr 1fr', marginBottom: '25px' }}>
                  <div className="cc" style={{ gridColumn: 'span 1' }}>
                    <div className="ct">Daily Funnel Metrics</div>
                    <div className="cs">Approved → Sold → Transacted</div>
                    <ChartComponent type="bar" height={300} data={{
                      labels: ['BL Approved', 'BL Sold', 'Transactions', 'Rejected'],
                      datasets: [{
                        label: 'Volume',
                        data: [currentDaily.bl_approved, currentDaily.bl_sold, currentDaily.trans, currentDaily.blni],
                        backgroundColor: [campaign.color, 'var(--teal)', 'var(--green)', 'var(--red)'],
                        borderRadius: 4
                      }]
                    }} />
                  </div>
                  <div className="cc" style={{ gridColumn: 'span 1' }}>
                    <div className="ct">Recommended Actions</div>
                    <div className="cs">Fix these to improve daily efficiency</div>
                    <div className="hyg-actions" style={{ marginTop: '10px' }}>
                      <div className="hyg-action">
                        <div className="hyg-action-tag" style={{ color: 'var(--red)' }}>Critical</div>
                        <div className="hyg-action-title">High Rejection Rate</div>
                        <div className="hyg-action-body">High volume of BLNI detected today. Check lead quality sources immediately.</div>
                        <button className="btn btn-p" style={{ marginTop: '10px', width: '100%', padding: '6px 0', fontSize: '12px' }}>Audit Lead Quality</button>
                      </div>
                      <div className="hyg-action warn" style={{ marginTop: '15px' }}>
                        <div className="hyg-action-tag" style={{ color: 'var(--amber)' }}>Warning</div>
                        <div className="hyg-action-title">Low Sold to Transaction Ratio</div>
                        <div className="hyg-action-body">Conversion from Sold to Transacted is trailing. Review pricing strategy.</div>
                        <button className="btn" style={{ marginTop: '10px', width: '100%', padding: '6px 0', fontSize: '12px', border: '1px solid var(--bdr2)', background: 'transparent', color: 'var(--fg)' }}>Review Pricing</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sh">
                  <h2>All Campaigns Matrix <span>Live comparison</span></h2>
                </div>
                <div className="tw cc">
                  <table className="dt">
                    <thead>
                      <tr>
                        <th>Category Group</th>
                        <th className="num">BL Approved</th>
                        <th className="num">BL Sold</th>
                        <th className="num">Transactions</th>
                        <th className="num">BL Rejected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyData.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ color: row.glcat_grp_name?.toLowerCase().includes(campaign.name.split(' ')[0].toLowerCase()) ? 'var(--teal)' : 'inherit' }}>
                            {row.glcat_grp_name}
                          </td>
                          <td className="num hi">{row.bl_approved.toLocaleString()}</td>
                          <td className="num">{row.bl_sold.toLocaleString()}</td>
                          <td className="num">{row.trans.toLocaleString()}</td>
                          <td className="num bd">{row.blni.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {period === 'monthly' && (
        <div id="monthly-content">
          {/* Banner */}
          <div className="banner" style={{ marginBottom: '18px' }}>
            <div className="bn-left">
              <div style={{ fontSize: '24px' }}>📈</div>
              <div>
                <div className="bn-title" style={{ color: campaign.color }}>
                  {campaign.name} {mcatKey !== 'all' ? ` — ${mcats[mcatKey]}` : (pmcatKey !== 'all' ? ` — ${pmcats[pmcatKey].name}` : '')}
                </div>
                <div className="bn-sub">Latest Month Snapshot · Budget: {campaign.budget}</div>
              </div>
            </div>
            <div className="bn-stats">
              <div><div className="bn-val" style={{ color: campaign.color }}>{scaledData.bl.toLocaleString()}</div><div className="bn-lbl">Latest BL</div></div>
              <div><div className="bn-val" style={{ color: campaign.color }}>₹{scaledData.costBL}</div><div className="bn-lbl">Cost/BL</div></div>
              <div><div className="bn-val" style={{ color: 'var(--green)' }}>{campaign.delta.bl}</div><div className="bn-lbl">vs LM</div></div>
              <div><div className="bn-val" style={{ color: 'var(--teal)' }}>{scaledData.blBest.toLocaleString()}</div><div className="bn-lbl">Best Ever</div></div>
            </div>
          </div>

          {/* Live Monthly Redshift Snapshot */}
          {loadingMonthly && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--teal)' }}>
              <div style={{ fontSize: '30px', marginBottom: '10px' }}>⏳</div>
              <h3>Querying Redshift cluster (Monthly)...</h3>
            </div>
          )}
          {monthlyError && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--red)' }}>
              <div style={{ fontSize: '30px', marginBottom: '10px' }}>❌</div>
              <h3>Error connecting to database</h3>
              <p>{monthlyError}</p>
            </div>
          )}
          {!loadingMonthly && !monthlyError && monthlyData.length > 0 && (() => {
            const currentMonthly = monthlyData.find(d => d.glcat_grp_name?.toLowerCase().includes(campaign.name.split(' ')[0].toLowerCase())) || { bl_approved: 0, bl_sold: 0, trans: 0, blni: 0 };
            return (
              <div style={{ marginBottom: '40px', padding: '20px', background: 'var(--bg2)', borderRadius: '8px', border: '1px solid var(--tdim)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '18px', color: 'var(--fg)', margin: 0 }}>⚡ Live MTD Performance <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--dim)', marginLeft: '10px' }}>Redshift DWH</span></h2>
                </div>
                
                <div className="kg">
                  <div className="kc best">
                    <div className="kl">BL Approved (MTD)</div>
                    <div className="kv">{currentMonthly.bl_approved.toLocaleString()}</div>
                    <span className="badge up">Live</span>
                  </div>
                  <div className="kc">
                    <div className="kl">BL Sold (MTD)</div>
                    <div className="kv">{currentMonthly.bl_sold.toLocaleString()}</div>
                    <span className="badge neu">Live</span>
                  </div>
                  <div className="kc best">
                    <div className="kl">Transactions (MTD)</div>
                    <div className="kv">{currentMonthly.trans.toLocaleString()}</div>
                    <span className="badge up">Live</span>
                  </div>
                  <div className="kc">
                    <div className="kl">BL Rejected (MTD)</div>
                    <div className="kv">{currentMonthly.blni.toLocaleString()}</div>
                    <span className="badge down">Live</span>
                  </div>
                </div>

                <div className="cg" style={{ gridTemplateColumns: '2fr 1fr', marginTop: '20px' }}>
                  <div className="cc" style={{ gridColumn: 'span 1' }}>
                    <div className="ct">MTD Funnel Metrics</div>
                    <div className="cs">Approved → Sold → Transacted</div>
                    <ChartComponent type="bar" height={300} data={{
                      labels: ['BL Approved', 'BL Sold', 'Transactions', 'Rejected'],
                      datasets: [{
                        label: 'Volume (Month-to-Date)',
                        data: [currentMonthly.bl_approved, currentMonthly.bl_sold, currentMonthly.trans, currentMonthly.blni],
                        backgroundColor: [campaign.color, 'var(--teal)', 'var(--green)', 'var(--red)'],
                        borderRadius: 4
                      }]
                    }} />
                  </div>
                  <div className="cc" style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column' }}>
                    <div className="ct">Diagnostics</div>
                    <div className="cs">Monthly insights</div>
                    <div className="hyg-actions" style={{ flexGrow: 1, marginTop: '10px' }}>
                      <div className="hyg-action warn">
                        <div className="hyg-action-tag" style={{ color: 'var(--amber)' }}>Review</div>
                        <div className="hyg-action-title">Monthly Drop-off</div>
                        <div className="hyg-action-body">Conversion from Approved to Sold is low this month. Review pricing.</div>
                        <button className="btn btn-p" style={{ marginTop: '10px', width: '100%', padding: '6px 0', fontSize: '12px' }}>Check Pricing Strategy</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* KPI Cards Grid */}
          <div className="sh">
            <h2>All KPIs & Diagnostics <span>Latest month snapshot</span></h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px', alignItems: 'start', marginBottom: '25px' }}>
            <div className="kg" style={{ marginBottom: 0 }}>
            <div className={`kc ${campaign.bl[campaign.weeks.length - 1] === campaign.blBest ? 'best' : ''}`}>
              <div className="kl">BL Approved</div>
              <div className="kv">{scaledData.bl.toLocaleString()}</div>
              <span className={`badge ${getBadgeClass(campaign.delta.bl)}`}>{campaign.delta.bl}</span>
              <div className="ks">Best: {scaledData.blBest.toLocaleString()}</div>
            </div>
            <div className={`kc ${campaign.costBL[campaign.weeks.length - 1] === campaign.costBLBest ? 'best' : ''}`}>
              <div className="kl">Cost / BL</div>
              <div className="kv">₹{scaledData.costBL.toFixed(1)}</div>
              <span className={`badge ${getBadgeClass(campaign.delta.costBL, true)}`}>{campaign.delta.costBL}</span>
              <div className="ks">Best: ₹{campaign.costBLBest}</div>
            </div>
            <div className="kc">
              <div className="kl">Monthly Spend</div>
              <div className="kv">₹{scaledData.spend.toFixed(1)}K</div>
              <span className={`badge ${getBadgeClass(campaign.delta.spend, true)}`}>{campaign.delta.spend}</span>
            </div>
            <div className="kc">
              <div className="kl">Impressions</div>
              <div className="kv">{(campaign.impr[campaign.weeks.length - 1] * scale).toFixed(1)}M</div>
              <span className="badge neu">Latest</span>
            </div>
            <div className="kc">
              <div className="kl">Clicks</div>
              <div className="kv">{(campaign.clicks[campaign.weeks.length - 1] * scale).toFixed(1)}K</div>
              <span className="badge neu">Latest</span>
            </div>
            <div className="kc">
              <div className="kl">CTR</div>
              <div className="kv">{campaign.ctr[campaign.weeks.length - 1].toFixed(2)}%</div>
              <span className={`badge ${getBadgeClass(campaign.delta.ctr)}`}>{campaign.delta.ctr}</span>
            </div>
            <div className="kc">
              <div className="kl">Avg CPC</div>
              <div className="kv">₹{campaign.cpc[campaign.weeks.length - 1].toFixed(2)}</div>
              <span className={`badge ${getBadgeClass(campaign.delta.cpc, true)}`}>{campaign.delta.cpc}</span>
            </div>
            <div className="kc">
              <div className="kl">Conversions</div>
              <div className="kv">{Math.round(campaign.conv[campaign.weeks.length - 1] * scale).toLocaleString()}</div>
              <span className={`badge ${getBadgeClass(campaign.delta.conv)}`}>{campaign.delta.conv}</span>
            </div>
            <div className="kc">
              <div className="kl">Cost/Conv</div>
              <div className="kv">₹{campaign.costConv[campaign.weeks.length - 1].toFixed(1)}</div>
              <span className={`badge ${getBadgeClass(campaign.delta.costConv, true)}`}>{campaign.delta.costConv}</span>
            </div>
            <div className="kc">
              <div className="kl">PMCAT Coverage</div>
              <div className="kv">{campaign.pmcatCov[campaign.weeks.length - 1] != null ? campaign.pmcatCov[campaign.weeks.length - 1].toFixed(1) + '%' : 'N/A'}</div>
              <span className="badge neu">Latest</span>
              <div className="ks">Target: 80%</div>
            </div>
            <div className="kc">
              <div className="kl">Txn %</div>
              <div className="kv">{campaign.txnPct[campaign.weeks.length - 1].toFixed(1)}%</div>
              <span className="badge up">Latest</span>
            </div>
            <div className="kc">
              <div className="kl">Budget Used</div>
              <div className="kv">{campaign.budgetPct[campaign.weeks.length - 1] != null ? campaign.budgetPct[campaign.weeks.length - 1].toFixed(1) + '%' : 'N/A'}</div>
              <span className="badge neu">of {campaign.budget}</span>
            </div>
          </div>

            <div className="cc" style={{ margin: 0, height: '100%' }}>
              <div className="ct">Recommended Actions</div>
              <div className="cs">Fix these to improve campaign efficiency</div>
              <div className="hyg-actions" style={{ marginTop: '10px' }}>
                <div className="hyg-action" style={{ paddingBottom: '15px' }}>
                  <div className="hyg-action-tag" style={{ color: 'var(--red)' }}>Critical</div>
                  <div className="hyg-action-title">Cost per BL Surge</div>
                  <div className="hyg-action-body" style={{ marginBottom: '10px' }}>Cost/BL increased <span style={{ color: 'var(--red)' }}>▲ 18%</span> this month. Pause bottom 10% MCATs.</div>
                  <button className="btn btn-p" style={{ width: '100%', padding: '6px 0', fontSize: '12px' }}>Review Bottom MCATs</button>
                </div>
                <div className="hyg-action warn" style={{ paddingBottom: '15px' }}>
                  <div className="hyg-action-tag" style={{ color: 'var(--amber)' }}>Warning</div>
                  <div className="hyg-action-title">Budget Under-utilization</div>
                  <div className="hyg-action-body" style={{ marginBottom: '10px' }}>Only using 65% of daily budget. Increase bids on top performing PMCATs.</div>
                  <button className="btn" style={{ width: '100%', padding: '6px 0', fontSize: '12px', border: '1px solid var(--bdr2)', background: 'transparent', color: 'var(--fg)' }}>Adjust Bids</button>
                </div>
              </div>
            </div>
          </div>

          {/* Focus Charts Panel */}
          {(pmcatKey !== 'all' || mcatKey !== 'all') && (
            <div id="filter-panel">
              <div className="sh">
                <h2 id="filter-panel-title">{mcatKey !== 'all' ? 'MCAT Focus Analysis' : 'PMCAT Focus Analysis'}</h2>
              </div>
              <div className="cg">
                <div className="cc">
                  <div className="ct">PMCAT BL Bucket Distribution</div>
                  <div className="cs">Latest month — PMCATs by BL count</div>
                  <ChartComponent type="bar" data={pmcatBktData} />
                </div>
                <div className="cc">
                  <div className="ct">Coverage % Trend</div>
                  <div className="cs">vs 80% target</div>
                  <ChartComponent type="line" data={pmcatCovTrendData} />
                </div>
                <div className="cc">
                  <div className="ct">Product Click Buckets</div>
                  <div className="cs">0 clicks · 1-10 · &gt;10 clicks</div>
                  <ChartComponent type="bar" data={clickBktData} />
                </div>
                <div className="cc">
                  <div className="ct">Unique Product Count Monthly</div>
                  <div className="cs">Products active in feed</div>
                  <ChartComponent type="line" data={prodCntTrendData} />
                </div>
              </div>
            </div>
          )}

          <div className="sh">
            <h2>Campaign Trends <span>Over {campaign.weeks.length} months</span></h2>
          </div>
          <div className="cg">
            <div className="cc w">
              <div className="ct">BL Approved — Monthly Trend</div>
              <div className="cs">Monthly BL vs Best Ever (dotted)</div>
              <ChartComponent type="line" data={blTrendData} />
            </div>
            <div className="cc">
              <div className="ct">Cost / BL (₹)</div>
              <ChartComponent type="line" data={costBlTrendData} />
            </div>
            <div className="cc">
              <div className="ct">Monthly Spend (₹K)</div>
              <ChartComponent type="bar" data={spendTrendData} />
            </div>
          </div>

          <div className="cg">
            <div className="cc w">
              <div className="ct">Impressions & Clicks — Monthly</div>
              <ChartComponent type="line" data={impClkData} options={{
                scales: {
                  y: { type: 'linear', display: true, position: 'left' },
                  y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } }
                }
              }} />
            </div>
            <div className="cc">
              <div className="ct">CTR Monthly (%)</div>
              <ChartComponent type="line" data={ctrTrendData} />
            </div>
            <div className="cc">
              <div className="ct">Avg CPC (₹)</div>
              <ChartComponent type="line" data={cpcTrendData} />
            </div>
          </div>

          <div className="cg">
            <div className="cc">
              <div className="ct">Conversions Monthly</div>
              <ChartComponent type="line" data={convTrendData} />
            </div>
            <div className="cc">
              <div className="ct">Cost / Conversion (₹)</div>
              <ChartComponent type="line" data={costConvTrendData} />
            </div>
            <div className="cc">
              <div className="ct">Transaction % Monthly</div>
              <ChartComponent type="line" data={txnPctTrendData} />
            </div>
            <div className="cc">
              <div className="ct">Budget Utilisation (%)</div>
              <ChartComponent type="line" data={budgetUtilData} />
            </div>
          </div>

          {/* Data Table */}
          <div className="sh">
            <h2>Monthly Performance Data <span>Full history</span></h2>
          </div>
          <div className="tw cc">
            <table className="dt">
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="num">BL Approved</th>
                  <th className="num">Cost / BL</th>
                  <th className="num">Spend (K)</th>
                  <th className="num">Impr (L)</th>
                  <th className="num">Clicks</th>
                  <th className="num">CTR %</th>
                  <th className="num">CPC</th>
                </tr>
              </thead>
              <tbody>
                {campaign.weeks.map((w: string, i: number) => (
                  <tr key={w}>
                    <td style={{ color: i === campaign.weeks.length - 1 ? 'var(--teal)' : 'var(--muted)' }}>{w.replace('Week', 'Month')}</td>
                    <td className="num hi">{Math.round(campaign.bl[i] * scale).toLocaleString()}</td>
                    <td className="num">₹{campaign.costBL[i]}</td>
                    <td className="num">₹{(campaign.spend[i] * scale).toFixed(1)}K</td>
                    <td className="num">{(campaign.impr[i] * scale).toFixed(1)}L</td>
                    <td className="num">{Math.round(campaign.clicks[i] * scale)}</td>
                    <td className="num">{campaign.ctr[i]}%</td>
                    <td className="num">₹{campaign.cpc[i]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
