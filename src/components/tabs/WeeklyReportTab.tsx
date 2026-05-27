"use client";

import React, { useState, useEffect, useMemo } from 'react';
import SearchableSelect from '../SearchableSelect';

const METRICS = [
  { section: 'summary', key: 'bl_approved', label: 'BL Approved', type: 'number' },
  { section: 'summary', key: 'cost_per_bl', label: 'Cost/BL Approved', type: 'currency' },
  { section: 'summary', key: 'cost_per_txn', label: 'Cost/Transaction', type: 'currency' },
  { section: 'summary', key: 'bl_sold_pct', label: 'Unique Sold %', type: 'percent' },
  { section: 'summary', key: 'txn_pct', label: 'Transaction %', type: 'percent' },
  { section: 'summary', key: 'blni_txn_pct', label: 'BLNI/Transaction %', type: 'percent' },
  { section: 'summary', key: 'total_cost', label: 'Total Cost', type: 'currency' },
  { section: 'summary', key: 'pmcat_div_25', label: 'PMCAT Diversity (>= 25 BL)', type: 'percent' },
  { section: 'summary', key: 'mcat_div_10', label: 'MCAT Diversity (>= 10 BL)', type: 'percent' },

  { section: 'Google Adwords Report', key: 'impressions', label: 'Google Ads Impression', type: 'number' },
  { section: 'Google Adwords Report', key: 'clicks', label: 'Google Ads Clicks', type: 'number' },
  { section: 'Google Adwords Report', key: 'ctr', label: 'CTR', type: 'percent' },
  { section: 'Google Adwords Report', key: 'cpc', label: 'Average CPC', type: 'currency' },
  { section: 'Google Adwords Report', key: 'total_cost', label: 'Total Cost', type: 'currency' },
  { section: 'Google Adwords Report', key: 'conversions', label: 'Google Ads Conversion', type: 'number' },
  { section: 'Google Adwords Report', key: 'cost_per_conv', label: 'Cost/Conversion', type: 'currency' },
  { section: 'Google Adwords Report', key: 'daily_budget', label: 'Daily budget', type: 'na' },
  { section: 'Google Adwords Report', key: 'weekly_budget_pct', label: 'weekly budget consumption%', type: 'na' },

  { section: 'DB Report', key: 'cost_per_bl', label: 'Cost / BL Approved', type: 'currency' },
  { section: 'DB Report', key: 'cost_per_txn', label: 'Cost / Transaction', type: 'currency' },
  { section: 'DB Report', key: 'total_req_approved', label: 'Total requirement Approved', type: 'number' },
  { section: 'DB Report', key: 'total_calls', label: 'Total calls', type: 'number' },
  { section: 'DB Report', key: 'enq_approved', label: 'Total Enquiry approved', type: 'number' },
  { section: 'DB Report', key: 'bl_approved', label: 'BL Approved', type: 'number' },
  { section: 'DB Report', key: 'transactions', label: 'Transactions', type: 'number' },
  { section: 'DB Report', key: 'txn_pct', label: 'Transactions (Approved) %', type: 'percent' },
  { section: 'DB Report', key: 'unique_sold', label: 'Unique Sold', type: 'number' },
  { section: 'DB Report', key: 'bl_sold_pct', label: 'Unique Sold /Approved %', type: 'percent' },
  { section: 'DB Report', key: 'blni', label: 'BLNI', type: 'number' },
  { section: 'DB Report', key: 'blni_appr_pct', label: 'BLNI/ Approved %', type: 'percent' },
  { section: 'DB Report', key: 'blni_txn_pct', label: 'BLNI/ Transaction %', type: 'percent' },
  { section: 'DB Report', key: 'bl_approved_center', label: 'BL Approved (Center)', type: 'na' },
  { section: 'DB Report', key: 'unique_purchaser', label: 'Unique Purchaser', type: 'number' },

  { section: 'Total PMCATs', key: 'pmcat_count', label: 'PMCAT Count (Ad running)', type: 'number' },
  { section: 'Total PMCATs', key: 'pmcat_div_25', label: 'Total PMCATs with >25 BLs', type: 'number' },
  { section: 'Total PMCATs', key: 'pmcat_cov_25', label: 'Coverage % (PMCATs with >25 BLs)', type: 'percent' },
  { section: 'Total PMCATs', key: 'pmcat_0_5', label: '0 to <5 BL', type: 'number' },
  { section: 'Total PMCATs', key: 'pmcat_5_25', label: '5 to <25 BL', type: 'number' },
  { section: 'Total PMCATs', key: 'pmcat_25_100', label: '25 to <100 BL', type: 'number' },
  { section: 'Total PMCATs', key: 'pmcat_100_200', label: '100 to <200 BL', type: 'number' },
  { section: 'Total PMCATs', key: 'pmcat_200_400', label: '200 to <400 BL', type: 'number' },
  { section: 'Total PMCATs', key: 'pmcat_400_plus', label: '>= 400 BL', type: 'number' },

  { section: 'Hygiene report', key: 'unq_prod_count', label: 'Unique Product Count (Eligible Only)', type: 'na' },
  { section: 'Hygiene report', key: 'mcat_0_clicks', label: '0 Clicks', type: 'number' },
  { section: 'Hygiene report', key: 'mcat_1_10_clicks', label: '1-10 Clicks', type: 'number' },
  { section: 'Hygiene report', key: 'mcat_gt_10_clicks', label: '>10 Clicks', type: 'number' },
];

export default function WeeklyReportTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [adsRunningMcats, setAdsRunningMcats] = useState<string[]>([]);
  const [adsRunningLoading, setAdsRunningLoading] = useState(true);

  // Filters
  const [granularity, setGranularity] = useState<'group' | 'pmcat' | 'mcat'>('group');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedPmcat, setSelectedPmcat] = useState<string>('all');
  const [selectedMcat, setSelectedMcat] = useState<string>('all');

  // Fetch data
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/daily-campaign?period=weekly`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.error || 'Failed to fetch Redshift data');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });

    fetch('/api/ads-running-mcats')
      .then(r => r.json())
      .then(res => {
        if (res.success) setAdsRunningMcats(res.data);
        setAdsRunningLoading(false);
      })
      .catch(err => {
        console.error(err);
        setAdsRunningLoading(false);
      });
  }, []);

  const adsRunningSet = useMemo(() => new Set(adsRunningMcats.map(m => m.toLowerCase().trim())), [adsRunningMcats]);

  const enrichedData = useMemo(() => {
    return data.map(d => {
      return {
        ...d,
        mcat: d.mcat_name || 'Unknown',
        group: d.group_name || 'Unknown Group',
        pmcat: d.pmcat_name || 'Unknown PMCAT',
        clicks: d.total_clicks || 0,
        impressions: d.total_impressions || 0,
        cost: d.total_cost_inr || 0,
        conversions: d.total_conversions || 0,
        bl_sold_approved: d.bl_sold_approved || 0,
        bl_approved: d.bl_approved || 0,
        bl_txn_approved: d.bl_txn_approved || 0,
        blni: d.blni || 0,
        enq_approved: d.enq_approved || 0,
        calls_approved: d.calls_approved || 0,
        unq_purchaser: d.unq_purchaser || 0
      };
    });
  }, [data]);

  const availableGroups = useMemo(() => {
    return Array.from(new Set(enrichedData.map(d => d.group))).sort();
  }, [enrichedData]);

  const availablePmcats = useMemo(() => {
    let filtered = enrichedData;
    if (selectedGroup !== 'all') filtered = filtered.filter(d => d.group === selectedGroup);
    return Array.from(new Set(filtered.map(d => d.pmcat))).sort();
  }, [enrichedData, selectedGroup]);

  const availableMcats = useMemo(() => {
    let filtered = enrichedData;
    if (selectedGroup !== 'all') filtered = filtered.filter(d => d.group === selectedGroup);
    if (selectedPmcat !== 'all') filtered = filtered.filter(d => d.pmcat === selectedPmcat);
    return Array.from(new Set(filtered.map(d => d.mcat))).sort();
  }, [enrichedData, selectedGroup, selectedPmcat]);

  const baseFilteredData = useMemo(() => {
    let filtered = enrichedData;
    if (granularity === 'group' && selectedGroup !== 'all') {
      filtered = filtered.filter(d => d.group === selectedGroup);
    } else if (granularity === 'pmcat') {
      if (selectedGroup !== 'all') filtered = filtered.filter(d => d.group === selectedGroup);
      if (selectedPmcat !== 'all') filtered = filtered.filter(d => d.pmcat === selectedPmcat);
    } else if (granularity === 'mcat') {
      if (selectedGroup !== 'all') filtered = filtered.filter(d => d.group === selectedGroup);
      if (selectedPmcat !== 'all') filtered = filtered.filter(d => d.pmcat === selectedPmcat);
      if (selectedMcat !== 'all') filtered = filtered.filter(d => d.mcat === selectedMcat);
    }
    return filtered;
  }, [enrichedData, selectedGroup, selectedPmcat, selectedMcat, granularity]);

  const weeks = useMemo(() => {
    const allWeeks = Array.from(new Set(enrichedData.map(d => d.week_start_date as string)));
    return allWeeks.sort((a, b) => a.localeCompare(b)).slice(-12); // Last 12 weeks chronologically
  }, [enrichedData]);

  const calculateKpisForWeek = (week: string) => {
    const weekData = baseFilteredData.filter(d => d.week_start_date === week);
    let totals = {
        bl_approved: 0,
        total_cost: 0,
        bl_txn_approved: 0,
        bl_sold_approved: 0,
        blni: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        enq_approved: 0,
        total_calls: 0,
        unique_purchaser: 0,
    };
    
    const pmcatMap = new Map();
    const mcatMap = new Map();

    weekData.forEach(d => {
        totals.bl_approved += d.bl_approved || 0;
        totals.total_cost += d.cost || 0;
        totals.bl_txn_approved += d.bl_txn_approved || 0;
        totals.bl_sold_approved += d.bl_sold_approved || 0;
        totals.blni += d.blni || 0;
        totals.impressions += d.impressions || 0;
        totals.clicks += d.clicks || 0;
        totals.conversions += d.conversions || 0;
        totals.enq_approved += d.enq_approved || 0;
        totals.total_calls += d.calls_approved || 0;
        totals.unique_purchaser += d.unq_purchaser || 0;

        const mcatKey = d.mcat.toLowerCase().trim();
        const isMcatAdRunning = adsRunningSet.has(mcatKey);

        if (!pmcatMap.has(d.pmcat)) {
            pmcatMap.set(d.pmcat, { bl_approved: 0, impressions: 0, isAdRunning: false });
        }
        pmcatMap.get(d.pmcat).bl_approved += d.bl_approved || 0;
        pmcatMap.get(d.pmcat).impressions += d.impressions || 0;
        if (isMcatAdRunning) {
            pmcatMap.get(d.pmcat).isAdRunning = true;
        }

        if (!mcatMap.has(d.mcat)) {
            mcatMap.set(d.mcat, { clicks: 0, bl_approved: 0, isAdRunning: isMcatAdRunning });
        }
        mcatMap.get(d.mcat).clicks += d.clicks || 0;
        mcatMap.get(d.mcat).bl_approved += d.bl_approved || 0;
    });

    const cost_per_bl = totals.bl_approved > 0 ? totals.total_cost / totals.bl_approved : 0;
    const cost_per_txn = totals.bl_txn_approved > 0 ? totals.total_cost / totals.bl_txn_approved : 0;
    const bl_sold_pct = totals.bl_approved > 0 ? (totals.bl_sold_approved / totals.bl_approved) * 100 : 0;
    const txn_pct = totals.bl_approved > 0 ? (totals.bl_txn_approved / totals.bl_approved) * 100 : 0;
    const blni_txn_pct = totals.bl_txn_approved > 0 ? (totals.blni / totals.bl_txn_approved) * 100 : 0;
    
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const cpc = totals.clicks > 0 ? totals.total_cost / totals.clicks : 0;
    const cost_per_conv = totals.conversions > 0 ? totals.total_cost / totals.conversions : 0;

    const total_req_approved = totals.enq_approved + totals.total_calls + totals.bl_approved;
    const blni_appr_pct = totals.bl_approved > 0 ? (totals.blni / totals.bl_approved) * 100 : 0;

    let pmcat_ad_running_count = 0;
    let pmcat_ge_25 = 0;
    let pmcat_0_5 = 0;
    let pmcat_5_25 = 0;
    let pmcat_25_100 = 0;
    let pmcat_100_200 = 0;
    let pmcat_200_400 = 0;
    let pmcat_400_plus = 0;

    pmcatMap.forEach((val) => {
        if (val.isAdRunning) pmcat_ad_running_count++;
        if (val.bl_approved >= 25) pmcat_ge_25++;
        if (val.bl_approved >= 0 && val.bl_approved < 5) pmcat_0_5++;
        else if (val.bl_approved >= 5 && val.bl_approved < 25) pmcat_5_25++;
        else if (val.bl_approved >= 25 && val.bl_approved < 100) pmcat_25_100++;
        else if (val.bl_approved >= 100 && val.bl_approved < 200) pmcat_100_200++;
        else if (val.bl_approved >= 200 && val.bl_approved < 400) pmcat_200_400++;
        else if (val.bl_approved >= 400) pmcat_400_plus++;
    });

    const pmcat_div_25 = pmcat_ad_running_count > 0 ? (pmcat_ge_25 / pmcat_ad_running_count) * 100 : 0;
    const pmcat_cov_25 = pmcat_ad_running_count > 0 ? pmcat_div_25 : 0; // Keeping for compatibility

    let mcat_ad_running_count = 0;
    let mcat_ge_10 = 0;
    let mcat_0_clicks = 0;
    let mcat_1_10_clicks = 0;
    let mcat_gt_10_clicks = 0;
    
    mcatMap.forEach((val) => {
        if (val.isAdRunning) mcat_ad_running_count++;
        if (val.bl_approved >= 10) mcat_ge_10++;

        if (val.clicks === 0) mcat_0_clicks++;
        else if (val.clicks >= 1 && val.clicks <= 10) mcat_1_10_clicks++;
        else if (val.clicks > 10) mcat_gt_10_clicks++;
    });

    const mcat_div_10 = mcat_ad_running_count > 0 ? (mcat_ge_10 / mcat_ad_running_count) * 100 : 0;

    return {
        bl_approved: totals.bl_approved,
        cost_per_bl,
        cost_per_txn,
        bl_sold_pct,
        txn_pct,
        blni_txn_pct,
        total_cost: totals.total_cost,
        pmcat_div_25,
        mcat_div_10,

        impressions: totals.impressions,
        clicks: totals.clicks,
        ctr,
        cpc,
        conversions: totals.conversions,
        cost_per_conv,

        total_req_approved,
        total_calls: totals.total_calls,
        enq_approved: totals.enq_approved,
        transactions: totals.bl_txn_approved,
        unique_sold: totals.bl_sold_approved,
        blni: totals.blni,
        blni_appr_pct,
        unique_purchaser: totals.unique_purchaser,

        pmcat_count: pmcat_ad_running_count,
        pmcat_cov_25,
        pmcat_0_5,
        pmcat_5_25,
        pmcat_25_100,
        pmcat_100_200,
        pmcat_200_400,
        pmcat_400_plus,

        mcat_0_clicks,
        mcat_1_10_clicks,
        mcat_gt_10_clicks,

        daily_budget: null,
        weekly_budget_pct: null,
        bl_approved_center: null,
        unq_prod_count: null
    };
  };

  const reportData = useMemo(() => {
    const dataByWeek = weeks.map(w => ({
      week: w,
      stats: calculateKpisForWeek(w)
    }));

    const bestEver: any = {};
    if (dataByWeek.length > 0) {
      METRICS.forEach(m => {
        if (m.type === 'na') {
          bestEver[m.key] = null;
          return;
        }
        let bestVal: number | null = null;
        dataByWeek.forEach(d => {
          const val = (d.stats as any)[m.key];
          if (val === null || val === undefined) return;
          if (m.type === 'currency' && m.key.includes('cost_per')) {
             if (val > 0 && (bestVal === null || val < bestVal)) bestVal = val;
          } else {
             if (bestVal === null || val > bestVal) bestVal = val;
          }
        });
        bestEver[m.key] = bestVal || 0;
      });
    }

    return { dataByWeek, bestEver };
  }, [weeks, baseFilteredData]);

  const formatWeekLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mIdx = parseInt(parts[1], 10) - 1;
    const dStr = parts[2];
    
    // Approximate week range
    const d = new Date(dateStr);
    const endDate = new Date(d);
    endDate.setDate(d.getDate() + 6);
    const emIdx = endDate.getMonth();
    const edStr = String(endDate.getDate()).padStart(2, '0');

    return `${monthNames[mIdx]} ${dStr} - ${monthNames[emIdx]} ${edStr}`;
  };

  const formatVal = (val: number | null, type: string) => {
    if (val === null || val === undefined) return 'N/A';
    if (type === 'na') return 'N/A';
    if (type === 'currency') return `₹${val.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
    if (type === 'percent') return `${val.toFixed(2)}%`;
    return val.toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  const getEntityTitle = () => {
    if (granularity === 'group') return selectedGroup === 'all' ? 'All Groups' : selectedGroup;
    if (granularity === 'pmcat') return selectedPmcat === 'all' ? (selectedGroup === 'all' ? 'All PMCATs' : `PMCATs in ${selectedGroup}`) : selectedPmcat;
    return selectedMcat === 'all' ? (selectedPmcat === 'all' ? 'All MCATs' : `MCATs in ${selectedPmcat}`) : selectedMcat;
  };

  const buildCsvContent = () => {
    let csv = `Section,Metric,Best ever,${weeks.map(w => formatWeekLabel(w)).join(',')},delta % (+/- LW)\n`;
    let currentSection = '';
    METRICS.forEach(m => {
      let row = '';
      if (m.section !== currentSection) {
        currentSection = m.section;
        row += `"${m.section}",`;
      } else {
        row += `,`;
      }
      row += `"${m.label}",`;
      const bestVal = reportData.bestEver[m.key];
      row += `"${formatVal(bestVal, m.type).replace(/,/g, '')}",`;
      reportData.dataByWeek.forEach(d => {
        const val = (d.stats as any)[m.key];
        row += `"${formatVal(val, m.type).replace(/,/g, '')}",`;
      });
      let deltaStr = 'N/A';
      if (reportData.dataByWeek.length >= 2 && m.type !== 'na') {
        const lw = (reportData.dataByWeek[reportData.dataByWeek.length - 1].stats as any)[m.key] || 0;
        const lw2 = (reportData.dataByWeek[reportData.dataByWeek.length - 2].stats as any)[m.key] || 0;
        if (lw2 > 0) {
          const delta = ((lw - lw2) / lw2) * 100;
          deltaStr = `${delta > 0 ? '+' : ''}${delta.toFixed(2)}%`;
        } else if (lw > 0) {
          deltaStr = '+100.00%';
        } else {
          deltaStr = '0.00%';
        }
      }
      row += `"${deltaStr}"\n`;
      csv += row;
    });
    return csv;
  };

  const buildWorkbook = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Weekly Report');

    // ── Columns ──────────────────────────────────────────────
    const columns: any[] = [
      { header: 'Section', key: 'section', width: 28 },
      { header: 'Metric',  key: 'metric',  width: 38 },
      { header: 'Best ever', key: 'best',  width: 16 },
    ];
    weeks.forEach(w => columns.push({ header: formatWeekLabel(w), key: w, width: 16 }));
    columns.push({ header: 'delta % (+/- LW)', key: 'delta', width: 18 });
    ws.columns = columns;

    // ── Header row styling ────────────────────────────────────
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.height = 22;
    headerRow.eachCell((cell, col) => {
      cell.alignment = { vertical: 'middle', horizontal: col <= 2 ? 'left' : 'center', wrapText: true };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF888888' } },
      };
      if (col === 3) {
        // Best ever → gold
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } };
      } else if (col > 3 && col < columns.length) {
        // Week columns → steel blue
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      } else if (col === columns.length) {
        // Delta column → dark grey
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF404040' } };
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      }
    });

    // ── Helper: apply number format ───────────────────────────
    const applyNumFmt = (cell: any, type: string) => {
      if (type === 'currency') cell.numFmt = '₹#,##0.0;[Red]-₹#,##0.0';
      else if (type === 'percent') cell.numFmt = '0.00%';
      else if (type === 'number')  cell.numFmt = '#,##0.0';
    };

    // ── Section grouping for merged cells ─────────────────────
    // Track section first-row and last-row so we can merge the Section column
    const sectionRanges: { name: string; startRow: number; endRow: number }[] = [];
    let currentSection = '';
    let sectionStart = 2; // row 1 = header

    // ── Data rows ─────────────────────────────────────────────
    METRICS.forEach((m, mIdx) => {
      // Track section boundaries
      if (m.section !== currentSection) {
        if (currentSection !== '') {
          sectionRanges.push({ name: currentSection, startRow: sectionStart, endRow: mIdx + 1 });
        }
        currentSection = m.section;
        sectionStart = mIdx + 2; // +2 because header is row 1
      }

      const rowData: any = { section: m.section, metric: m.label };

      // Best ever value
      const bestVal = reportData.bestEver[m.key];
      rowData.best = bestVal !== null ? (m.type === 'percent' ? bestVal / 100 : bestVal) : 'N/A';

      // Week values
      weeks.forEach(w => {
        const weekStat = reportData.dataByWeek.find(d => d.week === w)?.stats as any;
        const val = weekStat ? weekStat[m.key] : null;
        rowData[w] = (val !== null && val !== undefined) ? (m.type === 'percent' ? val / 100 : val) : 'N/A';
      });

      // Delta calculation
      let deltaNum = 0;
      let deltaVal: any = 'N/A';
      let hasDelta = false;
      if (reportData.dataByWeek.length >= 2 && m.type !== 'na') {
        const lw  = (reportData.dataByWeek[reportData.dataByWeek.length - 1].stats as any)[m.key] || 0;
        const lw2 = (reportData.dataByWeek[reportData.dataByWeek.length - 2].stats as any)[m.key] || 0;
        if (lw2 > 0)     { deltaNum = (lw - lw2) / lw2; deltaVal = deltaNum; hasDelta = true; }
        else if (lw > 0) { deltaNum = 1.0; deltaVal = 1.0; hasDelta = true; }
        else             { deltaNum = 0.0; deltaVal = 0.0; hasDelta = true; }
      }
      rowData.delta = deltaVal;

      const row = ws.addRow(rowData);
      row.height = 18;

      // Section cell style (left-aligned, bold, light background)
      const sectionCell = row.getCell(1);
      sectionCell.font = { bold: true };
      sectionCell.alignment = { vertical: 'middle', horizontal: 'left' };

      // Metric cell
      const metricCell = row.getCell(2);
      metricCell.alignment = { vertical: 'middle', horizontal: 'left' };

      // Best ever cell (light gold background)
      const bestCell = row.getCell(3);
      applyNumFmt(bestCell, m.type);
      bestCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
      bestCell.alignment = { vertical: 'middle', horizontal: 'center' };
      bestCell.font = { bold: true, color: { argb: 'FF7B6000' } };

      // Week cells
      let colIdx = 4;
      weeks.forEach(() => {
        const cell = row.getCell(colIdx);
        applyNumFmt(cell, m.type);
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        // Alternate row tint: very light blue
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: (mIdx % 2 === 0) ? 'FFE8F0FE' : 'FFFFFFFF' } };
        colIdx++;
      });

      // Delta cell with color-coded conditional formatting
      const deltaCell = row.getCell(colIdx);
      if (hasDelta) {
        deltaCell.numFmt = '+0.00%;[Red]-0.00%;0.00%';
        deltaCell.alignment = { vertical: 'middle', horizontal: 'center' };
        const isCostMetric = m.key.includes('cost_per') || m.key === 'cpc';
        const isBad = isCostMetric ? deltaNum > 0 : deltaNum < 0;
        if (deltaNum !== 0) {
          deltaCell.fill = { type: 'pattern', pattern: 'solid',
            fgColor: { argb: isBad ? 'FFFFCDD2' : 'FFC8E6C9' } };
          deltaCell.font = { color: { argb: isBad ? 'FFD32F2F' : 'FF388E3C' }, bold: true };
        } else {
          deltaCell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      }

      // Bottom border for last metric in a section
      const isLastInSection = mIdx === METRICS.length - 1 || METRICS[mIdx + 1].section !== m.section;
      if (isLastInSection) {
        row.eachCell(cell => {
          cell.border = { bottom: { style: 'medium', color: { argb: 'FF888888' } } };
        });
      }
    });

    // Push last section range
    sectionRanges.push({ name: currentSection, startRow: sectionStart, endRow: METRICS.length + 1 });

    // ── Merge Section column cells ────────────────────────────
    sectionRanges.forEach(sr => {
      if (sr.endRow > sr.startRow) {
        ws.mergeCells(sr.startRow, 1, sr.endRow, 1);
      }
      const cell = ws.getCell(sr.startRow, 1);
      cell.value = sr.name;
      cell.font = { bold: true, size: 11 };
      cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    });

    // ── Freeze top row + first 2 cols ─────────────────────────
    ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];

    return wb;
  };

  const downloadExcel = async () => {
    const wb = await buildWorkbook();
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly_report_${getEntityTitle().replace(/ /g, '_')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };



  if (loading || adsRunningLoading) {
    return <div style={{ padding: '24px', color: '#888' }}>Loading weekly data...</div>;
  }
  if (error) {
    return <div style={{ padding: '24px', color: 'var(--red, #ff6168)' }}>Error: {error}</div>;
  }

  // Group metrics by section for rendering
  const sectionedMetrics = METRICS.reduce((acc, m) => {
    if (!acc[m.section]) acc[m.section] = [];
    acc[m.section].push(m);
    return acc;
  }, {} as any);

  return (
    <div style={{ padding: '24px', color: 'var(--txt, #fff)' }}>
      {/* Filters Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>Granularity</label>
          <div style={{ display: 'flex', gap: '12px', background: 'var(--bg2, #1e1e24)', padding: '6px', borderRadius: '8px', border: '1px solid var(--bdr, #2a2a35)' }}>
            {(['group', 'pmcat', 'mcat'] as const).map(g => (
              <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', textTransform: 'capitalize' }}>
                <input 
                  type="radio" 
                  name="granularity" 
                  checked={granularity === g} 
                  onChange={() => {
                    setGranularity(g);
                    setSelectedGroup('all');
                    setSelectedPmcat('all');
                    setSelectedMcat('all');
                  }} 
                />
                {g}
              </label>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>Group</label>
          <SearchableSelect 
            value={selectedGroup}
            onChange={(v) => { setSelectedGroup(v); setSelectedPmcat('all'); setSelectedMcat('all'); }}
            options={[{label: 'All Groups', value: 'all'}, ...availableGroups.map(g => ({label: g, value: g}))]}
          />
        </div>

        {(granularity === 'pmcat' || granularity === 'mcat') && (
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>PMCAT</label>
            <SearchableSelect 
              value={selectedPmcat}
              onChange={(v) => { setSelectedPmcat(v); setSelectedMcat('all'); }}
              options={[{label: 'All PMCATs', value: 'all'}, ...availablePmcats.map(p => ({label: p, value: p}))]}
            />
          </div>
        )}

        {granularity === 'mcat' && (
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>MCAT</label>
            <SearchableSelect 
              value={selectedMcat}
              onChange={setSelectedMcat}
              options={[{label: 'All MCATs', value: 'all'}, ...availableMcats.map(m => ({label: m, value: m}))]}
            />
          </div>
        )}
      </div>

      {/* Title & Download */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Weekly Performance - {getEntityTitle()}</h2>
        <button 
            onClick={downloadExcel}
            style={{
              padding: '8px 16px', background: 'var(--teal)', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <span>📊</span> Export to Excel
          </button>
      </div>

      {/* Table Container */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--bdr)', borderRadius: '8px', background: 'var(--bg)', width: '100%', maxHeight: 'calc(100vh - 250px)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: 'var(--surf2)' }}>
              <th style={{ padding: '12px', borderBottom: '1px solid var(--bdr)', textAlign: 'left', minWidth: '150px', position: 'sticky', left: 0, top: 0, background: 'var(--surf2)', zIndex: 20 }}>Section</th>
              <th style={{ padding: '12px', borderBottom: '1px solid var(--bdr)', textAlign: 'left', minWidth: '200px', position: 'sticky', left: '150px', top: 0, background: 'var(--surf2)', zIndex: 20 }}>Metric</th>
              <th style={{ padding: '12px', borderBottom: '1px solid var(--bdr)', background: 'var(--amber)', color: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10 }}>Best ever</th>
              {weeks.map(w => (
                <th key={w} style={{ padding: '12px', borderBottom: '1px solid var(--bdr)', minWidth: '120px', background: 'var(--blue)', color: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10 }}>
                  {formatWeekLabel(w)}
                </th>
              ))}
              <th style={{ padding: '12px', borderBottom: '1px solid var(--bdr)', background: 'var(--surf2)', position: 'sticky', top: 0, zIndex: 10 }}>delta % (+/- LW)</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(sectionedMetrics).map((sectionName, sIdx) => {
               const metrics = sectionedMetrics[sectionName];
               return metrics.map((m: any, mIdx: number) => {
                 const isFirstInSection = mIdx === 0;
                 const isLastInSection = mIdx === metrics.length - 1;
                 
                 // Calc Delta
                 let deltaStr = 'N/A';
                 let deltaColor = 'inherit';
                 if (reportData.dataByWeek.length >= 2 && m.type !== 'na') {
                    const lw = (reportData.dataByWeek[reportData.dataByWeek.length - 1].stats as any)[m.key] || 0;
                    const lw2 = (reportData.dataByWeek[reportData.dataByWeek.length - 2].stats as any)[m.key] || 0;
                    if (lw2 > 0) {
                      const delta = ((lw - lw2) / lw2) * 100;
                      deltaStr = `${delta > 0 ? '+' : ''}${delta.toFixed(2)}%`;
                      if (m.key.includes('cost_per') || m.key.includes('cpc') || m.key.includes('cost_per_txn') || m.key.includes('cost_per_bl')) {
                         deltaColor = delta > 0 ? 'var(--red)' : 'var(--green)';
                      } else {
                         deltaColor = delta > 0 ? 'var(--green)' : 'var(--red)';
                      }
                    } else if (lw > 0) {
                      deltaStr = '+100.00%';
                      deltaColor = (m.key.includes('cost_per') || m.key.includes('cpc') || m.key.includes('cost_per_txn') || m.key.includes('cost_per_bl')) ? 'var(--red)' : 'var(--green)';
                    } else {
                      deltaStr = '0.00%';
                    }
                 }

                 return (
                   <tr key={m.key} style={{ borderBottom: isLastInSection ? '2px solid var(--bdr)' : '1px solid var(--bdr)' }}>
                     {isFirstInSection && (
                       <td rowSpan={metrics.length} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 'bold', background: 'var(--surf3)', position: 'sticky', left: 0, zIndex: 5, verticalAlign: 'top', borderRight: '1px solid var(--bdr)' }}>
                         {sectionName}
                       </td>
                     )}
                     <td style={{ padding: '8px 12px', textAlign: 'left', position: 'sticky', left: '150px', background: 'var(--surf)', zIndex: 5, borderRight: '1px solid var(--bdr)' }}>
                       {m.label}
                     </td>
                     <td style={{ padding: '8px 12px', background: 'var(--adim)' }}>
                       {formatVal(reportData.bestEver[m.key], m.type)}
                     </td>
                     {reportData.dataByWeek.map(d => (
                       <td key={d.week} style={{ padding: '8px 12px' }}>
                         {formatVal((d.stats as any)[m.key], m.type)}
                       </td>
                     ))}
                     <td style={{ padding: '8px 12px', fontWeight: 'bold', color: deltaColor, background: 'var(--surf2)' }}>
                       {deltaStr}
                     </td>
                   </tr>
                 );
               });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
