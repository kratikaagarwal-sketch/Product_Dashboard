"use client";

import React from 'react';
import ChartComponent from '../ChartComponent';
import { MN, M12 } from '@/lib/constants';

const C = { t: '#00cba4', b: '#4d9fff', g: '#3dd68c', r: '#ff6168', a: '#ffb547', p: '#a78bfa', d: '#4a6070' };

export default function OverviewTab() {
  const blTrendData = {
    labels: M12,
    datasets: [
      {
        label: 'BL',
        data: MN.bl,
        borderColor: C.t,
        backgroundColor: C.t + '18',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
      },
      {
        label: 'Target',
        data: Array(12).fill(575000),
        borderColor: C.r,
        borderWidth: 1.5,
        borderDash: [6, 3],
        pointRadius: 0,
        fill: false,
      }
    ]
  };

  const spendData = {
    labels: M12,
    datasets: [
      {
        label: 'Spend',
        data: MN.spend,
        backgroundColor: C.b + 'cc',
        borderRadius: 4,
      }
    ]
  };

  const costBlData = {
    labels: M12,
    datasets: [
      {
        label: '₹/BL',
        data: MN.costBL,
        borderColor: C.a,
        borderWidth: 2,
        tension: 0.35,
        fill: false,
      }
    ]
  };

  const blTypeData = {
    labels: ['WhatsApp', 'INTENT', 'FLPNS', 'Direct'],
    datasets: [
      {
        data: [245739, 134468, 106191, 105584],
        backgroundColor: [C.t, C.b, C.p, C.a],
        borderWidth: 2,
        borderColor: '#141a22',
      }
    ]
  };

  const txnData = {
    labels: M12,
    datasets: [
      {
        label: 'BL(K)',
        data: MN.bl.map(v => +(v / 1000).toFixed(0)),
        borderColor: C.t,
        borderWidth: 2,
        tension: 0.35,
      },
      {
        label: 'Txn(L)',
        data: MN.txn,
        borderColor: C.b,
        borderWidth: 2,
        tension: 0.35,
      }
    ]
  };

  return (
    <div className="tab on">
      {/* KPI Cards */}
      <div className="kg">
        <div className="kc best">
          <div className="kl">Monthly BL</div>
          <div className="kv">6,03,134</div>
          <div className="badge up">▲ 4.89%</div>
          <div className="ks">vs 5.75L target</div>
        </div>
        <div className="kc">
          <div className="kl">Monthly Spend</div>
          <div className="kv">₹2.10 Cr</div>
          <div className="badge down">▼ 16.6%</div>
          <div className="ks">Budget optimized</div>
        </div>
        <div className="kc best">
          <div className="kl">Cost per BL</div>
          <div className="kv">₹34.8</div>
          <div className="badge up">▲ 20.6%</div>
          <div className="ks">Efficiency record</div>
        </div>
        <div className="kc">
          <div className="kl">Total Clicks</div>
          <div className="kv">1.19 L</div>
          <div className="badge down">▼ 16.9%</div>
          <div className="ks">High intent focus</div>
        </div>
        <div className="kc">
          <div className="kl">Conversions</div>
          <div className="kv">3.10 K</div>
          <div className="badge down">▼ 10.4%</div>
          <div className="ks">Qualified leads</div>
        </div>
        <div className="kc">
          <div className="kl">PMCAT Cov.</div>
          <div className="kv">31.4%</div>
          <div className="badge down" style={{ background: 'var(--rdim)', color: 'var(--red)' }}>▼ 4.5%</div>
          <div className="ks">Target: 80%</div>
        </div>
      </div>

      {/* Highlights */}
      <div className="sh">
        <h2>Auto-detected Highlights <span>From all 6 files</span></h2>
      </div>
      <div className="ig" style={{ marginBottom: '22px' }}>
        <div className="ic">
          <div className="ib pos">▲ Record</div>
          <div className="it">Best Ever BL Month — March 2026</div>
          <div className="id">
            Achieved <span className="im">6,03,134 BLs</span> — all-time high, beating 5.75L target by
            <span className="im"> 4.89%</span>. Cost/BL hit record low <span className="im">₹34 (▼20.56%)</span> while spend fell ₹4.2Cr.
          </div>
        </div>
        <div className="ic">
          <div className="ib act">🚨 Critical</div>
          <div className="it">PMCAT Coverage 31.4% vs 80% Target</div>
          <div className="id">
            48.6 ppt gap — never closed. PMCATs ≥400 BLs crashed from 15 → <span className="im">9 in one week (▼40%)</span>. Requires urgent intervention.
          </div>
        </div>
      </div>

      {/* Action Center */}
      <div className="sh">
        <h2>🧠 Action Center — Smart Insights <span className="badge down" style={{ background: 'var(--rdim)', color: 'var(--red)' }}>12</span></h2>
      </div>
      <div className="cc" style={{ padding: 0, marginBottom: '22px' }}>
        <div className="action-header"
          style={{ padding: '15px 20px', borderBottom: '1px solid var(--bdr2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="action-filters" style={{ display: 'flex', gap: '8px' }}>
            <button className="pf-btn on">All</button>
            <button className="pf-btn">🚨 Critical</button>
            <button className="pf-btn">📈 Opportunity</button>
            <button className="pf-btn">🧼 Hygiene</button>
          </div>
          <button className="btn btn-p" style={{ fontSize: '12px' }} onClick={() => alert('Sending daily intelligence report to stakeholders...')}>✉️ Send Email Report</button>
        </div>
        <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '10px' }}>
          <div className="hyg-action">
            <div className="hyg-action-tag" style={{ color: 'var(--red)' }}>Critical</div>
            <div className="hyg-action-title">PMCAT Coverage Drop in B&C</div>
            <div className="hyg-action-body">Coverage fell from 46% to 44% this week. 15 top PMCATs lost visibility.</div>
          </div>
          <div className="hyg-action warn">
            <div className="hyg-action-tag" style={{ color: 'var(--amber)' }}>Opportunity</div>
            <div className="hyg-action-title">WhatsApp Channel Surge</div>
            <div className="hyg-action-body">WhatsApp leads grew 7% WoW. Suggest shifting 5% budget from low-CTR Display.</div>
          </div>
          <div className="hyg-action info">
            <div className="hyg-action-tag" style={{ color: 'var(--blue)' }}>Hygiene</div>
            <div className="hyg-action-title">81K Low CTR Products Identified</div>
            <div className="hyg-action-body">Feed contains high volume of non-performing items. Pruning recommended.</div>
          </div>
        </div>
      </div>

      {/* Performance Trends */}
      <div className="sh">
        <h2>Performance Trends <span>12-month trajectory</span></h2>
      </div>
      <div className="cg">
        <div className="cc">
          <div className="ct">Total BL Approved</div>
          <div className="cs">Monthly leads vs 575K target</div>
          <ChartComponent type="line" data={blTrendData} />
        </div>
        <div className="cc">
          <div className="ct">Monthly Ad Spend</div>
          <div className="cs">Spend in ₹ Lakhs (Total ₹2.1Cr in Mar)</div>
          <ChartComponent type="bar" data={spendData} />
        </div>
        <div className="cc">
          <div className="ct">Cost Per BL (₹)</div>
          <div className="cs">Efficiency metric — lower is better</div>
          <ChartComponent type="line" data={costBlData} />
        </div>
        <div className="cc">
          <div className="ct">BL Type Distribution</div>
          <div className="cs">WhatsApp leads dominant at 40.7%</div>
          <ChartComponent type="doughnut" data={blTypeData} />
        </div>
        <div className="cc w">
          <div className="ct">Lead vs Transaction Growth</div>
          <div className="cs">Correlating BL volume with actual transactions</div>
          <ChartComponent type="line" data={txnData} height={250} />
        </div>
      </div>

      {/* MCAT Performance Grid */}
      <div className="sh">
        <h2>MCAT Performance & Health</h2>
      </div>
      <div className="cg" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
        <div className="cc" style={{ padding: 0 }}>
          <div className="ct" style={{ padding: '15px 20px' }}>📋 Top MCATs by Spend & ROAS</div>
          <div className="tw">
            <table className="dt">
              <thead>
                <tr>
                  <th>MCAT Name</th>
                  <th className="num">Spend</th>
                  <th className="num">ROAS</th>
                  <th className="num">Conv</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Indoor Furniture</td><td className="num">₹4.2L</td><td className="num hi">12.5x</td><td className="num">450</td></tr>
                <tr><td>Concrete Mixers</td><td className="num">₹3.8L</td><td className="num hi">10.2x</td><td className="num">380</td></tr>
                <tr><td>UPVC Windows</td><td className="num">₹2.9L</td><td className="num hi">9.8x</td><td className="num">290</td></tr>
                <tr><td>Diesel Gen.</td><td className="num">₹5.1L</td><td className="num">4.5x</td><td className="num">510</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="cc">
          <div className="ct">🏆 Top Performers</div>
          <div className="cs">Highest ROAS categories</div>
          <div className="rank-list">
            <div className="rank-item"><span>1. Air Cooler</span><span className="hi">15.2x</span></div>
            <div className="rank-item"><span>2. Solar Panel</span><span className="hi">14.8x</span></div>
            <div className="rank-item"><span>3. Power Tools</span><span className="hi">12.1x</span></div>
            <div className="rank-item"><span>4. CCTV Camera</span><span className="hi">11.5x</span></div>
          </div>
        </div>
        <div className="cc">
          <div className="ct">⚠️ Underperformers</div>
          <div className="cs">Action required (Low ROAS)</div>
          <div className="rank-list">
            <div className="rank-item"><span>1. Nitrile Gloves</span><span className="bd">0.8x</span></div>
            <div className="rank-item"><span>2. Face Masks</span><span className="bd">1.2x</span></div>
            <div className="rank-item"><span>3. Hand Tools</span><span className="bd">1.5x</span></div>
            <div className="rank-item"><span>4. PVC Pipes</span><span className="bd">2.1x</span></div>
          </div>
        </div>
      </div>

      <div className="sh">
        <h2>Campaign Stability & Hygiene</h2>
      </div>
      <div className="cg">
        <div className="cc w">
          <div className="ct">MCAT Pause/Unpause Instability</div>
          <div className="cs">High risk of "Learning Phase" reset</div>
          <div className="tw">
            <table className="dt">
              <thead>
                <tr>
                  <th>MCAT</th>
                  <th className="num">Paused</th>
                  <th className="num">Unpaused</th>
                  <th className="num">Max Gap</th>
                  <th className="num">Risk Score</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Kirloskar Diesel Gen</td><td className="num">3 times</td><td className="num">3 times</td><td className="num">7 days</td><td className="num bd">High</td></tr>
                <tr><td>Portable Generator</td><td className="num">2 times</td><td className="num">2 times</td><td className="num">4 days</td><td className="num wn">Med</td></tr>
                <tr><td>Concrete Mixer Machine</td><td className="num">1 time</td><td className="num">1 time</td><td className="num">2 days</td><td className="num">Low</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
