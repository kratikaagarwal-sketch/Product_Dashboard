"use client";

import React from 'react';
import ChartComponent from '../ChartComponent';

const C = { t: '#00cba4', b: '#4d9fff', g: '#3dd68c', r: '#ff6168', a: '#ffb547', p: '#a78bfa', d: '#4a6070' };

export default function HygieneTab() {
  const weeks = ['Mar 29-Apr 4', 'Apr 5-11', 'Apr 12-18', 'Apr 19-25'];
  
  const hygMainData = {
    labels: weeks,
    datasets: [
      { label: 'MC Eligible', data: [162746, 163904, 163859, 166101], backgroundColor: C.g + 'cc', borderRadius: 4 },
      { label: 'GA Eligible', data: [109732, 107495, 110850, 115828], backgroundColor: C.b + 'cc', borderRadius: 4 },
      { label: 'Not Eligible', data: [57227, 59757, 57710, 54974], backgroundColor: C.r + 'cc', borderRadius: 4 },
      { label: 'Paused', data: [5885, 11694, 9440, 9288], backgroundColor: C.a + 'cc', borderRadius: 4 },
    ]
  };

  const apprRateData = {
    labels: weeks,
    datasets: [
      {
        label: 'MC Approval %',
        data: [97.51, 98.00, 97.58, 97.27],
        borderColor: C.t,
        borderWidth: 2,
        tension: 0.35,
        fill: false,
      },
      {
        label: 'Google Ads Approval %',
        data: [65.72, 64.27, 65.76, 67.81],
        borderColor: C.b,
        borderWidth: 2,
        tension: 0.35,
        fill: false,
      }
    ]
  };

  const costConvData = {
    labels: ['< ₹50', '₹50-₹75', '₹75-₹100', '₹100-₹125', '> ₹125'],
    datasets: [
      {
        label: 'Products Count',
        data: [163197, 2454, 1542, 986, 2685],
        backgroundColor: [C.g + 'cc', C.b + 'cc', C.a + 'cc', C.p + 'cc', C.r + 'cc'],
        borderRadius: 4
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
          <div className="ks">Approval: 97.27%</div>
        </div>
        <div className="kc">
          <div className="kl">Ads Eligible</div>
          <div className="kv">1,15,828</div>
          <div className="badge up">▲ 4.49%</div>
          <div className="ks">Approval: 67.81%</div>
        </div>
        <div className="kc">
          <div className="kl">Paused Prods</div>
          <div className="kv">9,288</div>
          <div className="badge down" style={{ background: 'var(--gdim)', color: 'var(--green)' }}>▼ 1.61%</div>
          <div className="ks">Slight improvement</div>
        </div>
        <div className="kc">
          <div className="kl">Not Eligible</div>
          <div className="kv">54,974</div>
          <div className="badge down" style={{ background: 'var(--gdim)', color: 'var(--green)' }}>▼ 4.74%</div>
          <div className="ks">Improved health</div>
        </div>
      </div>

      <div className="sh">
        <h2>Intelligence Cockpit <span>Urgent actions identified (Apr 19 - 25)</span></h2>
      </div>
      <div className="hygiene-grid">
        <div className="cc" style={{ gridColumn: 'span 1' }}>
          <div className="ct">Feed Health Mix</div>
          <div className="cs">Eligibility & Issues across 4 weeks</div>
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
              <div className="hyg-action-body">Big improvement <span style={{ color: 'var(--green)' }}>▼ 36.3%</span>, but still impacting high-traffic MCATs.</div>
            </div>
            <div className="hyg-action" style={{ borderLeftColor: 'var(--green)', background: 'var(--bg2)' }}>
              <div className="hyg-action-tag" style={{ background: 'var(--green)', color: '#000' }}>Success</div>
              <div className="hyg-action-title">1,63,197 Products with Cost/Conv &lt; ₹50</div>
              <div className="hyg-action-body">Increased by <span style={{ color: 'var(--green)' }}>▲ 1.94%</span>. Highly efficient campaign segment.</div>
            </div>
            <div className="hyg-action" style={{ borderLeftColor: 'var(--green)', background: 'var(--bg2)' }}>
              <div className="hyg-action-tag" style={{ background: 'var(--green)', color: '#000' }}>Success</div>
              <div className="hyg-action-title">9,799 High CTR (&gt;5%) Products</div>
              <div className="hyg-action-body">Top performers driving significant engagement and clicks.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="sh">
        <h2>Approval Trends & Costs <span>Merchant Center health</span></h2>
      </div>
      <div className="cg">
        <div className="cc w">
          <div className="ct">Approval Rate %</div>
          <div className="cs">Weekly trend — MC vs Google Ads Approval</div>
          <ChartComponent type="line" data={apprRateData} height={250} />
        </div>
        <div className="cc">
          <div className="ct">Cost/Conversion Buckets</div>
          <div className="cs">Count of products driving conversions</div>
          <ChartComponent type="bar" data={costConvData} height={250} />
        </div>
      </div>
    </div>
  );
}
