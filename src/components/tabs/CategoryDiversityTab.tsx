"use client";

import React from 'react';
import ChartComponent from '../ChartComponent';
import { CD, CDW } from '@/lib/constants';

const C = { t: '#00cba4', b: '#4d9fff', g: '#3dd68c', r: '#ff6168', a: '#ffb547', p: '#a78bfa', d: '#4a6070' };

export default function CategoryDiversityTab() {
  const pmcatCovData = {
    labels: CDW.slice(0, CD.pmcatCov.length),
    datasets: [
      { label: 'PMCAT Cov%', data: CD.pmcatCov, borderColor: C.b, backgroundColor: C.b + '18', fill: true, tension: 0.35 },
      { label: 'Target 80%', data: Array(CD.pmcatCov.length).fill(80), borderColor: C.r, borderWidth: 1.5, borderDash: [6, 3], pointRadius: 0, fill: false }
    ]
  };

  const pmcatCntData = {
    labels: CDW.slice(0, CD.pmcatRun.length),
    datasets: [
      { label: 'PMCAT Running', data: CD.pmcatRun, backgroundColor: C.t + 'cc', borderRadius: 4 },
      { label: 'PMCATs >25BL', data: CD.pmcat25bl, backgroundColor: C.b + 'cc', borderRadius: 4 },
    ]
  };

  return (
    <div className="tab on">
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px', alignItems: 'start', marginBottom: '25px' }}>
        <div className="kg" style={{ marginBottom: 0 }}>
        <div className="kc">
          <div className="kl">PMCAT Coverage</div>
          <div className="kv">31.4%</div>
          <div className="badge down">▼ 4.5%</div>
          <div className="ks">Gap to target: 48.6%</div>
        </div>
        <div className="kc">
          <div className="kl">MCAT Coverage</div>
          <div className="kv">21.9%</div>
          <div className="badge down">▼ 12.3%</div>
          <div className="ks">Needs urgent focus</div>
        </div>
        <div className="kc">
          <div className="kl">PMCATs Running</div>
          <div className="kv">2,959</div>
          <div className="badge down">▼ 0.2%</div>
          <div className="ks">Stable count</div>
        </div>
          <div className="kc">
            <div className="kl">MCATs Running</div>
            <div className="kv">10,583</div>
            <div className="badge up">▲ 14.5%</div>
            <div className="ks">Volume increasing</div>
          </div>
        </div>

        <div className="cc" style={{ margin: 0, height: '100%' }}>
          <div className="ct">Recommended Actions</div>
          <div className="cs">Improve PMCAT diversity</div>
          <div className="hyg-actions" style={{ marginTop: '10px' }}>
            <div className="hyg-action" style={{ paddingBottom: '15px' }}>
              <div className="hyg-action-tag" style={{ color: 'var(--red)' }}>Critical</div>
              <div className="hyg-action-title">Low PMCAT Coverage</div>
              <div className="hyg-action-body" style={{ marginBottom: '10px' }}>Coverage is only 31.4% (Gap: 48.6%). Add missing high-intent PMCATs.</div>
              <button className="btn btn-p" style={{ width: '100%', padding: '6px 0', fontSize: '12px' }}>Add PMCATs</button>
            </div>
            <div className="hyg-action warn" style={{ paddingBottom: '15px' }}>
              <div className="hyg-action-tag" style={{ color: 'var(--amber)' }}>Warning</div>
              <div className="hyg-action-title">MCAT Coverage Drop</div>
              <div className="hyg-action-body" style={{ marginBottom: '10px' }}>MCAT coverage fell 12.3%. Expand targeting on existing PMCATs.</div>
              <button className="btn" style={{ width: '100%', padding: '6px 0', fontSize: '12px', border: '1px solid var(--bdr2)', background: 'transparent', color: 'var(--fg)' }}>Expand MCATs</button>
            </div>
          </div>
        </div>
      </div>

      <div className="sh">
        <h2>PMCAT Analysis <span>Coverage vs Capacity</span></h2>
      </div>
      <div className="cg">
        <div className="cc">
          <div className="ct">PMCAT Coverage % Trend</div>
          <div className="cs">Steady gap below 80% benchmark</div>
          <ChartComponent type="line" data={pmcatCovData} />
        </div>
        <div className="cc">
          <div className="ct">PMCAT Count Breakdown</div>
          <div className="cs">Running PMCATs vs High-volume ones</div>
          <ChartComponent type="bar" data={pmcatCntData} />
        </div>
      </div>

      <div className="sh">
        <h2>Diversity Buckets <span>Leads per category</span></h2>
      </div>
      <div className="cg">
        <div className="cc">
          <div className="ct">PMCAT BL Bucket Distribution</div>
          <div className="cs">Most PMCATs in low-volume bracket</div>
          <ChartComponent type="bar" data={{
            labels: ['0 to <5 BL', '5 to <26 BL', '26-100 BL', '100-200 BL', '200-400 BL', '≥400 BL'],
            datasets: [{ data: [1076, 952, 666, 186, 69, 9], backgroundColor: [C.r + 'cc', C.a + 'cc', C.b + 'cc', C.t + 'cc', C.g + 'cc', C.p + 'cc'], borderRadius: 4 }]
          }} />
        </div>
        <div className="cc">
          <div className="ct">MCAT BL Bucket Distribution</div>
          <div className="cs">Significant tail of 0-3 BL MCATs</div>
          <ChartComponent type="bar" data={{
            labels: ['0-3 BL', '3-10 BL', '10-50 BL', '50-100 BL', '≥100 BL'],
            datasets: [{ data: [5767, 2499, 1761, 503, 53], backgroundColor: [C.r + 'cc', C.a + 'cc', C.b + 'cc', C.t + 'cc', C.g + 'cc'], borderRadius: 4 }]
          }} />
        </div>
      </div>
    </div>
  );
}
