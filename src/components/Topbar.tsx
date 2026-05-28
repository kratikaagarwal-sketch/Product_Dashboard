"use client";

import React, { useState, useRef, useEffect } from 'react';
import { TITLES, SUBS } from '@/lib/constants';
import * as XLSX from 'xlsx';

interface TopbarProps {
  activeTab: string;
  onMenuClick: () => void;
}

export default function Topbar({ activeTab, onMenuClick }: TopbarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
      } else {
        document.body.classList.remove('light-theme');
      }
    } else {
      const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      if (prefersLight) {
        setTheme('light');
        document.body.classList.add('light-theme');
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportPDF = () => {
    setShowDropdown(false);
    window.print();
  };

  const handleExportExcel = () => {
    setShowDropdown(false);
    const tables = document.querySelectorAll('table');
    if (tables.length === 0) {
      alert("No data tables found on the current view to export.");
      return;
    }
    
    const wb = XLSX.utils.book_new();
    tables.forEach((table, index) => {
      const ws = XLSX.utils.table_to_sheet(table);
      XLSX.utils.book_append_sheet(wb, ws, `Data_Table_${index + 1}`);
    });
    
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${activeTab}_report_${date}.xlsx`);
  };

  return (
    <header className="topbar">
      <div className="topbar-main">
        <button className="btn topbar-menu" onClick={onMenuClick} type="button">
          Menu
        </button>
        <div className="topbar-heading">
          <h1 className="tb-title">{TITLES[activeTab] || activeTab}</h1>
          <div className="tb-sub">{SUBS[activeTab] || ''}</div>
        </div>
      </div>
      <div className="tb-right">
        <button 
          className="btn" 
          onClick={toggleTheme} 
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
    </header>
  );
}
