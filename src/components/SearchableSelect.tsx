"use client";
import React, { useState, useRef, useEffect } from 'react';

interface SearchableSelectProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export default function SearchableSelect({ options, value, onChange, placeholder = "Select...", style }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', minWidth: '200px', maxWidth: '300px', ...style }}>
      <div 
        onClick={() => { setIsOpen(!isOpen); setSearchTerm(""); }}
        style={{
          padding: '8px 12px',
          background: 'var(--bg2, #1e1e24)',
          border: '1px solid var(--teal, #00cba4)',
          color: 'var(--teal, #00cba4)',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayValue}
        </span>
        <span style={{ fontSize: '10px', marginLeft: '8px' }}>▼</span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--bg2, #1e1e24)',
          border: '1px solid var(--teal, #00cba4)',
          borderTop: 'none',
          borderRadius: '0 0 4px 4px',
          zIndex: 1000,
          maxHeight: '300px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--bdr2, #3a3a45)' }}>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              autoFocus
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--bg1, #121216)',
                border: '1px solid var(--bdr, #2a2a35)',
                color: '#fff',
                borderRadius: '4px',
                outline: 'none'
              }}
            />
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, overflowY: 'auto', flex: 1 }}>
            {filteredOptions.length === 0 ? (
              <li style={{ padding: '8px 12px', color: '#888' }}>No results</li>
            ) : (
              filteredOptions.map(opt => (
                <li 
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: opt.value === value ? 'var(--teal, #00cba4)' : 'transparent',
                    color: opt.value === value ? '#000' : '#fff',
                    borderBottom: '1px solid var(--bdr, #2a2a35)',
                  }}
                  onMouseEnter={(e) => {
                    if (opt.value !== value) {
                       e.currentTarget.style.background = 'var(--bdr2, #3a3a45)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (opt.value !== value) {
                       e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
