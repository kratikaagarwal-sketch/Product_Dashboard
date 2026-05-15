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

export default function GoogleAdsTab() {
  const [gid, setGid] = useState('1549728297'); // Default to Weekly for Ads
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
  const imprData = safeExtract(['impr', 'impression'], MN.impr);
  const clicksData = safeExtract(['click', 'clk'], MN.clicks);
  const ctrDataArr = safeExtract(['ctr', 'click through'], MN.ctr);
  const cpcDataArr = safeExtract(['cpc', 'cost per click'], MN.cpc);
  const convDataArr = safeExtract(['conv', 'conversion'], MN.conv);
  const spendDataArr = safeExtract(['spend', 'cost', 'amount'], MN.spend);

  const impClkData = {
    labels: labels,
    datasets: [
      {
        label: 'Imp÷10M',
        data: imprData,
        borderColor: C.b,
        backgroundColor: C.b + '18',
        tension: 0.35,
        fill: true,
      },
      {
        label: 'Clk÷1M',
        data: clicksData,
        borderColor: C.t,
        backgroundColor: C.t + '18',
        tension: 0.35,
        fill: true,
      }
    ]
  };

  const ctrData = {
    labels: labels,
    datasets: [
      {
        label: 'CTR%',
        data: ctrDataArr,
        borderColor: C.g,
        borderWidth: 2,
        tension: 0.35,
        fill: false,
      }
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

      <div className="kg">
        <div className="kc">
          <div className="kl">Impressions</div>
          <div className="kv">45.3M</div>
          <div className="badge down">▼ 26.4%</div>
          <div className="ks">March snapshot</div>
        </div>
        <div className="kc">
          <div className="kl">Clicks</div>
          <div className="kv">1.19 L</div>
          <div className="badge down">▼ 16.9%</div>
          <div className="ks">Total weekly traffic</div>
        </div>
        <div className="kc">
          <div className="kl">CTR %</div>
          <div className="kv">2.62%</div>
          <div className="badge up">▲ 12.9%</div>
          <div className="ks">Ad quality score high</div>
        </div>
        <div className="kc">
          <div className="kl">Avg CPC</div>
          <div className="kv">₹1.75</div>
          <div className="badge down">▼ 0.5%</div>
          <div className="ks">Stable pricing</div>
        </div>
      </div>

      <div className="sh">
        <h2>Campaign Diagnostics <span>Recommended Actions</span></h2>
      </div>
      <div className="cg" style={{ gridTemplateColumns: '2fr 1fr', marginBottom: '25px' }}>
        <div className="cc" style={{ gridColumn: 'span 1' }}>
          <div className="ct">Impression vs Click Trend</div>
          <div className="cs">Correlation over 12 months</div>
          <ChartComponent type="line" data={impClkData} />
        </div>
        <div className="cc" style={{ gridColumn: 'span 1' }}>
          <div className="ct">Recommended Actions</div>
          <div className="cs">Fix these to improve ad performance</div>
          <div className="hyg-actions" style={{ marginTop: '10px' }}>
            <div className="hyg-action">
              <div className="hyg-action-tag" style={{ color: 'var(--red)' }}>Critical</div>
              <div className="hyg-action-title">High CPC Alert</div>
              <div className="hyg-action-body">Average CPC surged <span style={{ color: 'var(--red)' }}>▲ 12%</span> in 'Power Tools'. Review bidding strategy.</div>
            </div>
            <div className="hyg-action warn">
              <div className="hyg-action-tag" style={{ color: 'var(--amber)' }}>Warning</div>
              <div className="hyg-action-title">Low CTR Ad Groups</div>
              <div className="hyg-action-body">3 Ad Groups below <span style={{ color: 'var(--red)' }}>▼ 1.5%</span> CTR. Consider pausing underperforming creatives.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="cg">
        <div className="cc w">
          <div className="ct">Click-Through Rate (CTR)</div>
          <div className="cs">Percentage effectiveness of ads</div>
          <ChartComponent type="line" data={ctrData} height={250} />
        </div>
      </div>

      {/* Monthly Data Table */}
      <div className="sh">
        <h2>Performance Table <span>12-month raw data</span></h2>
      </div>
      <div className="tw cc">
        <table className="dt">
          <thead>
            <tr>
              <th>Month</th>
              <th className="num">Impr (Cr)</th>
              <th className="num">Clicks (L)</th>
              <th className="num">CTR %</th>
              <th className="num">CPC</th>
              <th className="num">Conv (K)</th>
              <th className="num">Spend (L)</th>
            </tr>
          </thead>
          <tbody>
            {labels.map((m, i) => (
              <tr key={m + i}>
                <td style={{ color: i === labels.length - 1 ? 'var(--teal)' : 'var(--muted)', fontWeight: i === labels.length - 1 ? 700 : 400 }}>{m}</td>
                <td className="num">{imprData[i] !== undefined ? imprData[i].toFixed(1) + 'Cr' : '-'}</td>
                <td className="num">{clicksData[i] !== undefined ? clicksData[i].toFixed(1) + 'L' : '-'}</td>
                <td className="num">{ctrDataArr[i] !== undefined ? ctrDataArr[i].toFixed(2) + '%' : '-'}</td>
                <td className="num">₹{cpcDataArr[i] !== undefined ? cpcDataArr[i].toFixed(2) : '-'}</td>
                <td className="num">{convDataArr[i] !== undefined ? convDataArr[i].toFixed(0) + 'K' : '-'}</td>
                <td className="num">₹{spendDataArr[i] !== undefined ? spendDataArr[i].toFixed(1) + 'L' : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
