"use client";

import React from 'react';
import ChartComponent from '../ChartComponent';
import { MN, M12 } from '@/lib/constants';

const C = { t: '#00cba4', b: '#4d9fff', g: '#3dd68c', r: '#ff6168', a: '#ffb547', p: '#a78bfa', d: '#4a6070' };

export default function BlTab() {
  const blTypeTrendData = {
    labels: M12,
    datasets: [
      { label: 'WhatsApp', data: MN.waBL, borderColor: C.t, fill: false, tension: 0.35 },
      { label: 'INTENT', data: MN.intBL, borderColor: C.b, fill: false, tension: 0.35 },
      { label: 'FLPNS', data: MN.flpBL, borderColor: C.p, fill: false, tension: 0.35 },
      { label: 'Direct', data: MN.dirBL, borderColor: C.a, fill: false, tension: 0.35 },
    ]
  };

  return (
    <div className="tab on">
      <div className="kg">
        <div className="kc best">
          <div className="kl">Total Leads</div>
          <div className="kv">6.03 L</div>
          <div className="badge up">▲ 3.8%</div>
          <div className="ks">March all-time high</div>
        </div>
        <div className="kc">
          <div className="kl">WhatsApp Leads</div>
          <div className="kv">2.45 L</div>
          <div className="badge up">▲ 7.0%</div>
          <div className="ks">40.7% of mix</div>
        </div>
        <div className="kc">
          <div className="kl">Intent Leads</div>
          <div className="kv">1.34 L</div>
          <div className="badge up">▲ 22.5%</div>
          <div className="ks">Fastest growing</div>
        </div>
        <div className="kc">
          <div className="kl">Conversion Rate</div>
          <div className="kv">2.8%</div>
          <div className="badge down">▼ 0.2%</div>
          <div className="ks">Lead-to-Txn</div>
        </div>
      </div>

      <div className="sh">
        <h2>Channel Diagnostics <span>Recommended Actions</span></h2>
      </div>
      <div className="cg" style={{ gridTemplateColumns: '2fr 1fr', marginBottom: '25px' }}>
        <div className="cc" style={{ gridColumn: 'span 1' }}>
          <div className="ct">Lead Source Trends</div>
          <div className="cs">WhatsApp, INTENT, FLPNS, and Direct</div>
          <ChartComponent type="line" data={blTypeTrendData} height={300} />
        </div>
        <div className="cc" style={{ gridColumn: 'span 1' }}>
          <div className="ct">Recommended Actions</div>
          <div className="cs">Optimize lead generation channels</div>
          <div className="hyg-actions" style={{ marginTop: '10px' }}>
            <div className="hyg-action">
              <div className="hyg-action-tag" style={{ color: 'var(--red)' }}>Critical</div>
              <div className="hyg-action-title">Drop in FLPNS Conversion</div>
              <div className="hyg-action-body">Conversion fell <span style={{ color: 'var(--red)' }}>▼ 15%</span> this week. Investigate lead quality.</div>
            </div>
            <div className="hyg-action warn">
              <div className="hyg-action-tag" style={{ color: 'var(--amber)' }}>Opportunity</div>
              <div className="hyg-action-title">WhatsApp Channel Surge</div>
              <div className="hyg-action-body">WhatsApp converting at 4.2%. Reallocate 10% budget to scale.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="sh">
        <h2>Channel Analysis <span>Lead source breakdown</span></h2>
      </div>
      <div className="cg">
        <div className="cc">
          <div className="ct">BL Type Mix (Current Month)</div>
          <div className="cs">Channel dominance visualization</div>
          <ChartComponent type="doughnut" data={{
            labels: ['WhatsApp', 'INTENT', 'FLPNS', 'Direct'],
            datasets: [{ data: [245739, 134468, 106191, 105584], backgroundColor: [C.t, C.b, C.p, C.a] }]
          }} />
        </div>
        <div className="cc">
          <div className="ct">Lead Quality Index</div>
          <div className="cs">Lead volume vs Transaction yield</div>
          <ChartComponent type="bar" data={{
            labels: M12,
            datasets: [{ label: 'Yield%', data: [1.2, 1.4, 1.3, 1.5, 1.4, 1.6, 1.5, 1.7, 1.8, 1.9, 2.0, 2.1], backgroundColor: C.g + 'cc' }]
          }} />
        </div>
      </div>
    </div>
  );
}
