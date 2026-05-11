"use client";

import React from 'react';
import ChartComponent from '../ChartComponent';
import { TOP_MCATS } from '@/lib/constants';

const C = { t: '#00cba4', b: '#4d9fff', g: '#3dd68c', r: '#ff6168', a: '#ffb547', p: '#a78bfa', d: '#4a6070' };

export default function McatMasterTab() {
  const masterFlagData = {
    labels: ['No Sale (0)', 'Low Txn', 'High', 'Medium', 'Low'],
    datasets: [{
      data: [78455, 8018, 7608, 2511, 1654],
      backgroundColor: [C.d + 'cc', C.r + 'cc', C.a + 'cc', C.b + 'cc', C.g + 'cc'],
      borderWidth: 2,
      borderColor: '#141a22',
    }]
  };

  const masterBlData = {
    labels: ['Mar29-Apr4', 'Apr5-11', 'Apr12-18', 'Apr19-25'],
    datasets: [{
      label: 'Avg BL/MCAT',
      data: [1.33, 1.26, 1.36, 1.24],
      backgroundColor: [C.t + 'cc', C.b + 'cc', C.g + 'cc', C.a + 'cc'],
      borderRadius: 5,
    }]
  };

  return (
    <div className="tab on">
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px', alignItems: 'start', marginBottom: '25px' }}>
        <div className="kg" style={{ marginBottom: 0 }}>
        <div className="kc">
          <div className="kl">Total MCATs</div>
          <div className="kv">98,246</div>
          <div className="ks">Git_input_combine.xlsx</div>
        </div>
        <div className="kc">
          <div className="kl">Performing MCATs</div>
          <div className="kv">11,773</div>
          <div className="badge up" style={{ background: 'var(--adim)', color: 'var(--amber)' }}>11.9%</div>
          <div className="ks">At least 1 sale (MTD)</div>
        </div>
        <div className="kc">
          <div className="kl">Avg BL / MCAT</div>
          <div className="kv">1.24</div>
          <div className="badge down">▼ 8.8%</div>
          <div className="ks">Latest week</div>
        </div>
          <div className="kc">
            <div className="kl">Max BL (Single)</div>
            <div className="kv">822</div>
            <div className="ks">Tent Air Cooler</div>
          </div>
        </div>

        <div className="cc" style={{ margin: 0, height: '100%' }}>
          <div className="ct">Recommended Actions</div>
          <div className="cs">Optimize MCAT catalog</div>
          <div className="hyg-actions" style={{ marginTop: '10px' }}>
            <div className="hyg-action" style={{ paddingBottom: '15px' }}>
              <div className="hyg-action-tag" style={{ color: 'var(--red)' }}>Critical</div>
              <div className="hyg-action-title">80% MCATs Have 0 Sales</div>
              <div className="hyg-action-body" style={{ marginBottom: '10px' }}>78K+ MCATs are generating no sales. Consider pausing non-performing items.</div>
              <button className="btn btn-p" style={{ width: '100%', padding: '6px 0', fontSize: '12px' }}>Review 0-Sale MCATs</button>
            </div>
            <div className="hyg-action warn" style={{ paddingBottom: '15px' }}>
              <div className="hyg-action-tag" style={{ color: 'var(--amber)' }}>Warning</div>
              <div className="hyg-action-title">Drop in Avg BL/MCAT</div>
              <div className="hyg-action-body" style={{ marginBottom: '10px' }}>Average BL per MCAT fell 8.8% this week. Audit top performing categories.</div>
              <button className="btn" style={{ width: '100%', padding: '6px 0', fontSize: '12px', border: '1px solid var(--bdr2)', background: 'transparent', color: 'var(--fg)' }}>Audit Top Categories</button>
            </div>
          </div>
        </div>
      </div>

      <div className="sh">
        <h2>Global MCAT Repository <span>98K unique products</span></h2>
      </div>
      <div className="cg">
        <div className="cc">
          <div className="ct">Transaction Flag Mix</div>
          <div className="cs">80% of MCATs have zero sales</div>
          <ChartComponent type="doughnut" data={masterFlagData} />
        </div>
        <div className="cc">
          <div className="ct">Avg BL Yield Trend</div>
          <div className="cs">Approved leads per running MCAT</div>
          <ChartComponent type="bar" data={masterBlData} />
        </div>
      </div>

      <div className="sh">
        <h2>Top Performing MCATs <span>Ranked by BL Approved</span></h2>
      </div>
      <div className="tw cc">
        <table className="dt">
          <thead>
            <tr>
              <th>MCAT Name</th>
              <th>PMCAT</th>
              <th>Group</th>
              <th className="num">BL</th>
              <th className="num">Feed</th>
              <th className="num">Elig</th>
              <th className="num">Sellers</th>
              <th className="num">Paid</th>
              <th className="num">Imp</th>
            </tr>
          </thead>
          <tbody>
            {TOP_MCATS.map((r, i) => (
              <tr key={i}>
                <td className="hi">{r.name}</td>
                <td className="sm">{r.pmcat}</td>
                <td className="sm">{r.grp}</td>
                <td className="num">{r.bl}</td>
                <td className="num">{r.feed}</td>
                <td className="num">{r.elig}</td>
                <td className="num">{r.sellers.toLocaleString()}</td>
                <td className="num">{r.paid}</td>
                <td className="num">{r.imp.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
