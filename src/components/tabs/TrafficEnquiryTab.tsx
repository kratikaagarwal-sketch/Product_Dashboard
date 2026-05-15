"use client";

import React, { useState, useEffect } from 'react';
import ChartComponent from '../ChartComponent';
import { MN, M12 } from '@/lib/constants';

const C = { t: '#00cba4', b: '#4d9fff', g: '#3dd68c', r: '#ff6168', a: '#ffb547', p: '#a78bfa', d: '#4a6070' };

const TIMEFRAMES = [
  { label: 'Monthly', gid: '376561276' },
  { label: 'Weekly', gid: '1549728297' },
  { label: 'Quarterly', gid: '791309001' },
  { label: 'Daily', gid: '745688658' }
];

export default function TrafficEnquiryTab() {
  const [gid, setGid] = useState('791309001'); // Default to Quarterly for Traffic
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetData, setSheetData] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard-data?gid=${gid}`)
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setSheetData(res.data);
          setError(null);
        } else {
          setError(res.error || 'Failed to fetch data');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [gid]);

  const safeExtract = (keyMatch: string[], fallback: number[]) => {
    if (!sheetData || sheetData.length === 0) return fallback;
    const firstRow = sheetData[0];
    const key = Object.keys(firstRow).find(k => keyMatch.some(m => k.toLowerCase().includes(m)));
    if (key) {
      return sheetData.map(r => r[key] || 0);
    }
    return fallback;
  };

  const labels = sheetData.length > 0 ? sheetData.map(r => Object.values(r)[0] as string) : M12;
  const visitsData = safeExtract(['visit', 'traffic'], MN.impr.map(v => v * 0.1));
  const uniqueData = safeExtract(['unique', 'user'], MN.impr.map(v => v * 0.08));
  
  const fenqData = safeExtract(['fenq', 'form', 'email'], [120, 110, 105, 95, 85, 80, 75, 70, 65, 60, 55, 50]);
  const callsData = safeExtract(['call', 'phone'], [450, 440, 460, 455, 470, 480, 475, 490, 500, 510, 520, 530]);

  const trafficData = {
    labels: labels,
    datasets: [
      { label: 'Visits (L)', data: visitsData, borderColor: C.b, fill: false, tension: 0.35 },
      { label: 'Unique (L)', data: uniqueData, borderColor: C.t, fill: false, tension: 0.35 },
    ]
  };

  const enquiryData = {
    labels: labels,
    datasets: [
      { label: 'FENQ', data: fenqData, borderColor: C.r, fill: false },
      { label: 'Calls', data: callsData, borderColor: C.g, fill: false },
    ]
  };

  return (
    <div className="tab on">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg2)', padding: '4px', borderRadius: '8px' }}>
          {TIMEFRAMES.map(tf => (
            <button 
              key={tf.gid}
              className={`pf-btn ${gid === tf.gid ? 'on' : ''}`}
              onClick={() => setGid(tf.gid)}
              style={{ padding: '6px 12px', border: 'none' }}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ width: '30px', height: '30px', border: '3px solid var(--bdr2)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ marginLeft: '12px', color: 'var(--muted)', fontSize: '14px' }}>Fetching Google Sheets Data...</span>
        </div>
      )}

      {error && !loading && (
        <div className="alert alert-warn" style={{ marginBottom: '20px' }}>
          <strong>Sheet Connection Error:</strong> {error}
        </div>
      )}

      {/* Enquiry Warning Alert */}
      <div className="alert alert-warn">
        <strong>Warning:</strong> Enquiry (FENQ) volume has declined by 65% over the last 12 months. Investigating channel shift to direct calls.
      </div>

      {/* Traffic Section Header */}
      <div className="sh" style={{ marginTop: '0' }}>
        <h2>Traffic Dynamics <span>GA session analysis</span></h2>
      </div>
      
      {/* Traffic KPIs */}
      <div className="kg">
        <div className="kc">
          <div className="kl">Total Visits</div>
          <div className="kv">4.5M</div>
          <div className="ks">Google Analytics Data</div>
        </div>
        <div className="kc">
          <div className="kl">Unique Visitors</div>
          <div className="kv">3.1M</div>
          <div className="ks">MTD Reach</div>
        </div>
        <div className="kc">
          <div className="kl">Bounce Rate</div>
          <div className="kv">42.5%</div>
          <div className="badge down" style={{ background: 'var(--gdim)', color: 'var(--green)' }}>▼ 2.1%</div>
          <div className="ks">Improved engagement</div>
        </div>
        <div className="kc">
          <div className="kl">Avg Session</div>
          <div className="kv">2m 45s</div>
          <div className="ks">Steady duration</div>
        </div>
      </div>

      {/* Traffic Diagnostics */}
      <div className="sh" style={{ marginTop: '20px' }}>
        <h2>Traffic Diagnostics <span>Recommended Actions</span></h2>
      </div>
      <div className="cg" style={{ gridTemplateColumns: '2fr 1fr', marginBottom: '25px' }}>
        <div className="cc" style={{ gridColumn: 'span 1' }}>
          <div className="ct">Visitor Growth Trend</div>
          <div className="cs">Correlation between visits and unique users</div>
          <ChartComponent type="line" data={trafficData} height={300} />
        </div>
        <div className="cc" style={{ gridColumn: 'span 1' }}>
          <div className="ct">Recommended Actions</div>
          <div className="cs">Fix these to improve traffic retention</div>
          <div className="hyg-actions" style={{ marginTop: '10px' }}>
            <div className="hyg-action">
              <div className="hyg-action-tag" style={{ color: 'var(--red)' }}>Critical</div>
              <div className="hyg-action-title">High Bounce Rate on Mobile</div>
              <div className="hyg-action-body">Mobile bounce rate hit <span style={{ color: 'var(--red)' }}>▲ 55%</span>. Investigate page load speed.</div>
            </div>
            <div className="hyg-action warn">
              <div className="hyg-action-tag" style={{ color: 'var(--amber)' }}>Warning</div>
              <div className="hyg-action-title">Direct Traffic Drop</div>
              <div className="hyg-action-body">Direct traffic dropped <span style={{ color: 'var(--red)' }}>▼ 8%</span>. Verify if tracking tags are firing correctly.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="sh" style={{ marginTop: '0' }}>
        <h2>Traffic Dynamics <span>GA session analysis</span></h2>
      </div>
      <div className="cg">
        <div className="cc">
          <div className="ct">Device Split</div>
          <div className="cs">Mobile vs Desktop vs Tablet</div>
          <ChartComponent type="doughnut" data={{
            labels: ['Mobile', 'Desktop', 'Tablet'],
            datasets: [{ data: [82, 15, 3], backgroundColor: [C.b, C.t, C.a] }]
          }} />
        </div>
        <div className="cc">
          <div className="ct">Traffic Sources</div>
          <div className="cs">Paid vs Organic vs Direct</div>
          <ChartComponent type="bar" data={{
            labels: ['Paid', 'Organic', 'Direct', 'Social', 'Referral'],
            datasets: [{ data: [65, 20, 10, 3, 2], backgroundColor: C.p + 'cc' }]
          }} />
        </div>
      </div>

      {/* Enquiry Section Header */}
      <div className="sh" style={{ marginTop: '20px' }}>
        <h2>Communication Trends <span>FENQ vs Phone calls</span></h2>
      </div>

      {/* Enquiry KPIs */}
      <div className="kg">
        <div className="kc">
          <div className="kl">Weekly FENQ</div>
          <div className="kv">1,245</div>
          <div className="badge down">▼ 8.4%</div>
          <div className="ks">vs last month</div>
        </div>
        <div className="kc">
          <div className="kl">Weekly Calls</div>
          <div className="kv">5,822</div>
          <div className="badge up">▲ 4.2%</div>
          <div className="ks">Phone leads rising</div>
        </div>
        <div className="kc">
          <div className="kl">Response Rate</div>
          <div className="kv">92%</div>
          <div className="ks">Within 24 hours</div>
        </div>
        <div className="kc">
          <div className="kl">Lead Quality</div>
          <div className="kv">High</div>
          <div className="ks">Verified sources</div>
        </div>
      </div>

      {/* Enquiry Charts */}
      <div className="cg">
        <div className="cc w">
          <div className="ct">Long-term Volume Shift</div>
          <div className="cs">Steady decline in FENQ vs steady rise in calls</div>
          <ChartComponent type="line" data={enquiryData} height={300} />
        </div>
        <div className="cc">
          <div className="ct">Enquiry Type Mix</div>
          <div className="cs">Email vs Form vs Click-to-Call</div>
          <ChartComponent type="doughnut" data={{
            labels: ['Form', 'Call', 'Email'],
            datasets: [{ data: [15, 80, 5], backgroundColor: [C.r, C.g, C.b] }]
          }} />
        </div>
      </div>
    </div>
  );
}
