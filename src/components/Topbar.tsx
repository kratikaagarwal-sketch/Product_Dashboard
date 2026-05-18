"use client";

import React, { useState, useRef, useEffect } from 'react';
import { TITLES, SUBS } from '@/lib/constants';
import * as XLSX from 'xlsx';

interface TopbarProps {
  activeTab: string;
}

export default function Topbar({ activeTab }: TopbarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      <div>
        <h1 className="tb-title">{TITLES[activeTab] || activeTab}</h1>
        <div className="tb-sub">{SUBS[activeTab] || ''}</div>
      </div>
      <div className="tb-right">
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button className="btn btn-p" onClick={() => setShowDropdown(!showDropdown)}>
            📤 Export
          </button>
          
          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              background: 'var(--bg)',
              border: '1px solid var(--bdr2)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              zIndex: 100,
              overflow: 'hidden',
              minWidth: '150px'
            }}>
              <button 
                onClick={handleExportPDF}
                style={{ display: 'block', width: '100%', padding: '10px 15px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--bdr2)', color: 'var(--fg)', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                📄 Export as PDF
              </button>
              <button 
                onClick={handleExportExcel}
                style={{ display: 'block', width: '100%', padding: '10px 15px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--fg)', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                📊 Export as Excel
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
