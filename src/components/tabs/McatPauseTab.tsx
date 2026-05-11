"use client";

import React, { useState, useEffect } from 'react';
import ChartComponent from '../ChartComponent';

const C = { t: '#00cba4', b: '#4d9fff', g: '#3dd68c', r: '#ff6168', a: '#ffb547', p: '#a78bfa', d: '#4a6070' };

export default function McatPauseTab() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalItems, setModalItems] = useState<any[]>([]);
  const [pausedLong, setPausedLong] = useState<any[]>([]);
  const [freqPaused, setFreqPaused] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/mcat-pause-data')
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setPausedLong(res.data.pausedLong);
          setFreqPaused(res.data.freqPaused);
        } else {
          setError(res.error || 'Failed to fetch data');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const getPauseGrpData = () => {
    const groups: Record<string, number> = {};
    pausedLong.forEach(item => {
      groups[item.group] = (groups[item.group] || 0) + 1;
    });
    const sortedGroups = Object.entries(groups).sort((a, b) => b[1] - a[1]);
    return {
      labels: sortedGroups.map(g => g[0]),
      datasets: [{
        data: sortedGroups.map(g => g[1]),
        backgroundColor: [C.t + 'cc', C.b + 'cc', C.a + 'cc', C.p + 'cc', C.r + 'cc', C.g + 'cc', C.d + 'cc'],
        borderRadius: 4,
      }]
    };
  };

  const getPauseBlData = () => {
    const ranges = ['40-50 BL', '50-60 BL', '60-75 BL', '75-100 BL', '100+ BL'];
    const counts = [0, 0, 0, 0, 0];
    pausedLong.forEach(item => {
      if (item.bl >= 100) counts[4]++;
      else if (item.bl >= 75) counts[3]++;
      else if (item.bl >= 60) counts[2]++;
      else if (item.bl >= 50) counts[1]++;
      else if (item.bl >= 40) counts[0]++;
    });
    return {
      labels: ranges,
      datasets: [{
        data: counts,
        backgroundColor: [C.g + 'cc', C.t + 'cc', C.a + 'cc', C.r + 'cc', C.r + '88'],
        borderRadius: 4,
      }]
    };
  };

  const handleGroupClick = (label: string) => {
    const filtered = pausedLong.filter(m => m.group.toLowerCase().includes(label.split(' ')[0].toLowerCase()));
    setModalTitle(`MCAT List: ${label}`);
    setModalItems(filtered);
    setModalOpen(true);
  };

  const handleBlClick = (label: string) => {
    let min = 0, max = 9999;
    if (label === '40-50 BL') { min = 40; max = 50; }
    else if (label === '50-60 BL') { min = 50; max = 60; }
    else if (label === '60-75 BL') { min = 60; max = 75; }
    else if (label === '75-100 BL') { min = 75; max = 100; }
    else if (label === '100+ BL') { min = 100; max = 9999; }

    const filtered = pausedLong.filter(m => m.bl >= min && m.bl < max);
    setModalTitle(`MCAT List: ${label}`);
    setModalItems(filtered);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="tab on" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--bdr2)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading MCAT pause data from Google Sheets…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab on" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div className="cc" style={{ maxWidth: '520px', width: '100%', textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <div className="ct" style={{ color: 'var(--red)', marginBottom: '8px' }}>Failed to Load Data</div>
          <div className="cs" style={{ marginBottom: '16px', lineHeight: '1.6' }}>{error}</div>
          <div style={{ background: 'var(--bg2)', borderRadius: '8px', padding: '12px 16px', fontSize: '12px', color: 'var(--muted)', textAlign: 'left' }}>
            <strong style={{ color: 'var(--fg)' }}>To fix this:</strong><br />
            1. Open the Google Sheet<br />
            2. Click <strong>Share</strong> → <em>Anyone with the link</em> → <strong>Viewer</strong><br />
            3. Go to <strong>File → Share → Publish to the web</strong> → publish Sheet 1 as CSV
          </div>
          <button className="btn btn-p" style={{ marginTop: '16px', padding: '8px 20px' }} onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tab on">
      <div className="alert alert-warn">
        <strong>Attention:</strong> {pausedLong.length > 0 ? `${pausedLong.length} MCATs were paused. ${pausedLong.filter(m => m.bl >= 80).length} of these are high-volume (80+ BL) items.` : '135 MCATs were paused last week. 3 of these are high-volume (80+ BL) items.'}
      </div>

      <div className="sh">
        <h2>Distribution Analysis <span>Click bars for details</span></h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '25px', alignItems: 'start' }}>
        <div className="cg" style={{ marginBottom: 0 }}>
        <div className="cc">
          <div className="ct">Paused by Category Group</div>
          <div className="cs">Industrial & Construction machinery leads</div>
          <ChartComponent 
            type="bar" 
            data={getPauseGrpData()} 
            options={{ 
              indexAxis: 'y',
              onClick: (e: any, elements: any, chart: any) => {
                if (elements.length > 0) {
                  const idx = elements[0].index;
                  handleGroupClick(chart.data.labels[idx]);
                }
              }
            }} 
          />
        </div>
        <div className="cc">
          <div className="ct">Paused by BL Impact</div>
          <div className="cs">Volume of lost opportunity</div>
          <ChartComponent 
            type="bar" 
            data={getPauseBlData()} 
            options={{ 
              onClick: (e: any, elements: any, chart: any) => {
                if (elements.length > 0) {
                  const idx = elements[0].index;
                  handleBlClick(chart.data.labels[idx]);
                }
              }
            }}
          />
        </div>
        </div>
        <div className="cc" style={{ margin: 0, height: '100%' }}>
          <div className="ct">Recommended Actions</div>
          <div className="cs">Mitigate pause impact</div>
          <div className="hyg-actions" style={{ marginTop: '10px' }}>
            <div className="hyg-action" style={{ paddingBottom: '15px' }}>
              <div className="hyg-action-tag" style={{ color: 'var(--red)' }}>Critical</div>
              <div className="hyg-action-title">High-Volume Pauses</div>
              <div className="hyg-action-body" style={{ marginBottom: '10px' }}>{pausedLong.filter(m => m.bl >= 80).length} MCATs with 80+ BL are currently paused. Investigate and unpause immediately.</div>
              <button className="btn btn-p" style={{ width: '100%', padding: '6px 0', fontSize: '12px' }}>Review 80+ BL Pauses</button>
            </div>
            <div className="hyg-action warn" style={{ paddingBottom: '15px' }}>
              <div className="hyg-action-tag" style={{ color: 'var(--amber)' }}>Warning</div>
              <div className="hyg-action-title">Chronic Pausing</div>
              <div className="hyg-action-body" style={{ marginBottom: '10px' }}>Several MCATs paused 3+ times MTD. Check inventory sync stability.</div>
              <button className="btn" style={{ width: '100%', padding: '6px 0', fontSize: '12px', border: '1px solid var(--bdr2)', background: 'transparent', color: 'var(--fg)' }}>Check Inventory Logs</button>
            </div>
          </div>
        </div>
      </div>

      <div className="sh">
        <h2>High-Impact Pauses <span>Paused for 4+ days</span></h2>
      </div>
      <div className="tw cc">
        <table className="dt">
          <thead>
            <tr>
              <th>MCAT Name</th>
              <th>Group</th>
              <th className="num">Pause Date</th>
              <th className="num">BL (Lost)</th>
              <th className="num">Days Paused</th>
            </tr>
          </thead>
          <tbody>
            {pausedLong.filter(r => r.days >= 4).length > 0 ? (
              pausedLong.filter(r => r.days >= 4).map((r, i) => (
                <tr key={i}>
                  <td style={{ color: r.days >= 14 ? 'var(--red)' : r.days >= 7 ? 'var(--amber)' : 'inherit' }}>{r.name}</td>
                  <td className="sm">{r.group}</td>
                  <td className="num" style={{ fontSize: '11px', color: 'var(--muted)' }}>{r.date}</td>
                  <td className={`num ${r.bl >= 80 ? 'bd' : r.bl >= 60 ? 'wn' : ''}`}>{r.bl}</td>
                  <td className="num hi">{r.days}</td>
                </tr>
              ))
            ) : (
              pausedLong.map((r, i) => (
                <tr key={i}>
                  <td>{r.name}</td>
                  <td className="sm">{r.group}</td>
                  <td className="num" style={{ fontSize: '11px', color: 'var(--muted)' }}>{r.date}</td>
                  <td className={`num ${r.bl >= 80 ? 'bd' : r.bl >= 60 ? 'wn' : ''}`}>{r.bl}</td>
                  <td className="num hi">{r.days}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="sh" style={{ marginTop: '25px' }}>
        <h2>Long-Duration Pauses <span>Paused 3+ days</span></h2>
      </div>
      <div className="tw cc">
        <table className="dt">
          <thead>
            <tr>
              <th>MCAT Name</th>
              <th>Group</th>
              <th className="num">BL</th>
              <th className="num">Days Paused</th>
            </tr>
          </thead>
          <tbody>
            {freqPaused.length > 0 ? freqPaused.map((r, i) => (
              <tr key={i}>
                <td style={{ color: r.freq >= 14 ? 'var(--red)' : r.freq >= 7 ? 'var(--amber)' : 'inherit' }}>{r.name}</td>
                <td className="sm">{r.group}</td>
                <td className="num">{r.bl ?? '—'}</td>
                <td className="num hi">{r.freq}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>No long-duration pauses found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {modalOpen && (
        <div className="modal-overlay show" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalTitle}</h3>
              <button className="close-btn" onClick={() => setModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="tw">
                <table className="dt">
                  <thead>
                    <tr>
                      <th>MCAT Name</th>
                      <th>Group</th>
                      <th className="num">Pause Date</th>
                      <th className="num">BL</th>
                      <th className="num">Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalItems.length > 0 ? (
                      modalItems.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.name}</td>
                          <td className="sm">{item.group}</td>
                          <td className="num" style={{ fontSize: '11px', color: 'var(--muted)' }}>{item.date}</td>
                          <td className="num hi">{item.bl}</td>
                          <td className="num">{item.days}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>No data found for this range</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
