"use client";

import React from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose }: SidebarProps) {
  const navItems = [
    { id: 'daily_campaign', icon: '📆', label: 'Campaign Detail' },
    { id: 'weekly_report', icon: '📅', label: 'Weekly Report' },
    { id: 'ai', icon: '✨', label: 'AI Insights' },
  ];

  const intelligenceItems = [
    { id: 'bl', icon: '💼', label: 'Business Leads' },
    { id: 'mcat', icon: '⏸️', label: 'MCAT Pause' },
    { id: 'hygiene', icon: '🧼', label: 'Feed Hygiene' },
  ];

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    onClose();
  };

  return (
    <>
      <div className={`sb-overlay ${isOpen ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sb ${isOpen ? 'open' : ''}`}>
        <div className="sb-logo">
          <div className="sb-brand">
            <div className="sb-icon">IM</div>
            <span>IndiaMart Ads Insights</span>
          </div>
          <div className="sb-sec">Campaign Detail</div>
        </div>

        <nav className="sb-nav">
          <div className="sb-sec">Reporting & Analytics - Live</div>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nb ${activeTab === item.id ? 'on' : ''}`}
              onClick={() => handleTabClick(item.id)}
            >
              <span className="ni">{item.icon}</span>
              {item.label}
            </button>
          ))}

          <div className="sb-sec" style={{ marginTop: '18px' }}>Beta Views</div>
          {intelligenceItems.map((item) => (
            <button
              key={item.id}
              className={`nb ${activeTab === item.id ? 'on' : ''}`}
              onClick={() => handleTabClick(item.id)}
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
    </>
  );
}
