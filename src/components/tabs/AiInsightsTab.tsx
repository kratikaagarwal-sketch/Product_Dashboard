"use client";

import React, { useState } from 'react';

export default function AiInsightsTab() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any[] | null>(null);

  const generateAnalysis = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setAnalysis([
        { type: 'pos', title: 'WhatsApp Growth (+22.5%) Dominates Channels', detail: 'WhatsApp Business leads have hit an all-time high of 2.45L, contributing 40% of total volume. This shift indicates a strong preference for mobile-first conversational commerce among B2B buyers.' },
        { type: 'act', title: 'PMCAT Coverage Gap (48.6%) Critical Risk', detail: 'Current coverage of 31.4% is far below the 80% target. High-volume PMCATs (400+ BL) dropped by 40% this week. Immediate manual intervention in "Industrial Engineering" category required.' },
        { type: 'warn', title: 'Enquiry Decline (-65%) Structural Pattern', detail: 'Enquiries and FENQ have been in decline for 6 months. This suggests a shift in lead quality or a change in how users interact with the platform, potentially moving towards direct calls.' },
        { type: 'pos', title: 'B&C Efficiency Hit Record ₹33.87 Cost/BL', detail: 'Building & Construction campaign achieved its best-ever efficiency this month. This suggests the current bidding strategy and negative keyword list are highly optimized for this vertical.' },
        { type: 'act', title: '81K Low CTR Products Impacting Feed Health', detail: 'The surge in low CTR items indicates feed "bloat". Suggest pruning bottom 10% of performing products to improve overall Merchant Center quality score and lower CPC.' },
        { type: 'inf', title: '78K MCATs with Zero Sales (Untapped Pool)', detail: '80% of the global MCAT repository hasn\'t generated a sale in 30 days. This represents a massive long-tail opportunity if content enrichment is applied to these nodes.' }
      ]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="tab on">
      <div className="sh">
        <h2>Claude AI Deep Analysis <span>Cross-source synthesis</span></h2>
      </div>
      
      {!analysis && !loading && (
        <div id="ai-result" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>
            Click the button below to perform a deep analysis across all 6 data sources (Google Ads, Redshift, Hygiene, MCAT Master, Traffic, and Enquiries).
          </p>
          <button className="btn btn-p" onClick={generateAnalysis}>✨ Generate Full AI Analysis</button>
        </div>
      )}

      {loading && (
        <div id="ai-result">
          <div className="ai-load">
            <div className="spin"></div>
            Analyzing trends and identifying anomalies...
          </div>
        </div>
      )}

      {analysis && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {analysis.map((item, i) => (
            <div className="ic" key={i}>
              <div className={`ib ${item.type === 'pos' ? 'pos' : (item.type === 'act' ? 'act' : (item.type === 'warn' ? 'warn' : 'inf'))}`}>
                {item.type === 'pos' ? '▲ Strong' : (item.type === 'act' ? '→ Act Now' : (item.type === 'warn' ? '⚠ Watch' : '→ Insight'))}
              </div>
              <div className="it">{item.title}</div>
              <div className="id">{item.detail}</div>
            </div>
          ))}
          <div style={{ gridColumn: '1/-1', textAlign: 'center', marginTop: '20px' }}>
            <button className="btn" onClick={() => setAnalysis(null)}>Refresh Analysis</button>
          </div>
        </div>
      )}

      <div className="sh" style={{ marginTop: '30px' }}>
        <h2>Strategic Roadmap <span>Powered by AI insights</span></h2>
      </div>
      <div className="alert alert-info" style={{ marginTop: 0 }}>
        Claude suggests focusing Q2 efforts on <strong>Feed Quality Pruning</strong> and <strong>WhatsApp Channel Optimization</strong> to maintain the record-breaking lead volumes observed in March.
      </div>
    </div>
  );
}
