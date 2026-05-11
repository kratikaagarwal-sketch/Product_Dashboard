"use client";

import React from 'react';
import { TITLES, SUBS } from '@/lib/constants';

interface TopbarProps {
  activeTab: string;
}

export default function Topbar({ activeTab }: TopbarProps) {
  return (
    <header className="topbar">
      <div>
        <h1 className="tb-title">{TITLES[activeTab] || activeTab}</h1>
        <div className="tb-sub">{SUBS[activeTab] || ''}</div>
      </div>
      <div className="tb-right">
        <button className="btn">📅 Date Range</button>
        <button className="btn">📤 Export</button>
        <button className="btn btn-p">⚙ Settings</button>
      </div>
    </header>
  );
}
