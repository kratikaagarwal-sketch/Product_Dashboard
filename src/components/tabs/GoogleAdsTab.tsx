"use client";

import React from 'react';
import ChartComponent from '../ChartComponent';
import { MN, M12 } from '@/lib/constants';

const C = { t: '#00cba4', b: '#4d9fff', g: '#3dd68c', r: '#ff6168', a: '#ffb547', p: '#a78bfa', d: '#4a6070' };

export default function GoogleAdsTab() {
  const impClkData = {
    labels: M12,
    datasets: [
      {
        label: 'Imp÷10M',
        data: MN.impr,
        borderColor: C.b,
        backgroundColor: C.b + '18',
        tension: 0.35,
        fill: true,
      },
      {
        label: 'Clk÷1M',
        data: MN.clicks,
        borderColor: C.t,
        backgroundColor: C.t + '18',
        tension: 0.35,
        fill: true,
      }
    ]
  };

  const ctrData = {
    labels: M12,
    datasets: [
      {
        label: 'CTR%',
        data: MN.ctr,
        borderColor: C.g,
        borderWidth: 2,
        tension: 0.35,
        fill: false,
      }
    ]
  };

  return (
    <div className="tab on">
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
            {M12.map((m, i) => (
              <tr key={m}>
                <td style={{ color: i === 11 ? 'var(--teal)' : 'var(--muted)', fontWeight: i === 11 ? 700 : 400 }}>{m}</td>
                <td className="num">{MN.impr[i].toFixed(1)}Cr</td>
                <td className="num">{MN.clicks[i].toFixed(1)}L</td>
                <td className="num">{MN.ctr[i].toFixed(2)}%</td>
                <td className="num">₹{MN.cpc[i].toFixed(2)}</td>
                <td className="num">{MN.conv[i].toFixed(0)}K</td>
                <td className="num">₹{MN.spend[i].toFixed(1)}L</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
