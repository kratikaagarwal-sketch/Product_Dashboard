"use client";

import React from 'react';
import ChartComponent from '../ChartComponent';
import { HYG, HYGW } from '@/lib/constants';

const C = { t: '#00cba4', b: '#4d9fff', g: '#3dd68c', r: '#ff6168', a: '#ffb547', p: '#a78bfa', d: '#4a6070' };

export default function HygieneTab() {
  const hygMainData = {
    labels: HYGW,
    datasets: [
      { label: 'MC Eligible', data: HYG.eligMC, backgroundColor: C.g + 'cc', borderRadius: 4 },
      { label: 'GA Eligible', data: HYG.eligGA, backgroundColor: C.b + 'cc', borderRadius: 4 },
      { label: 'Not Eligible', data: HYG.notElig, backgroundColor: C.r + 'cc', borderRadius: 4 },
      { label: 'Paused', data: HYG.paused, backgroundColor: C.a + 'cc', borderRadius: 4 },
    ]
  };

  const apprRateData = {
    labels: HYGW,
    datasets: [
      {
        label: 'Approval%',
        data: HYG.apprRate,
        borderColor: C.t,
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
          <div className="kl">MC Eligible</div>
          <div className="kv">1,66,101</div>
          <div className="badge up">▲ 1.37%</div>
          <div className="ks">Approval: 97.3%</div>
        </div>
        <div className="kc">
          <div className="kl">Ads Eligible</div>
          <div className="kv">1,15,828</div>
          <div className="badge up">▲ 4.49%</div>
          <div className="ks">Approval: 67.8%</div>
        </div>
        <div className="kc">
          <div className="kl">Paused Prods</div>
          <div className="kv">9,288</div>
          <div className="badge down" style={{ background: 'var(--gdim)', color: 'var(--green)' }}>▼ 1.6%</div>
          <div className="ks">Slight improvement</div>
        </div>
        <div className="kc">
          <div className="kl">MC Approval Rate</div>
          <div className="kv">97.27%</div>
          <div className="badge down">▼ 0.3%</div>
          <div className="ks">Target: 99%</div>
        </div>
      </div>

      <div className="sh">
        <h2>Intelligence Cockpit <span>Urgent actions identified</span></h2>
      </div>
      <div className="hygiene-grid">
        <div className="cc" style={{ gridColumn: 'span 1' }}>
          <div className="ct">Feed Health Mix</div>
          <div className="cs">Eligibility across 4 weeks</div>
          <ChartComponent type="bar" data={hygMainData} />
        </div>
        <div className="cc" style={{ gridColumn: 'span 1' }}>
          <div className="ct">Recommended Actions</div>
          <div className="cs">Fix these to improve performance</div>
          <div className="hyg-actions" style={{ marginTop: '10px' }}>
            <div className="hyg-action">
              <div className="hyg-action-tag">Critical</div>
              <div className="hyg-action-title">81K Low CTR Products</div>
              <div className="hyg-action-body">Surged <span style={{ color: 'var(--red)' }}>▲ 8.87%</span>. Check image quality and price competitiveness.</div>
            </div>
            <div className="hyg-action warn">
              <div className="hyg-action-tag">Warning</div>
              <div className="hyg-action-title">Price Mismatch (409)</div>
              <div className="hyg-action-body">Big improvement <span style={{ color: 'var(--green)' }}>▼ 36.3%</span>, but still impacting 400+ high-traffic MCATs.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="sh">
        <h2>Approval Trends <span>Merchant Center health</span></h2>
      </div>
      <div className="cg">
        <div className="cc w">
          <div className="ct">MC Approval Rate %</div>
          <div className="cs">Weekly trend — aiming for 99% baseline</div>
          <ChartComponent type="line" data={apprRateData} height={200} />
        </div>
      </div>
    </div>
  );
}
