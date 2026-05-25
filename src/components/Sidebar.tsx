"use client";

import React from 'react';
import { TITLES } from '@/lib/constants';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const navItems = [
    { id: 'daily_campaign', icon: '📆', label: 'Daily Campaign' },
    { id: 'ai', icon: '✨', label: 'AI Insights' },
  ];

  const intelligenceItems = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'google', icon: '📢', label: 'Google Ads' },
    { id: 'bl', icon: '💼', label: 'Business Leads' },
    { id: 'traffic_enquiry', icon: '🌐', label: 'Traffic & Enquiries' },
    { id: 'mcat', icon: '⏸️', label: 'MCAT Pause' },
    { id: 'hygiene', icon: '🧼', label: 'Feed Hygiene' },
    { id: 'diversity', icon: '🌈', label: 'Category Diversity' },
  ];

  return (
    <aside className="sb">
      <div className="sb-logo">
        <div className="sb-brand">
          <div className="sb-icon">IM</div>
          <span>IndiaMart Ads Insights</span>
        </div>
        <div className="sb-sec">Campaign Detail</div>
      </div>

      <nav className="sb-nav">
        <div className="sb-sec">Campaign Detail</div>
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nb ${activeTab === item.id ? 'on' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="ni">{item.icon}</span>
            {item.label}
          </button>
        ))}

        <div className="sb-sec" style={{ marginTop: '18px' }}>Intelligence</div>
        {intelligenceItems.map((item) => (
          <button
            key={item.id}
            className={`nb ${activeTab === item.id ? 'on' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="ni">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sb-foot">
        <div className="live">
          <div className="dot"></div>
          LIVE: Redshift Connected
        </div>
        <div>Last updated: Just now</div>
      </div>
    </aside>
  );
}
