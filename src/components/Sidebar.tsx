"use client";

import React from 'react';
import { TITLES } from '@/lib/constants';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const navItems = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'google', icon: '📢', label: 'Google Ads' },
    { id: 'bl', icon: '💼', label: 'Business Leads' },
    { id: 'traffic_enquiry', icon: '🌐', label: 'Traffic & Enquiries' },
  ];

  const intelligenceItems = [
    { id: 'campaign', icon: '📂', label: 'Campaign Detail' },
    { id: 'mcat', icon: '⏸️', label: 'MCAT Pause' },
    { id: 'hygiene', icon: '🧼', label: 'Feed Hygiene' },
    { id: 'diversity', icon: '🌈', label: 'Category Diversity' },
    { id: 'master', icon: '🗄️', label: 'MCAT Master' },
    { id: 'ai', icon: '✨', label: 'AI Insights' },
  ];

  return (
    <aside className="sb">
      <div className="sb-logo">
        <div className="sb-brand">
          <div className="sb-icon">AD</div>
          <span>Ads Intelligence</span>
        </div>
        <div className="sb-sub">v2.4 — Product Master</div>
      </div>

      <nav className="sb-nav">
        <div className="sb-sec">Performance</div>
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
