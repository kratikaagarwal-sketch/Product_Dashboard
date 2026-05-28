"use client";

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import ChartComponent from '../ChartComponent';
import SearchableSelect from '../SearchableSelect';
import { useCachedApiData } from '@/lib/clientApiCache';

const C = { t: '#00cba4', b: '#4d9fff', g: '#3dd68c', r: '#ff6168', a: '#ffb547', p: '#a78bfa', d: '#4a6070' };

const METRICS = [
  { key: 'impressions', label: 'Impressions' },
  { key: 'clicks', label: 'Clicks' },
  { key: 'ctr', label: 'CTR %' },
  { key: 'cost', label: 'Cost (INR)' },
  { key: 'conversions', label: 'Conversions' },
  { key: 'cpc', label: 'CPC' },
  { key: 'cost_per_conversion', label: 'Cost / Conv.' },
  { key: 'bl_approved', label: 'BL Approved' },
  { key: 'bl_sold_approved', label: 'BL Sold' },
  { key: 'bl_txn_approved', label: 'Txn' },
  { key: 'cost_per_bl', label: 'Cost / BL' },
  { key: 'txn_approved_pct', label: 'Txn (Appr) %' },
  { key: 'bl_sold_pct', label: 'BL Sold %' },
  { key: 'cost_per_txn', label: 'Cost / Txn' },
  { key: 'mcat_div', label: 'MCAT Div. %' },
  { key: 'pmcat_div', label: 'PMCAT Div. %' },
  { key: 'blni', label: 'BLNI' },
  { key: 'blni_pct', label: 'BLNI / Txn %' },
  { key: 'blni_approved_pct', label: 'BLNI / Appr. %' },
  { key: 'enq_approved', label: 'Enq Approved' },
  { key: 'calls_approved', label: 'Calls Approved' },
  { key: 'total_req_approved', label: 'Total Req Approved' }
];

export default function DailyCampaignTab() {
  // Filters
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [granularity, setGranularity] = useState<'group' | 'pmcat' | 'mcat'>('mcat');

  // Compare Mode State
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [compareWeeksCount, setCompareWeeksCount] = useState<number>(4);

  // Cascading Filters
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedPmcat, setSelectedPmcat] = useState<string>('all');
  const [selectedMcat, setSelectedMcat] = useState<string>('all');

  const [rankMetric, setRankMetric] = useState<string>('ctr');
  const [page, setPage] = useState(0);

  const [showMcatModal, setShowMcatModal] = useState(false);
  const [mcatModalData, setMcatModalData] = useState<any[]>([]);

  const [showPmcatModal, setShowPmcatModal] = useState(false);
  const [pmcatModalData, setPmcatModalData] = useState<any[]>([]);
  const {
    data: campaignData,
    loading,
    error
  } = useCachedApiData<any[]>(`daily-campaign:${timePeriod}`, `/api/daily-campaign?period=${timePeriod}`);
  const {
    data: adsRunningMcatsData,
    loading: adsRunningLoading
  } = useCachedApiData<string[]>('ads-running-mcats', '/api/ads-running-mcats');

  useEffect(() => {
    setPage(0);
  }, [granularity, selectedGroup, selectedPmcat, selectedMcat, selectedWeek]);

  useEffect(() => {
    const dateArr = Array.from(new Set((campaignData ?? []).map((d: any) => d.week_start_date)))
      .sort((a: any, b: any) => b.localeCompare(a));

    setSelectedWeek(prev => {
      if (prev && dateArr.includes(prev)) return prev as string;
      return dateArr.length > 0 ? dateArr[0] as string : '';
    });
  }, [campaignData]);

  const data = campaignData ?? [];
  const adsRunningMcats = adsRunningMcatsData ?? [];
  const adsRunningSet = useMemo(() => new Set(adsRunningMcats.map(m => m.toLowerCase().trim())), [adsRunningMcats]);

  // Enrich data for Group, PMCAT, MCAT directly from the query
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

  const weeks = useMemo(() => Array.from(new Set(data.map(d => d.week_start_date))).sort((a: any, b: any) => b.localeCompare(a)) as string[], [data]);

  const compareWeeksList = useMemo(() => {
    if (weeks.length < 2) return [];
    return weeks.slice(0, compareWeeksCount);
  }, [weeks, compareWeeksCount]);

  // Extract unique items for the cascading filters from the enriched data
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

  // Base filtered data before selecting a specific week
  const baseFilteredData = useMemo(() => {
    let filtered = enrichedData;
    if (selectedGroup !== 'all') filtered = filtered.filter(d => d.group === selectedGroup);
    if (granularity !== 'group' && selectedPmcat !== 'all') filtered = filtered.filter(d => d.pmcat === selectedPmcat);
    if (granularity === 'mcat' && selectedMcat !== 'all') filtered = filtered.filter(d => d.mcat === selectedMcat);
    return filtered;
  }, [enrichedData, selectedGroup, selectedPmcat, selectedMcat, granularity]);

  const calcKpisForWeek = (week: string) => {
    let filtered = baseFilteredData.filter(d => d.week_start_date === week);
    const totals: any = { clicks: 0, impressions: 0, cost: 0, conversions: 0, ctr: 0, bl_sold_approved: 0, bl_approved: 0, bl_txn_approved: 0, blni: 0, txn_approved_pct: 0, bl_sold_pct: 0, cost_per_txn: 0, enq_approved: 0, calls_approved: 0, unq_purchaser: 0, total_req_approved: 0 };

    filtered.forEach(d => {
      totals.clicks += d.clicks || 0;
      totals.impressions += d.impressions || 0;
      totals.cost += d.cost || 0;
      totals.conversions += d.conversions || 0;
      totals.bl_sold_approved += d.bl_sold_approved || 0;
      totals.bl_approved += d.bl_approved || 0;
      totals.bl_txn_approved += d.bl_txn_approved || 0;
      totals.blni += d.blni || 0;
      totals.enq_approved += d.enq_approved || 0;
      totals.calls_approved += d.calls_approved || 0;
      totals.unq_purchaser += d.unq_purchaser || 0;
    });

    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    totals.txn_approved_pct = totals.bl_approved > 0 ? (totals.bl_txn_approved / totals.bl_approved) * 100 : 0;
    totals.bl_sold_pct = totals.bl_approved > 0 ? (totals.bl_sold_approved / totals.bl_approved) * 100 : 0;
    totals.cost_per_txn = totals.bl_txn_approved > 0 ? totals.cost / totals.bl_txn_approved : 0;
    totals.cpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
    totals.cost_per_conversion = totals.conversions > 0 ? totals.cost / totals.conversions : 0;
    totals.cost_per_bl = totals.bl_approved > 0 ? totals.cost / totals.bl_approved : 0;
    totals.blni_pct = totals.bl_txn_approved > 0 ? (totals.blni / totals.bl_txn_approved) * 100 : 0;
    totals.blni_approved_pct = totals.bl_approved > 0 ? (totals.blni / totals.bl_approved) * 100 : 0;
    totals.total_req_approved = totals.enq_approved + totals.bl_approved + totals.calls_approved;

    if (timePeriod === 'weekly') {
      const pmcatMap = new Map();
      const mcatMap = new Map();
      filtered.forEach(d => {
        if (!d.mcat) return;
        const mcatKey = d.mcat.toLowerCase().trim();
        const isAdRunning = adsRunningSet.has(mcatKey);

        if (!pmcatMap.has(d.pmcat)) pmcatMap.set(d.pmcat, { bl_approved: 0, isAdRunning: false });
        pmcatMap.get(d.pmcat).bl_approved += d.bl_approved || 0;
        if (isAdRunning) pmcatMap.get(d.pmcat).isAdRunning = true;

        if (!mcatMap.has(d.mcat)) mcatMap.set(d.mcat, { bl_approved: 0, isAdRunning });
        mcatMap.get(d.mcat).bl_approved += d.bl_approved || 0;
      });

      let pmcat_ad_running = 0; let pmcat_ge_25 = 0;
      pmcatMap.forEach(v => {
        if (v.isAdRunning) pmcat_ad_running++;
        if (v.bl_approved >= 25) pmcat_ge_25++;
      });

      let mcat_ad_running = 0; let mcat_ge_10 = 0;
      mcatMap.forEach(v => {
        if (v.isAdRunning) mcat_ad_running++;
        if (v.bl_approved >= 10) mcat_ge_10++;
      });

      totals.mcat_div = mcat_ad_running > 0 ? (mcat_ge_10 / mcat_ad_running) * 100 : 0;
      totals.pmcat_div = pmcat_ad_running > 0 ? (pmcat_ge_25 / pmcat_ad_running) * 100 : 0;
      totals.mcatMap = mcatMap;
      totals.pmcatMap = pmcatMap;
    } else {
      totals.mcat_div = null;
      totals.pmcat_div = null;
    }
    
    return totals;
  };

  // Standard Week KPI calculation
  const kpiStats = useMemo(() => calcKpisForWeek(selectedWeek), [selectedWeek, baseFilteredData, adsRunningSet, timePeriod]);

  // Compare Mode Calculations
  const compareData = useMemo(() => {
    return compareWeeksList.map(week => {
      return { week, stats: calcKpisForWeek(week) };
    });
  }, [compareWeeksList, baseFilteredData, adsRunningSet, timePeriod]);

  // Roll up data by Group Name for table
  const groupPerformanceData = useMemo(() => {
    if (isCompareMode || granularity !== 'group') return null;

    const weeklyData = enrichedData.filter(d => d.week_start_date === selectedWeek);
    const rolledUp = new Map<string, any>();

    weeklyData.forEach(d => {
      const key = d.group || 'Unknown';
      if (!rolledUp.has(key)) {
        rolledUp.set(key, {
          name: key,
          clicks: 0,
          impressions: 0,
          cost: 0,
          conversions: 0,
          bl_sold_approved: 0,
          bl_approved: 0,
          bl_txn_approved: 0,
          blni: 0,
          enq_approved: 0,
          calls_approved: 0,
          unq_purchaser: 0,
          mcatMap: new Map(),
          pmcatMap: new Map()
        });
      }
      const existing = rolledUp.get(key);
      existing.clicks += d.clicks || 0;
      existing.impressions += d.impressions || 0;
      existing.cost += d.cost || 0;
      existing.conversions += d.conversions || 0;
      existing.bl_sold_approved += d.bl_sold_approved || 0;
      existing.bl_approved += d.bl_approved || 0;
      existing.bl_txn_approved += d.bl_txn_approved || 0;
      existing.blni += d.blni || 0;
      existing.enq_approved += d.enq_approved || 0;
      existing.calls_approved += d.calls_approved || 0;
      existing.unq_purchaser += d.unq_purchaser || 0;
      
      if (d.mcat) {
        const isAdRunning = adsRunningSet.has(d.mcat.toLowerCase().trim());
        if (!existing.mcatMap.has(d.mcat)) existing.mcatMap.set(d.mcat, { bl_approved: 0, isAdRunning });
        existing.mcatMap.get(d.mcat).bl_approved += d.bl_approved || 0;

        if (!existing.pmcatMap.has(d.pmcat)) existing.pmcatMap.set(d.pmcat, { bl_approved: 0, isAdRunning: false });
        existing.pmcatMap.get(d.pmcat).bl_approved += d.bl_approved || 0;
        if (isAdRunning) existing.pmcatMap.get(d.pmcat).isAdRunning = true;
      }
    });

    const rows = Array.from(rolledUp.values()).map(d => {
      let mcat_div = null;
      let pmcat_div = null;

      if (timePeriod === 'weekly') {
        let pmcat_ad_running = 0; let pmcat_ge_25 = 0;
        d.pmcatMap.forEach((v: any) => {
          if (v.isAdRunning) pmcat_ad_running++;
          if (v.bl_approved >= 25) pmcat_ge_25++;
        });
        pmcat_div = pmcat_ad_running > 0 ? (pmcat_ge_25 / pmcat_ad_running) * 100 : 0;

        let mcat_ad_running = 0; let mcat_ge_10 = 0;
        d.mcatMap.forEach((v: any) => {
          if (v.isAdRunning) mcat_ad_running++;
          if (v.bl_approved >= 10) mcat_ge_10++;
        });
        mcat_div = mcat_ad_running > 0 ? (mcat_ge_10 / mcat_ad_running) * 100 : 0;
      }

      return {
        ...d,
        ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
        txn_approved_pct: d.bl_approved > 0 ? (d.bl_txn_approved / d.bl_approved) * 100 : 0,
        bl_sold_pct: d.bl_approved > 0 ? (d.bl_sold_approved / d.bl_approved) * 100 : 0,
        cost_per_txn: d.bl_txn_approved > 0 ? d.cost / d.bl_txn_approved : 0,
        cpc: d.clicks > 0 ? d.cost / d.clicks : 0,
        cost_per_conversion: d.conversions > 0 ? d.cost / d.conversions : 0,
        cost_per_bl: d.bl_approved > 0 ? d.cost / d.bl_approved : 0,
        blni_pct: d.bl_txn_approved > 0 ? (d.blni / d.bl_txn_approved) * 100 : 0,
        blni_approved_pct: d.bl_approved > 0 ? (d.blni / d.bl_approved) * 100 : 0,
        total_req_approved: d.enq_approved + d.bl_approved + d.calls_approved,
        mcat_div,
        pmcat_div
      };
    }).map(r => {
      // remove internal maps from final row
      const { mcatMap, pmcatMap, ...out } = r as any;
      return out;
    });

    rows.sort((a, b) => a.name.localeCompare(b.name));

    const totals: any = {
      name: 'Total',
      clicks: 0,
      impressions: 0,
      cost: 0,
      conversions: 0,
      bl_sold_approved: 0,
      bl_approved: 0,
      bl_txn_approved: 0,
      blni: 0,
      enq_approved: 0,
      calls_approved: 0,
      unq_purchaser: 0,
      ctr: 0,
      txn_approved_pct: 0,
      bl_sold_pct: 0,
      cost_per_txn: 0,
      cpc: 0,
      cost_per_conversion: 0,
      cost_per_bl: 0,
      mcat_div: 0,
      pmcat_div: 0,
      blni_pct: 0
    };

    rows.forEach(r => {
      totals.clicks += r.clicks;
      totals.impressions += r.impressions;
      totals.cost += r.cost;
      totals.conversions += r.conversions;
      totals.bl_sold_approved += r.bl_sold_approved;
      totals.bl_approved += r.bl_approved;
      totals.bl_txn_approved += r.bl_txn_approved;
      totals.blni += r.blni;
      totals.enq_approved += r.enq_approved;
      totals.calls_approved += r.calls_approved;
      totals.unq_purchaser += r.unq_purchaser;
    });

    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    totals.txn_approved_pct = totals.bl_approved > 0 ? (totals.bl_txn_approved / totals.bl_approved) * 100 : 0;
    totals.bl_sold_pct = totals.bl_approved > 0 ? (totals.bl_sold_approved / totals.bl_approved) * 100 : 0;
    totals.cost_per_txn = totals.bl_txn_approved > 0 ? totals.cost / totals.bl_txn_approved : 0;
    totals.cpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
    totals.cost_per_conversion = totals.conversions > 0 ? totals.cost / totals.conversions : 0;
    totals.cost_per_bl = totals.bl_approved > 0 ? totals.cost / totals.bl_approved : 0;
    totals.blni_pct = totals.bl_txn_approved > 0 ? (totals.blni / totals.bl_txn_approved) * 100 : 0;
    totals.blni_approved_pct = totals.bl_approved > 0 ? (totals.blni / totals.bl_approved) * 100 : 0;
    totals.total_req_approved = totals.enq_approved + totals.bl_approved + totals.calls_approved;
    
    if (timePeriod === 'weekly') {
      let pmcat_ad_running = 0; let pmcat_ge_25 = 0;
      let mcat_ad_running = 0; let mcat_ge_10 = 0;
      rows.forEach(r => {
         // for totals, we can approximate it or just re-calculate it globally for the selected group. 
         // since totals represents the selected week, it's just kpiStats!
      });
      totals.mcat_div = kpiStats.mcat_div;
      totals.pmcat_div = kpiStats.pmcat_div;
    } else {
      totals.mcat_div = null;
      totals.pmcat_div = null;
    }

    return { rows, totals };
  }, [enrichedData, selectedWeek, isCompareMode, granularity]);

  // Roll up data by PMCAT for table
  const pmcatPerformanceData = useMemo(() => {
    if (isCompareMode || granularity !== 'pmcat') return null;

    let filteredData = enrichedData.filter(d => d.week_start_date === selectedWeek);
    if (selectedGroup !== 'all') filteredData = filteredData.filter(d => d.group === selectedGroup);

    const rolledUp = new Map<string, any>();

    filteredData.forEach(d => {
      const key = d.pmcat || 'Unknown';
      if (!rolledUp.has(key)) {
        rolledUp.set(key, {
          name: key,
          group: d.group || 'Unknown Group',
          clicks: 0,
          impressions: 0,
          cost: 0,
          conversions: 0,
          bl_sold_approved: 0,
          bl_approved: 0,
          bl_txn_approved: 0,
          blni: 0,
          enq_approved: 0,
          calls_approved: 0,
          unq_purchaser: 0,
          mcatMap: new Map(),
          pmcatMap: new Map()
        });
      }
      const existing = rolledUp.get(key);
      existing.clicks += d.clicks || 0;
      existing.impressions += d.impressions || 0;
      existing.cost += d.cost || 0;
      existing.conversions += d.conversions || 0;
      existing.bl_sold_approved += d.bl_sold_approved || 0;
      existing.bl_approved += d.bl_approved || 0;
      existing.bl_txn_approved += d.bl_txn_approved || 0;
      existing.blni += d.blni || 0;
      existing.enq_approved += d.enq_approved || 0;
      existing.calls_approved += d.calls_approved || 0;
      existing.unq_purchaser += d.unq_purchaser || 0;
      if (d.mcat) {
        const isAdRunning = adsRunningSet.has(d.mcat.toLowerCase().trim());
        if (!existing.mcatMap.has(d.mcat)) existing.mcatMap.set(d.mcat, { bl_approved: 0, isAdRunning });
        existing.mcatMap.get(d.mcat).bl_approved += d.bl_approved || 0;

        if (!existing.pmcatMap.has(d.pmcat)) existing.pmcatMap.set(d.pmcat, { bl_approved: 0, isAdRunning: false });
        existing.pmcatMap.get(d.pmcat).bl_approved += d.bl_approved || 0;
        if (isAdRunning) existing.pmcatMap.get(d.pmcat).isAdRunning = true;
      }
    });

    const rows = Array.from(rolledUp.values()).map(d => {
      let mcat_div = null;
      let pmcat_div = null;

      if (timePeriod === 'weekly') {
        let pmcat_ad_running = 0; let pmcat_ge_25 = 0;
        d.pmcatMap.forEach((v: any) => {
          if (v.isAdRunning) pmcat_ad_running++;
          if (v.bl_approved >= 25) pmcat_ge_25++;
        });
        pmcat_div = pmcat_ad_running > 0 ? (pmcat_ge_25 / pmcat_ad_running) * 100 : 0;

        let mcat_ad_running = 0; let mcat_ge_10 = 0;
        d.mcatMap.forEach((v: any) => {
          if (v.isAdRunning) mcat_ad_running++;
          if (v.bl_approved >= 10) mcat_ge_10++;
        });
        mcat_div = mcat_ad_running > 0 ? (mcat_ge_10 / mcat_ad_running) * 100 : 0;
      }

      return {
        ...d,
        ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
        txn_approved_pct: d.bl_approved > 0 ? (d.bl_txn_approved / d.bl_approved) * 100 : 0,
        bl_sold_pct: d.bl_approved > 0 ? (d.bl_sold_approved / d.bl_approved) * 100 : 0,
        cost_per_txn: d.bl_txn_approved > 0 ? d.cost / d.bl_txn_approved : 0,
        cpc: d.clicks > 0 ? d.cost / d.clicks : 0,
        cost_per_conversion: d.conversions > 0 ? d.cost / d.conversions : 0,
        cost_per_bl: d.bl_approved > 0 ? d.cost / d.bl_approved : 0,
        blni_pct: d.bl_txn_approved > 0 ? (d.blni / d.bl_txn_approved) * 100 : 0,
        blni_approved_pct: d.bl_approved > 0 ? (d.blni / d.bl_approved) * 100 : 0,
        total_req_approved: d.enq_approved + d.bl_approved + d.calls_approved,
        mcat_div,
        pmcat_div
      };
    }).map(r => {
      const { mcatMap, pmcatMap, ...out } = r as any;
      return out;
    });

    rows.sort((a, b) => a.name.localeCompare(b.name));

    const totals: any = {
      name: 'Total',
      clicks: 0,
      impressions: 0,
      cost: 0,
      conversions: 0,
      bl_sold_approved: 0,
      bl_approved: 0,
      bl_txn_approved: 0,
      blni: 0,
      enq_approved: 0,
      calls_approved: 0,
      unq_purchaser: 0,
      ctr: 0,
      txn_approved_pct: 0,
      bl_sold_pct: 0,
      cost_per_txn: 0,
      cpc: 0,
      cost_per_conversion: 0,
      cost_per_bl: 0,
      mcat_div: 0,
      pmcat_div: 0,
      blni_pct: 0
    };

    rows.forEach(r => {
      totals.clicks += r.clicks;
      totals.impressions += r.impressions;
      totals.cost += r.cost;
      totals.conversions += r.conversions;
      totals.bl_sold_approved += r.bl_sold_approved;
      totals.bl_approved += r.bl_approved;
      totals.bl_txn_approved += r.bl_txn_approved;
      totals.blni += r.blni;
      totals.enq_approved += r.enq_approved;
      totals.calls_approved += r.calls_approved;
      totals.unq_purchaser += r.unq_purchaser;
    });

    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    totals.txn_approved_pct = totals.bl_approved > 0 ? (totals.bl_txn_approved / totals.bl_approved) * 100 : 0;
    totals.bl_sold_pct = totals.bl_approved > 0 ? (totals.bl_sold_approved / totals.bl_approved) * 100 : 0;
    totals.cost_per_txn = totals.bl_txn_approved > 0 ? totals.cost / totals.bl_txn_approved : 0;
    totals.cpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
    totals.cost_per_conversion = totals.conversions > 0 ? totals.cost / totals.conversions : 0;
    totals.cost_per_bl = totals.bl_approved > 0 ? totals.cost / totals.bl_approved : 0;
    totals.blni_pct = totals.bl_txn_approved > 0 ? (totals.blni / totals.bl_txn_approved) * 100 : 0;
    totals.blni_approved_pct = totals.bl_approved > 0 ? (totals.blni / totals.bl_approved) * 100 : 0;
    totals.total_req_approved = totals.enq_approved + totals.bl_approved + totals.calls_approved;
    const activeData = filteredData.filter(d => d.impressions > 0);
    totals.mcat_div = new Set(activeData.map(d => d.mcat)).size;
    totals.pmcat_div = new Set(activeData.map(d => d.pmcat)).size;

    return { rows, totals };
  }, [enrichedData, selectedWeek, isCompareMode, granularity, selectedGroup]);

  // Roll up data by MCAT for table
  const mcatPerformanceData = useMemo(() => {
    if (isCompareMode || granularity !== 'mcat') return null;

    let filteredData = enrichedData.filter(d => d.week_start_date === selectedWeek);
    if (selectedGroup !== 'all') filteredData = filteredData.filter(d => d.group === selectedGroup);
    if (selectedPmcat !== 'all') filteredData = filteredData.filter(d => d.pmcat === selectedPmcat);
    if (selectedMcat !== 'all') filteredData = filteredData.filter(d => d.mcat === selectedMcat);

    const rolledUp = new Map<string, any>();
    filteredData.forEach(d => {
      const key = d.mcat || 'Unknown';
      if (!rolledUp.has(key)) {
        rolledUp.set(key, {
          name: key,
          pmcat: d.pmcat || 'Unknown PMCAT',
          clicks: 0,
          impressions: 0,
          cost: 0,
          conversions: 0,
          bl_sold_approved: 0,
          bl_approved: 0,
          bl_txn_approved: 0,
          blni: 0,
          enq_approved: 0,
          calls_approved: 0,
          unq_purchaser: 0,
          mcatMap: new Map(),
          pmcatMap: new Map()
        });
      }
      const existing = rolledUp.get(key);
      existing.clicks += d.clicks || 0;
      existing.impressions += d.impressions || 0;
      existing.cost += d.cost || 0;
      existing.conversions += d.conversions || 0;
      existing.bl_sold_approved += d.bl_sold_approved || 0;
      existing.bl_approved += d.bl_approved || 0;
      existing.bl_txn_approved += d.bl_txn_approved || 0;
      existing.blni += d.blni || 0;
      existing.enq_approved += d.enq_approved || 0;
      existing.calls_approved += d.calls_approved || 0;
      existing.unq_purchaser += d.unq_purchaser || 0;
      
      if (d.mcat) {
        const isAdRunning = adsRunningSet.has(d.mcat.toLowerCase().trim());
        if (!existing.mcatMap.has(d.mcat)) existing.mcatMap.set(d.mcat, { bl_approved: 0, isAdRunning });
        existing.mcatMap.get(d.mcat).bl_approved += d.bl_approved || 0;

        if (!existing.pmcatMap.has(d.pmcat)) existing.pmcatMap.set(d.pmcat, { bl_approved: 0, isAdRunning: false });
        existing.pmcatMap.get(d.pmcat).bl_approved += d.bl_approved || 0;
        if (isAdRunning) existing.pmcatMap.get(d.pmcat).isAdRunning = true;
      }
    });

    const rows = Array.from(rolledUp.values()).map(d => {
      let mcat_div = null;
      let pmcat_div = null;

      if (timePeriod === 'weekly') {
        let mcat_ad_running = 0; let mcat_ge_10 = 0;
        d.mcatMap.forEach((v: any) => {
          if (v.isAdRunning) mcat_ad_running++;
          if (v.bl_approved >= 10) mcat_ge_10++;
        });
        mcat_div = mcat_ad_running > 0 ? (mcat_ge_10 / mcat_ad_running) * 100 : 0;
        
        let pmcat_ad_running = 0; let pmcat_ge_25 = 0;
        d.pmcatMap.forEach((v: any) => {
          if (v.isAdRunning) pmcat_ad_running++;
          if (v.bl_approved >= 25) pmcat_ge_25++;
        });
        pmcat_div = pmcat_ad_running > 0 ? (pmcat_ge_25 / pmcat_ad_running) * 100 : 0;
      }

      return {
        ...d,
        ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
        txn_approved_pct: d.bl_approved > 0 ? (d.bl_txn_approved / d.bl_approved) * 100 : 0,
        bl_sold_pct: d.bl_approved > 0 ? (d.bl_sold_approved / d.bl_approved) * 100 : 0,
        cost_per_txn: d.bl_txn_approved > 0 ? d.cost / d.bl_txn_approved : 0,
        cpc: d.clicks > 0 ? d.cost / d.clicks : 0,
        cost_per_conversion: d.conversions > 0 ? d.cost / d.conversions : 0,
        cost_per_bl: d.bl_approved > 0 ? d.cost / d.bl_approved : 0,
        blni_pct: d.bl_txn_approved > 0 ? (d.blni / d.bl_txn_approved) * 100 : 0,
        blni_approved_pct: d.bl_approved > 0 ? (d.blni / d.bl_approved) * 100 : 0,
        total_req_approved: d.enq_approved + d.bl_approved + d.calls_approved,
        mcat_div,
        pmcat_div
      };
    }).map(r => {
      const { mcatMap, pmcatMap, ...out } = r as any;
      return out;
    });

    rows.sort((a, b) => a.name.localeCompare(b.name));

    const totals: any = {
      name: 'Total',
      clicks: 0,
      impressions: 0,
      cost: 0,
      conversions: 0,
      bl_sold_approved: 0,
      bl_approved: 0,
      bl_txn_approved: 0,
      blni: 0,
      ctr: 0,
      txn_approved_pct: 0,
      bl_sold_pct: 0,
      cost_per_txn: 0,
      cpc: 0,
      cost_per_conversion: 0,
      cost_per_bl: 0,
      mcat_div: 0,
      pmcat_div: 0,
      blni_pct: 0
    };

    rows.forEach(r => {
      totals.clicks += r.clicks;
      totals.impressions += r.impressions;
      totals.cost += r.cost;
      totals.conversions += r.conversions;
      totals.bl_sold_approved += r.bl_sold_approved;
      totals.bl_approved += r.bl_approved;
      totals.bl_txn_approved += r.bl_txn_approved;
      totals.blni += r.blni;
      totals.enq_approved += r.enq_approved;
      totals.calls_approved += r.calls_approved;
      totals.unq_purchaser += r.unq_purchaser;
    });

    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    totals.txn_approved_pct = totals.bl_approved > 0 ? (totals.bl_txn_approved / totals.bl_approved) * 100 : 0;
    totals.bl_sold_pct = totals.bl_approved > 0 ? (totals.bl_sold_approved / totals.bl_approved) * 100 : 0;
    totals.cost_per_txn = totals.bl_txn_approved > 0 ? totals.cost / totals.bl_txn_approved : 0;
    totals.cpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
    totals.cost_per_conversion = totals.conversions > 0 ? totals.cost / totals.conversions : 0;
    totals.cost_per_bl = totals.bl_approved > 0 ? totals.cost / totals.bl_approved : 0;
    totals.blni_pct = totals.bl_txn_approved > 0 ? (totals.blni / totals.bl_txn_approved) * 100 : 0;
    totals.blni_approved_pct = totals.bl_approved > 0 ? (totals.blni / totals.bl_approved) * 100 : 0;
    totals.total_req_approved = totals.enq_approved + totals.bl_approved + totals.calls_approved;

    if (timePeriod === 'weekly') {
      totals.mcat_div = kpiStats.mcat_div;
      totals.pmcat_div = kpiStats.pmcat_div;
    } else {
      totals.mcat_div = null;
      totals.pmcat_div = null;
    }

    return { rows, totals };
  }, [enrichedData, selectedWeek, isCompareMode, granularity, selectedGroup, selectedPmcat, selectedMcat]);

  // Roll up data for Ranking Analysis (only used in Standard Mode)
  const rankingData = useMemo(() => {
    if (isCompareMode) return { top10: [], bottom10: [] };

    let weeklyData = enrichedData.filter(d => d.week_start_date === selectedWeek);
    if (selectedGroup !== 'all') weeklyData = weeklyData.filter(d => d.group === selectedGroup);
    if (granularity === 'mcat' && selectedPmcat !== 'all') weeklyData = weeklyData.filter(d => d.pmcat === selectedPmcat);

    const rolledUp = new Map<string, any>();

    weeklyData.forEach(d => {
      let key = d.mcat;
      if (granularity === 'pmcat') key = d.pmcat;
      if (granularity === 'group') key = d.group;

      if (!rolledUp.has(key)) {
        rolledUp.set(key, { name: key, clicks: 0, impressions: 0, cost: 0, conversions: 0, ctr: 0, bl_sold_approved: 0, bl_approved: 0, bl_txn_approved: 0, blni: 0, enq_approved: 0, calls_approved: 0, unq_purchaser: 0 });
      }
      const existing = rolledUp.get(key);
      existing.clicks += d.clicks || 0;
      existing.impressions += d.impressions || 0;
      existing.cost += d.cost || 0;
      existing.conversions += d.conversions || 0;
      existing.bl_sold_approved += d.bl_sold_approved || 0;
      existing.bl_approved += d.bl_approved || 0;
      existing.bl_txn_approved += d.bl_txn_approved || 0;
      existing.blni += d.blni || 0;
      existing.enq_approved += d.enq_approved || 0;
      existing.calls_approved += d.calls_approved || 0;
      existing.unq_purchaser += d.unq_purchaser || 0;
    });

    const rolledUpArr = Array.from(rolledUp.values()).map(d => ({
      ...d,
      ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
      txn_approved_pct: d.bl_approved > 0 ? (d.bl_txn_approved / d.bl_approved) * 100 : 0,
      bl_sold_pct: d.bl_approved > 0 ? (d.bl_sold_approved / d.bl_approved) * 100 : 0,
      cost_per_txn: d.bl_txn_approved > 0 ? d.cost / d.bl_txn_approved : 0,
      blni_pct: d.bl_txn_approved > 0 ? (d.blni / d.bl_txn_approved) * 100 : 0,
      blni_approved_pct: d.bl_approved > 0 ? (d.blni / d.bl_approved) * 100 : 0,
      total_req_approved: d.enq_approved + d.bl_approved + d.calls_approved
    }));

    const sorted = [...rolledUpArr].sort((a, b) => b[rankMetric] - a[rankMetric]);

    const bottomSorted = [...rolledUpArr]
      .filter(d => rankMetric !== 'ctr' || d.impressions > 100)
      .sort((a, b) => a[rankMetric] - b[rankMetric]);

    return {
      top10: sorted.slice(0, 10),
      bottom10: bottomSorted.slice(0, 10)
    };
  }, [enrichedData, selectedWeek, granularity, selectedGroup, selectedPmcat, rankMetric, isCompareMode]);

  const bestKpis = useMemo(() => {
    if (compareData.length === 0) return null;
    const best: any = {};
    Object.keys(compareData[0].stats).forEach(k => {
      best[k] = {
        val: compareData[0].stats[k],
        week: compareData[0].week
      };
    });
    compareData.forEach(d => {
      Object.keys(d.stats).forEach(k => {
        if (k === 'cost' || k === 'cost_per_txn') {
          if (d.stats[k] > 0 && (d.stats[k] < best[k].val || best[k].val === 0)) {
            best[k] = { val: d.stats[k], week: d.week };
          }
        } else {
          if (d.stats[k] > best[k].val) {
            best[k] = { val: d.stats[k], week: d.week };
          }
        }
      });
    });
    return best;
  }, [compareData]);

  const aiInsights = useMemo(() => {
    if (isCompareMode) {
      if (compareData.length === 0) return [];
      const insights = [];
      const recentCtr = compareData[0].stats.ctr;
      const oldCtr = compareData[compareData.length - 1].stats.ctr;

      if (recentCtr > oldCtr) {
        insights.push(`Positive Trend: CTR has improved from ${oldCtr.toFixed(1)}% to ${recentCtr.toFixed(1)}% over the selected period.`);
      } else if (recentCtr < oldCtr) {
        insights.push(`Attention Required: CTR has declined from ${oldCtr.toFixed(1)}% to ${recentCtr.toFixed(1)}%. Consider refreshing creatives or adjusting bids.`);
      }

      const maxCostWeek = [...compareData].sort((a, b) => b.stats.cost - a.stats.cost)[0];
      if (maxCostWeek && maxCostWeek.stats.cost > 0) {
        insights.push(`Budget Check: Highest spend occurred during ${maxCostWeek.week} (₹${maxCostWeek.stats.cost.toLocaleString(undefined, { maximumFractionDigits: 1 })}). Check if conversions aligned with this spend.`);
      }
      return insights;
    }

    if (rankingData.top10.length === 0) return [];

    const insights = [];
    const topPerformer = rankingData.top10[0];
    const topCost = [...rankingData.top10, ...rankingData.bottom10].sort((a, b) => b.cost - a.cost)[0];
    const avgCtr = kpiStats.ctr;
    const metricLabel = METRICS.find(m => m.key === rankMetric)?.label || rankMetric;

    insights.push(`Top Driver: ${topPerformer.name} is leading the selected group with the highest ${metricLabel}.`);

    if (topCost && topCost.cost > 0) {
      insights.push(`Budget Focus: ${topCost.name} consumed the highest budget (₹${topCost.cost.toLocaleString(undefined, { maximumFractionDigits: 1 })}) this period.`);
    }

    if (rankingData.bottom10.length > 0) {
      const bottom = rankingData.bottom10[0];
      insights.push(`Action Required: ${bottom.name} is heavily underperforming in ${metricLabel}. Consider pausing or optimizing its bids.`);
    }

    if (avgCtr > 2.5) {
      insights.push(`Healthy Engagement: Overall CTR of ${avgCtr.toFixed(1)}% is performing above the 2.5% threshold benchmark.`);
    } else {
      insights.push(`Low Engagement: Overall CTR is ${avgCtr.toFixed(1)}%, which is below the optimal target benchmark.`);
    }

    return insights;
  }, [rankingData, rankMetric, kpiStats, isCompareMode, compareData]);

  const resetFilters = (level: string) => {
    if (level === 'group') {
      setSelectedGroup('all'); setSelectedPmcat('all'); setSelectedMcat('all');
    }
    if (level === 'pmcat') {
      setSelectedPmcat('all'); setSelectedMcat('all');
    }
  };

  const formatWeekLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 2) return dateStr;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mIdx = parseInt(parts[1], 10) - 1;
    if (timePeriod === 'monthly') {
      return `${monthNames[mIdx]} ${parts[0]}`;
    }
    if (parts.length < 3) return dateStr;
    return `${monthNames[mIdx]} ${parseInt(parts[2], 10)}`;
  };

  const formatVal = (val: number | null, metric: string) => {
    if (val === null || val === undefined) return 'N/A';
    if (metric === 'mcat_div' || metric === 'pmcat_div') return `${(val || 0).toFixed(1)}%`;
    if (metric === 'cost' || metric === 'cost_per_txn' || metric === 'cost_per_conversion' || metric === 'cost_per_bl' || metric === 'cpc') return `₹${(val || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
    if (metric === 'conversions') return (val || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
    if (metric === 'ctr' || metric === 'txn_approved_pct' || metric === 'bl_sold_pct' || metric === 'blni_pct' || metric === 'blni_approved_pct') return `${(val || 0).toFixed(1)}%`;
    return (val || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  const getEntityTitle = () => {
    if (granularity === 'group') return selectedGroup === 'all' ? 'All Groups' : selectedGroup;
    if (granularity === 'pmcat') return selectedPmcat === 'all' ? (selectedGroup === 'all' ? 'All PMCATs' : `PMCATs in ${selectedGroup}`) : selectedPmcat;
    return selectedMcat === 'all' ? (selectedPmcat === 'all' ? 'All MCATs' : `MCATs in ${selectedPmcat}`) : selectedMcat;
  };

  const sanitizeFileName = (value: string) => {
    return value.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();
  };

  const downloadDiversityExcel = (type: 'mcat' | 'pmcat') => {
    const isMcat = type === 'mcat';
    const label = isMcat ? 'MCAT' : 'PMCAT';
    const threshold = isMcat ? 10 : 25;
    const modalData = isMcat ? mcatModalData : pmcatModalData;
    const adsRunningList = modalData
      .filter(item => item.isAdRunning)
      .sort((a, b) => b.bl_approved - a.bl_approved);
    const qualifiedList = modalData
      .filter(item => item.bl_approved >= threshold)
      .sort((a, b) => b.bl_approved - a.bl_approved);
    const diversity = adsRunningList.length > 0
      ? Number(((qualifiedList.length / adsRunningList.length) * 100).toFixed(1))
      : 0;

    const wb = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.json_to_sheet([
      { Metric: 'Entity', Value: getEntityTitle() },
      { Metric: 'Time Period', Value: timePeriod },
      { Metric: 'Selected Week', Value: selectedWeek || 'N/A' },
      { Metric: `Total Ads Running ${label}s`, Value: adsRunningList.length },
      { Metric: `Total ${label}s (BL >= ${threshold})`, Value: qualifiedList.length },
      { Metric: 'Diversity %', Value: diversity }
    ]);
    const allDataSheet = XLSX.utils.json_to_sheet(
      [...modalData]
        .sort((a, b) => b.bl_approved - a.bl_approved)
        .map(item => ({
          [`${label} Name`]: item.name,
          'BL Approved': item.bl_approved,
          'Ads Running': item.isAdRunning ? 'Yes' : 'No',
          [`BL >= ${threshold}`]: item.bl_approved >= threshold ? 'Yes' : 'No'
        }))
    );
    const adsRunningSheet = XLSX.utils.json_to_sheet(
      adsRunningList.map(item => ({
        [`${label} Name`]: item.name,
        'BL Approved': item.bl_approved
      }))
    );
    const qualifiedSheet = XLSX.utils.json_to_sheet(
      qualifiedList.map(item => ({
        [`${label} Name`]: item.name,
        'BL Approved': item.bl_approved
      }))
    );

    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(wb, allDataSheet, `All_${label}s`);
    XLSX.utils.book_append_sheet(wb, adsRunningSheet, 'Ads_Running');
    XLSX.utils.book_append_sheet(wb, qualifiedSheet, `BL_GTE_${threshold}`);

    const weekLabel = selectedWeek || timePeriod;
    XLSX.writeFile(
      wb,
      `${sanitizeFileName(label)}_diversity_${sanitizeFileName(getEntityTitle())}_${sanitizeFileName(weekLabel)}.xlsx`
    );
  };

  const downloadCompareCsv = () => {
    let csv = `Metric,${compareWeeksList.join(',')}\n`;
    const activeMetrics = timePeriod === 'weekly' ? METRICS : METRICS.filter(m => m.key !== 'mcat_div' && m.key !== 'pmcat_div');
    activeMetrics.forEach(m => {
      let row = `${m.label},`;
      row += compareData.map(d => formatVal(d.stats[m.key], m.key).replace(/,/g, '')).join(',');
      csv += row + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compare_${getEntityTitle().replace(/ /g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadReportCsv = () => {
    let filename = '';

    if (granularity === 'group' && groupPerformanceData) {
      filename = `group_performance_${timePeriod}_${selectedWeek}.csv`;
    } else if (granularity === 'pmcat' && pmcatPerformanceData) {
      filename = `pmcat_performance_${timePeriod}_${selectedWeek}.csv`;
    } else if (granularity === 'mcat' && mcatPerformanceData) {
      filename = `mcat_performance_${timePeriod}_${selectedWeek}.csv`;
    }

    let headers = ['Group Name', 'Impressions', 'Clicks', 'CTR %', 'Cost', 'Conversions', 'CPC', 'Cost/Conv', 'BL Approved', 'BL Sold', 'Txn', 'Cost/BL', 'Txn (Appr) %', 'BL Sold %', 'Cost / Txn', 'MCAT Div.', 'PMCAT Div.', 'BLNI', 'BLNI / Txn %', 'BLNI / Appr. %', 'Enq Approved', 'Calls Approved', 'Total Req Approved'];
    if (granularity === 'pmcat') headers = ['PMCAT', 'Parent Group', 'Impressions', 'Clicks', 'CTR %', 'Cost', 'Conversions', 'CPC', 'Cost/Conv', 'BL Approved', 'BL Sold', 'Txn', 'Cost/BL', 'Txn (Appr) %', 'BL Sold %', 'Cost / Txn', 'MCAT Div.', 'PMCAT Div.', 'BLNI', 'BLNI / Txn %', 'BLNI / Appr. %', 'Enq Approved', 'Calls Approved', 'Total Req Approved'];
    if (granularity === 'mcat') headers = ['MCAT', 'Parent PMCAT', 'Impressions', 'Clicks', 'CTR %', 'Cost', 'Conversions', 'CPC', 'Cost/Conv', 'BL Approved', 'BL Sold', 'Txn', 'Cost/BL', 'Txn (Appr) %', 'BL Sold %', 'Cost / Txn', 'MCAT Div.', 'PMCAT Div.', 'BLNI', 'BLNI / Txn %', 'BLNI / Appr. %', 'Enq Approved', 'Calls Approved', 'Total Req Approved'];

    const dataToDownload = (granularity === 'group' ? groupPerformanceData : (granularity === 'pmcat' ? pmcatPerformanceData : mcatPerformanceData));
    if (!dataToDownload) return;

    let csv = headers.join(',') + '\n';
    dataToDownload.rows.forEach((row: any) => {
      const rowData = [
        row.name,
        granularity !== 'group' ? (row.pmcat || row.group) : null,
        row.impressions,
        row.clicks,
        row.ctr,
        row.cost,
        row.conversions,
        row.cpc,
        row.cost_per_conversion,
        row.bl_approved,
        row.bl_sold_approved,
        row.bl_txn_approved,
        row.cost_per_bl,
        row.txn_approved_pct,
        row.bl_sold_pct,
        // Conditionally include mcat_div and pmcat_div
        ...((timePeriod === 'weekly') ? [row.mcat_div, row.pmcat_div] : []),
        row.blni_pct,
        row.blni_approved_pct,
        row.enq_approved,
        row.calls_approved,
        row.total_req_approved
      ].filter(v => v !== null);
      csv += rowData.join(',') + '\n';
    });

    const totalsRow = [
      'Total',
      granularity !== 'group' ? '' : null,
      dataToDownload.totals.impressions,
      dataToDownload.totals.clicks,
      dataToDownload.totals.ctr,
      dataToDownload.totals.cost,
      dataToDownload.totals.conversions,
      dataToDownload.totals.cpc,
      dataToDownload.totals.cost_per_conversion,
      dataToDownload.totals.bl_approved,
      dataToDownload.totals.bl_sold_approved,
      dataToDownload.totals.bl_txn_approved,
      dataToDownload.totals.cost_per_bl,
      dataToDownload.totals.txn_approved_pct,
      dataToDownload.totals.bl_sold_pct,
      // Conditionally include totals for mcat_div and pmcat_div
      ...((timePeriod === 'weekly') ? [dataToDownload.totals.mcat_div, dataToDownload.totals.pmcat_div] : []),
      dataToDownload.totals.blni_pct,
      dataToDownload.totals.blni_approved_pct,
      dataToDownload.totals.enq_approved,
      dataToDownload.totals.calls_approved,
      dataToDownload.totals.total_req_approved
    ].filter(v => v !== null);
    csv += totalsRow.join(',') + '\n';

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="tab on" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--bdr2)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: 'var(--purple)', fontWeight: 600, fontSize: '14px' }}>Querying Redshift & Performing Dynamic Mapping...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab on">
        <div className="alert alert-warn">
          <strong>Connection Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="tab on">
      {/* Top Filter Bar */}
      <div className="camp-filter-bar" style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <label>Time Period</label>
            <select value={timePeriod} onChange={(e) => setTimePeriod(e.target.value as any)} style={{ background: 'var(--bg2)', border: '1px solid var(--teal)', color: 'var(--teal)' }}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label>Granularity View</label>
            <select value={granularity} onChange={(e) => {
              setGranularity(e.target.value as any);
              resetFilters('group');
            }} style={{ background: 'var(--bg2)', border: '1px solid var(--teal)', color: 'var(--teal)' }}>
              <option value="group">Group Level</option>
              <option value="pmcat">PMCAT Level</option>
              <option value="mcat">MCAT Level</option>
            </select>
          </div>
          <div>
            <label>View Mode</label>
            <select value={isCompareMode ? 'compare' : 'standard'} onChange={(e) => setIsCompareMode(e.target.value === 'compare')} style={{ fontWeight: isCompareMode ? 'bold' : 'normal', color: isCompareMode ? '#ab47bc' : 'inherit' }}>
              <option value="standard">Standard View</option>
              <option value="compare">Compare Mode 📊</option>
            </select>
          </div>

          {!isCompareMode ? (
            <div>
              <label>{timePeriod === 'weekly' ? 'Week Starting' : timePeriod === 'daily' ? 'Date' : 'Month'}</label>
              <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
                {weeks.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label>Compare Last (N) {timePeriod === 'weekly' ? 'Weeks' : timePeriod === 'daily' ? 'Days' : 'Months'}</label>
              <select value={compareWeeksCount} onChange={(e) => setCompareWeeksCount(Number(e.target.value))}>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                  <option key={n} value={n}>
                    {n} {timePeriod === 'weekly' ? 'Weeks' : timePeriod === 'daily' ? 'Days' : 'Months'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Cascading Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', padding: '10px', background: 'var(--bg2)', borderRadius: '8px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Group Filter</label>
            <SearchableSelect
              value={selectedGroup}
              onChange={(val) => { setSelectedGroup(val); resetFilters('pmcat'); }}
              options={[
                { label: 'All Groups', value: 'all' },
                ...availableGroups.map(g => ({ label: g, value: g }))
              ]}
              style={{ maxWidth: '250px' }}
            />
          </div>

          {(granularity === 'pmcat' || granularity === 'mcat') && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>PMCAT Filter</label>
              <SearchableSelect
                value={selectedPmcat}
                onChange={(val) => { setSelectedPmcat(val); resetFilters('mcat'); }}
                options={[
                  { label: 'All PMCATs', value: 'all' },
                  ...availablePmcats.map(p => ({ label: p, value: p }))
                ]}
                style={{ maxWidth: '250px' }}
              />
            </div>
          )}

          {granularity === 'mcat' && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>MCAT Filter</label>
              <SearchableSelect
                value={selectedMcat}
                onChange={(val) => setSelectedMcat(val)}
                options={[
                  { label: 'All MCATs', value: 'all' },
                  ...availableMcats.map(m => ({ label: m, value: m }))
                ]}
                style={{ maxWidth: '250px' }}
              />
            </div>
          )}
        </div>
      </div>

      {isCompareMode && bestKpis ? (
        <div className="compare-view">
          {/* Top Section: Best KPIs & AI Insights Side by Side */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch', marginBottom: '25px' }}>
            {/* Best KPIs Banner */}
            <div className="banner" style={{ flex: '2', margin: 0, background: 'linear-gradient(90deg, var(--surf2), var(--surf))', borderLeft: '4px solid #ab47bc' }}>
              <div className="bn-left">
                <div style={{ fontSize: '24px' }}>🏆</div>
                <div>
                  <div className="bn-title" style={{ color: 'var(--txt)' }}>Best Ever KPIs</div>
                  <div className="bn-sub">Across {compareWeeksCount} {timePeriod === 'weekly' ? 'weeks' : timePeriod === 'daily' ? 'days' : 'months'} ({compareWeeksList[compareWeeksList.length - 1]} to {compareWeeksList[0]})</div>
                </div>
              </div>
              <div className="bn-stats" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <div className="bn-val" style={{ color: C.b }}>{bestKpis.impressions.val.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                  <div className="bn-lbl">Impressions</div>
                  <div style={{ fontSize: '11px', color: 'var(--purple)', fontWeight: 600, marginTop: '2px', textAlign: 'center' }}>{formatWeekLabel(bestKpis.impressions.week)}</div>
                </div>
                <div>
                  <div className="bn-val" style={{ color: C.t }}>{bestKpis.clicks.val.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                  <div className="bn-lbl">Clicks</div>
                  <div style={{ fontSize: '11px', color: 'var(--purple)', fontWeight: 600, marginTop: '2px', textAlign: 'center' }}>{formatWeekLabel(bestKpis.clicks.week)}</div>
                </div>
                <div>
                  <div className="bn-val" style={{ color: C.g }}>{bestKpis.ctr.val.toFixed(1)}%</div>
                  <div className="bn-lbl">CTR</div>
                  <div style={{ fontSize: '11px', color: 'var(--purple)', fontWeight: 600, marginTop: '2px', textAlign: 'center' }}>{formatWeekLabel(bestKpis.ctr.week)}</div>
                </div>
                <div>
                  <div className="bn-val" style={{ color: C.r }}>₹{bestKpis.cost.val.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                  <div className="bn-lbl">Cost (Min)</div>
                  <div style={{ fontSize: '11px', color: 'var(--purple)', fontWeight: 600, marginTop: '2px', textAlign: 'center' }}>{formatWeekLabel(bestKpis.cost.week)}</div>
                </div>
                <div>
                  <div className="bn-val" style={{ color: C.a }}>{bestKpis.conversions.val.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                  <div className="bn-lbl">Conversions</div>
                  <div style={{ fontSize: '11px', color: 'var(--purple)', fontWeight: 600, marginTop: '2px', textAlign: 'center' }}>{formatWeekLabel(bestKpis.conversions.week)}</div>
                </div>
                <div>
                  <div className="bn-val" style={{ color: '#29b6f6' }}>{bestKpis.txn_approved_pct.val.toFixed(1)}%</div>
                  <div className="bn-lbl">Txn (Appr) %</div>
                  <div style={{ fontSize: '11px', color: 'var(--purple)', fontWeight: 600, marginTop: '2px', textAlign: 'center' }}>{formatWeekLabel(bestKpis.txn_approved_pct.week)}</div>
                </div>
                <div>
                  <div className="bn-val" style={{ color: '#ef5350' }}>₹{bestKpis.cost_per_txn.val.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                  <div className="bn-lbl">Cost/Txn (Min)</div>
                  <div style={{ fontSize: '11px', color: 'var(--purple)', fontWeight: 600, marginTop: '2px', textAlign: 'center' }}>{formatWeekLabel(bestKpis.cost_per_txn.week)}</div>
                </div>
              </div>
            </div>

            {/* AI Insights Block */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
              <div className="sh" style={{ margin: '0 0 10px 0' }}>
                <h2 style={{ fontSize: '15px' }}>✨ AI Insights <span>Based on {compareWeeksCount} {timePeriod === 'weekly' ? 'weeks' : timePeriod === 'daily' ? 'days' : 'months'} trend</span></h2>
              </div>
              <div className="cc" style={{ margin: 0, flex: 1, background: 'var(--bg2)', border: '1px solid var(--teal)', overflowY: 'auto', padding: '15px' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {aiInsights.map((insight, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ color: 'var(--teal)' }}>✦</span>
                      <span style={{ fontSize: '13px', lineHeight: '1.4' }}>{insight}</span>
                    </li>
                  ))}
                  {aiInsights.length === 0 && <li style={{ color: 'var(--purple)', fontWeight: 600, fontSize: '13px' }}>Not enough data to generate insights.</li>}
                </ul>
              </div>
            </div>
          </div>

          <div className="cc" style={{ margin: 0, marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <div className="ct">Metric Comparison Table</div>
                <div className="cs">{getEntityTitle()}</div>
              </div>
              <button onClick={downloadCompareCsv} style={{ background: 'var(--teal)', color: '#000', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>⬇ Download CSV</button>
            </div>
            <div className="tw">
              <table className="dt">
                <thead>
                  <tr>
                    <th style={{ minWidth: '150px' }}>Metric</th>
                    {compareWeeksList.map(w => <th key={w} style={{ textAlign: 'right' }}>{w}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {METRICS.filter(m => timePeriod === 'weekly' || (m.key !== 'mcat_div' && m.key !== 'pmcat_div')).map(m => (
                    <tr key={m.key}>
                      <td style={{ fontWeight: 500 }}>{m.label}</td>
                      {compareData.map(d => (
                        <td key={d.week} className="num">{formatVal(d.stats[m.key], m.key)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="cg" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="cc" style={{ margin: 0 }}>
              <div className="ct">Clicks vs Impressions Trend</div>
              <ChartComponent
                type="bar"
                height={300}
                data={{
                  labels: [...compareWeeksList].reverse(),
                  datasets: [
                    {
                      label: 'Impressions',
                      data: [...compareData].reverse().map(d => d.stats.impressions),
                      backgroundColor: C.b + '80'
                    },
                    {
                      label: 'Clicks',
                      data: [...compareData].reverse().map(d => d.stats.clicks),
                      backgroundColor: C.t + '80'
                    }
                  ]
                }}
              />
            </div>
            <div className="cc" style={{ margin: 0 }}>
              <div className="ct">CTR % Trend</div>
              <ChartComponent
                type="line"
                height={300}
                data={{
                  labels: [...compareWeeksList].reverse(),
                  datasets: [
                    {
                      label: 'CTR %',
                      data: [...compareData].reverse().map(d => d.stats.ctr),
                      borderColor: C.g,
                      fill: false,
                      tension: 0.3
                    }
                  ]
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Top Section: Standard View KPIs & AI Insights Side by Side */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch', marginBottom: '25px' }}>
            
            {/* Standard View Mode KPIs */}
            <div className="banner" style={{ flex: '2', margin: 0 }}>
              <div className="bn-left">
                <div style={{ fontSize: '24px' }}>⚡</div>
                <div>
                  <div className="bn-title" style={{ color: C.t }}>
                    {getEntityTitle()}
                  </div>
                  <div className="bn-sub">{timePeriod === 'weekly' ? 'Week' : timePeriod === 'daily' ? 'Date' : 'Month'} of {selectedWeek} · Redshift DWH</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                <div>
                  <div style={{ color: 'var(--txt)', fontSize: '13px', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Google Ads Performance</div>
                  <div className="bn-stats" style={{ display: 'flex', gap: '22px', flexWrap: 'wrap' }}>
                    <div><div className="bn-val" style={{ color: C.b }}>{formatVal(kpiStats.impressions, 'impressions')}</div><div className="bn-lbl">Impressions</div></div>
                    <div><div className="bn-val" style={{ color: C.t }}>{formatVal(kpiStats.clicks, 'clicks')}</div><div className="bn-lbl">Clicks</div></div>
                    <div><div className="bn-val" style={{ color: C.g }}>{formatVal(kpiStats.ctr, 'ctr')}</div><div className="bn-lbl">CTR</div></div>
                    <div><div className="bn-val" style={{ color: C.r }}>{formatVal(kpiStats.cost, 'cost')}</div><div className="bn-lbl">Cost</div></div>
                    <div><div className="bn-val" style={{ color: C.a }}>{formatVal(kpiStats.conversions, 'conversions')}</div><div className="bn-lbl">Conversions</div></div>
                    <div><div className="bn-val" style={{ color: '#ffb74d' }}>{formatVal(kpiStats.cpc, 'cpc')}</div><div className="bn-lbl">CPC</div></div>
                    <div><div className="bn-val" style={{ color: '#ef5350' }}>{formatVal(kpiStats.cost_per_conversion, 'cost_per_conversion')}</div><div className="bn-lbl">Cost/Conversion</div></div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--bdr2)', paddingTop: '15px' }}>
                  <div style={{ color: 'var(--txt)', fontSize: '13px', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Lead Performance</div>
                  <div className="bn-stats" style={{ display: 'flex', gap: '22px', flexWrap: 'wrap' }}>
                    <div><div className="bn-val" style={{ color: C.p }}>{formatVal(kpiStats.bl_approved, 'bl_approved')}</div><div className="bn-lbl">BL Approved</div></div>
                    <div><div className="bn-val" style={{ color: '#66bb6a' }}>{formatVal(kpiStats.bl_sold_approved, 'bl_sold_approved')}</div><div className="bn-lbl">BL Sold</div></div>
                    <div><div className="bn-val" style={{ color: C.d }}>{formatVal(kpiStats.bl_txn_approved, 'bl_txn_approved')}</div><div className="bn-lbl">Txn</div></div>
                    <div><div className="bn-val" style={{ color: '#ba68c8' }}>{formatVal(kpiStats.cost_per_bl, 'cost_per_bl')}</div><div className="bn-lbl">Cost / BL</div></div>
                    <div><div className="bn-val" style={{ color: '#29b6f6' }}>{formatVal(kpiStats.txn_approved_pct, 'txn_approved_pct')}</div><div className="bn-lbl">Txn (Appr) %</div></div>
                    <div><div className="bn-val" style={{ color: '#ffca28' }}>{formatVal(kpiStats.bl_sold_pct, 'bl_sold_pct')}</div><div className="bn-lbl">BL Sold %</div></div>
                    <div><div className="bn-val" style={{ color: '#ef5350' }}>{formatVal(kpiStats.cost_per_txn, 'cost_per_txn')}</div><div className="bn-lbl">Cost / Txn</div></div>
                    {timePeriod === 'weekly' && (
                      <>
                        <div>
                          <div 
                            className="bn-val" 
                            style={{ color: '#9ccc65', cursor: kpiStats.mcatMap ? 'pointer' : 'default', textDecoration: kpiStats.mcatMap ? 'underline' : 'none' }} 
                            onClick={() => {
                              if (kpiStats.mcatMap) {
                                setMcatModalData(Array.from(kpiStats.mcatMap.entries()).map(([k, v]: any) => ({ name: k, isAdRunning: v.isAdRunning, bl_approved: v.bl_approved })));
                                setShowMcatModal(true);
                              }
                            }}
                          >
                            {formatVal(kpiStats.mcat_div, 'mcat_div')}
                          </div>
                          <div className="bn-lbl">MCAT Div.</div>
                        </div>
                        <div>
                          <div 
                            className="bn-val" 
                            style={{ color: '#26a69a', cursor: kpiStats.pmcatMap ? 'pointer' : 'default', textDecoration: kpiStats.pmcatMap ? 'underline' : 'none' }}
                            onClick={() => {
                              if (kpiStats.pmcatMap) {
                                setPmcatModalData(Array.from(kpiStats.pmcatMap.entries()).map(([k, v]: any) => ({ name: k, isAdRunning: v.isAdRunning, bl_approved: v.bl_approved })));
                                setShowPmcatModal(true);
                              }
                            }}
                          >
                            {formatVal(kpiStats.pmcat_div, 'pmcat_div')}
                          </div>
                          <div className="bn-lbl">PMCAT Div.</div>
                        </div>
                      </>
                    )}
                    <div><div className="bn-val" style={{ color: '#ff8a65' }}>{formatVal(kpiStats.blni, 'blni')}</div><div className="bn-lbl">BLNI</div></div>
                    <div><div className="bn-val" style={{ color: '#ff7043' }}>{formatVal(kpiStats.blni_pct, 'blni_pct')}</div><div className="bn-lbl">BLNI / Txn %</div></div>
                    <div><div className="bn-val" style={{ color: '#ff8a65' }}>{formatVal(kpiStats.blni_approved_pct, 'blni_approved_pct')}</div><div className="bn-lbl">BLNI / Appr. %</div></div>
                    <div><div className="bn-val" style={{ color: '#4dd0e1' }}>{formatVal(kpiStats.enq_approved, 'enq_approved')}</div><div className="bn-lbl">Enq Approved</div></div>
                    <div><div className="bn-val" style={{ color: '#81c784' }}>{formatVal(kpiStats.calls_approved, 'calls_approved')}</div><div className="bn-lbl">Calls Approved</div></div>
                    <div><div className="bn-val" style={{ color: '#ba68c8' }}>{formatVal(kpiStats.total_req_approved, 'total_req_approved')}</div><div className="bn-lbl">Total Req Appr.</div></div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insights Block */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
              <div className="sh" style={{ margin: '0 0 10px 0' }}>
                <h2 style={{ fontSize: '15px' }}>✨ AI Insights <span>Based on selected filters</span></h2>
              </div>
              <div className="cc" style={{ margin: 0, flex: 1, background: 'var(--bg2)', border: '1px solid var(--teal)', overflowY: 'auto', padding: '15px' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {aiInsights.map((insight, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ color: 'var(--teal)' }}>✦</span>
                      <span style={{ fontSize: '13px', lineHeight: '1.4' }}>{insight}</span>
                    </li>
                  ))}
                  {aiInsights.length === 0 && <li style={{ color: 'var(--purple)', fontWeight: 600, fontSize: '13px' }}>Not enough data to generate insights for this selection.</li>}
                </ul>
              </div>
            </div>

          </div>

          { ((granularity === 'group' && selectedGroup === 'all') ||
             (granularity === 'pmcat' && selectedPmcat === 'all') ||
             (granularity === 'mcat' && selectedMcat === 'all')) && (
            <>
              <div className="sh" style={{ marginTop: '30px' }}>
                <h2>{granularity.toUpperCase()} Ranking Analysis <span>{timePeriod === 'weekly' ? 'Week' : timePeriod === 'daily' ? 'Date' : 'Month'} of {selectedWeek}</span></h2>
              </div>

              <div style={{ marginBottom: '20px', maxWidth: '300px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--teal)', fontWeight: 'bold' }}>Rank By KPI</label>
                <SearchableSelect
                  value={rankMetric}
                  onChange={(val) => setRankMetric(val)}
                  options={METRICS.map(m => ({ label: `Rank by ${m.label}`, value: m.key }))}
                />
              </div>

              <div className="cg" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
                <div className="cc" style={{ margin: 0 }}>
                  <div className="ct">🏆 Top 10 {granularity.toUpperCase()}s</div>
                  <div className="cs">Highest {METRICS.find(m => m.key === rankMetric)?.label}</div>
                  <div className="tw" style={{ marginTop: '15px' }}>
                    <table className="dt">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>{granularity.toUpperCase()} Name</th>
                          <th className="num">{METRICS.find(m => m.key === rankMetric)?.label}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankingData.top10.map((item, idx) => (
                          <tr key={item.name + idx}>
                            <td style={{ color: 'var(--purple)', fontWeight: 600, width: '40px' }}>#{idx + 1}</td>
                            <td style={{ fontWeight: 500 }}>{item.name}</td>
                            <td className="num hi">{formatVal(item[rankMetric], rankMetric)}</td>
                          </tr>
                        ))}
                        {rankingData.top10.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center' }}>No data</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="cc" style={{ margin: 0 }}>
                  <div className="ct">⚠️ Bottom 10 {granularity.toUpperCase()}s</div>
                  <div className="cs">Lowest {METRICS.find(m => m.key === rankMetric)?.label} {rankMetric === 'ctr' ? '(Min 100 Impr)' : ''}</div>
                  <div className="tw" style={{ marginTop: '15px' }}>
                    <table className="dt">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>{granularity.toUpperCase()} Name</th>
                          <th className="num">{METRICS.find(m => m.key === rankMetric)?.label}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankingData.bottom10.map((item, idx) => (
                          <tr key={item.name + idx}>
                            <td style={{ color: 'var(--purple)', fontWeight: 600, width: '40px' }}>#{idx + 1}</td>
                            <td style={{ fontWeight: 500 }}>{item.name}</td>
                            <td className="num bd">{formatVal(item[rankMetric], rankMetric)}</td>
                          </tr>
                        ))}
                        {rankingData.bottom10.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center' }}>No data</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="sh" style={{ marginTop: '30px' }}>
            <h2>{timePeriod === 'weekly' ? '12-Week Trend' : timePeriod === 'daily' ? '30-Day Trend' : '12-Month Trend'} <span>{getEntityTitle()}</span></h2>
          </div>
          <div className="cg" style={{ gridTemplateColumns: '2fr 1fr' }}>
            <div className="cc w" style={{ gridColumn: 'span 1' }}>
              <div className="ct">Clicks & Impressions Trend</div>
              <ChartComponent
                type="line"
                height={300}
                data={{
                  labels: weeks.slice().reverse(),
                  datasets: [
                    {
                      label: 'Impressions',
                      data: weeks.slice().reverse().map(w => {
                        let wData = enrichedData.filter(d => d.week_start_date === w);
                        if (selectedGroup !== 'all') wData = wData.filter(d => d.group === selectedGroup);
                        if (granularity !== 'group' && selectedPmcat !== 'all') wData = wData.filter(d => d.pmcat === selectedPmcat);
                        if (granularity === 'mcat' && selectedMcat !== 'all') wData = wData.filter(d => d.mcat === selectedMcat);
                        return wData.reduce((sum, d) => sum + d.impressions, 0);
                      }),
                      borderColor: C.b,
                      backgroundColor: C.b + '18',
                      yAxisID: 'y',
                      tension: 0.35,
                      fill: true
                    },
                    {
                      label: 'Clicks',
                      data: weeks.slice().reverse().map(w => {
                        let wData = enrichedData.filter(d => d.week_start_date === w);
                        if (selectedGroup !== 'all') wData = wData.filter(d => d.group === selectedGroup);
                        if (granularity !== 'group' && selectedPmcat !== 'all') wData = wData.filter(d => d.pmcat === selectedPmcat);
                        if (granularity === 'mcat' && selectedMcat !== 'all') wData = wData.filter(d => d.mcat === selectedMcat);
                        return wData.reduce((sum, d) => sum + d.clicks, 0);
                      }),
                      borderColor: C.t,
                      backgroundColor: C.t + '18',
                      yAxisID: 'y1',
                      tension: 0.35,
                      fill: true
                    }
                  ]
                }}
                options={{
                  scales: {
                    y: { type: 'linear', display: true, position: 'left' },
                    y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } }
                  }
                }}
              />
            </div>
            <div className="cc" style={{ gridColumn: 'span 1' }}>
              <div className="ct">CTR % Trend</div>
              <ChartComponent
                type="line"
                height={300}
                data={{
                  labels: weeks.slice().reverse(),
                  datasets: [{
                    label: 'CTR%',
                    data: weeks.slice().reverse().map(w => {
                      let wData = enrichedData.filter(d => d.week_start_date === w);
                      if (selectedGroup !== 'all') wData = wData.filter(d => d.group === selectedGroup);
                      if (granularity !== 'group' && selectedPmcat !== 'all') wData = wData.filter(d => d.pmcat === selectedPmcat);
                      if (granularity === 'mcat' && selectedMcat !== 'all') wData = wData.filter(d => d.mcat === selectedMcat);
                      const imp = wData.reduce((sum, d) => sum + d.impressions, 0);
                      const clk = wData.reduce((sum, d) => sum + d.clicks, 0);
                      return imp > 0 ? (clk / imp) * 100 : 0;
                    }),
                    borderColor: C.g,
                    tension: 0.35,
                    fill: false
                  }]
                }}
              />
            </div>
          </div>

          {/* Group-wise Summary Table */}
          {granularity === 'group' && groupPerformanceData && (
            <div className="cc" style={{ margin: '30px 0 0 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div className="ct">📋 Group Performance Summary</div>
                  <div className="cs">{timePeriod === 'daily' ? 'Daily' : timePeriod === 'weekly' ? 'Weekly' : 'Monthly'} KPI metrics rolled up by Category Group for {selectedWeek}</div>
                </div>
                <button onClick={downloadReportCsv} style={{ background: 'var(--teal)', color: '#000', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>⬇ Download CSV</button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: '4px 12px', background: 'var(--bg1)', color: 'var(--teal)', border: '1px solid var(--teal)', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' }}>Prev</button>
                <span style={{ padding: '4px 8px', color: '#fff' }}>Page {page + 1}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * 30 >= groupPerformanceData.rows.length} style={{ padding: '4px 12px', background: 'var(--bg1)', color: 'var(--teal)', border: '1px solid var(--teal)', borderRadius: '4px', cursor: 'pointer', marginLeft: '8px' }}>Next</button>
              </div>
              <div className="tw" style={{ marginTop: '5px', maxHeight: '500px', overflowY: 'auto', overflowX: 'auto', position: 'relative' }}>
                <table className="dt" style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: '1500px' }}>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', left: 0, top: 0, background: 'var(--bg2)', zIndex: 50, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Group Name</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Impressions</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Clicks</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>CTR</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Cost</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Conversions</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>CPC</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Cost/Conv</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>BL Approved</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>BL Sold</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Txn</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Cost/BL</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Txn (Appr) %</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>BL Sold %</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Cost / Txn</th>
                      {timePeriod === 'weekly' && <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>MCAT Div.</th>}
                      {timePeriod === 'weekly' && <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>PMCAT Div.</th>}
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>BLNI</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>BLNI / Txn %</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>BLNI / Appr. %</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Enq Appr.</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Calls Appr.</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Total Req Appr.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupPerformanceData.rows.slice(page * 30, (page + 1) * 30).map((row: any) => (
                      <tr key={row.name}>
                        <td style={{ position: 'sticky', left: 0, background: 'var(--bg2)', zIndex: 30, fontWeight: 500 }}>{row.name}</td>
                        <td className="num">{formatVal(row.impressions, 'impressions')}</td>
                        <td className="num">{formatVal(row.clicks, 'clicks')}</td>
                        <td className="num" style={{ color: C.g }}>{formatVal(row.ctr, 'ctr')}</td>
                        <td className="num">{formatVal(row.cost, 'cost')}</td>
                        <td className="num">{formatVal(row.conversions, 'conversions')}</td>
                        <td className="num">{formatVal(row.cpc, 'cpc')}</td>
                        <td className="num">{formatVal(row.cost_per_conversion, 'cost_per_conversion')}</td>
                        <td className="num">{formatVal(row.bl_approved, 'bl_approved')}</td>
                        <td className="num">{formatVal(row.bl_sold_approved, 'bl_sold_approved')}</td>
                        <td className="num">{formatVal(row.bl_txn_approved, 'bl_txn_approved')}</td>
                        <td className="num">{formatVal(row.cost_per_bl, 'cost_per_bl')}</td>
                        <td className="num" style={{ color: '#29b6f6' }}>{formatVal(row.txn_approved_pct, 'txn_approved_pct')}</td>
                        <td className="num" style={{ color: '#ffca28' }}>{formatVal(row.bl_sold_pct, 'bl_sold_pct')}</td>
                        <td className="num" style={{ color: '#ef5350' }}>{formatVal(row.cost_per_txn, 'cost_per_txn')}</td>
                        {timePeriod === 'weekly' && (
                          <>
                            <td className="num" style={{ cursor: row.mcatMap ? 'pointer' : 'default', textDecoration: row.mcatMap ? 'underline' : 'none', color: '#9ccc65' }} onClick={() => {
                              if (row.mcatMap) {
                                setMcatModalData(Array.from(row.mcatMap.entries()).map(([k, v]: any) => ({ name: k, isAdRunning: v.isAdRunning, bl_approved: v.bl_approved })));
                                setShowMcatModal(true);
                              }
                            }}>{formatVal(row.mcat_div, 'mcat_div')}</td>
                            <td className="num" style={{ cursor: row.pmcatMap ? 'pointer' : 'default', textDecoration: row.pmcatMap ? 'underline' : 'none', color: '#26a69a' }} onClick={() => {
                              if (row.pmcatMap) {
                                setPmcatModalData(Array.from(row.pmcatMap.entries()).map(([k, v]: any) => ({ name: k, isAdRunning: v.isAdRunning, bl_approved: v.bl_approved })));
                                setShowPmcatModal(true);
                              }
                            }}>{formatVal(row.pmcat_div, 'pmcat_div')}</td>
                          </>
                        )}
                        <td className="num">{formatVal(row.blni, 'blni')}</td>
                        <td className="num">{formatVal(row.blni_pct, 'blni_pct')}</td>
                        <td className="num" style={{ color: '#ff8a65' }}>{formatVal(row.blni_approved_pct, 'blni_approved_pct')}</td>
                        <td className="num">{formatVal(row.enq_approved, 'enq_approved')}</td>
                        <td className="num">{formatVal(row.calls_approved, 'calls_approved')}</td>
                        <td className="num" style={{ color: '#ba68c8' }}>{formatVal(row.total_req_approved, 'total_req_approved')}</td>
                      </tr>
                    ))}
                    <tr style={{ position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40, fontWeight: 'bold', borderTop: '2px solid rgba(255, 255, 255, 0.15)' }}>
                      <td style={{ position: 'sticky', left: 0, bottom: 0, background: 'var(--bg2)', zIndex: 50, fontWeight: 'bold' }}>Total</td>
                      <td className="num" style={{ position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.impressions, 'impressions')}</td>
                      <td className="num" style={{ position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.clicks, 'clicks')}</td>
                      <td className="num" style={{ color: C.g, position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.ctr, 'ctr')}</td>
                      <td className="num" style={{ position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.cost, 'cost')}</td>
                      <td className="num" style={{ position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.conversions, 'conversions')}</td>
                      <td className="num" style={{ position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.cpc, 'cpc')}</td>
                      <td className="num" style={{ position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.cost_per_conversion, 'cost_per_conversion')}</td>
                      <td className="num" style={{ position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.bl_approved, 'bl_approved')}</td>
                      <td className="num" style={{ position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.bl_sold_approved, 'bl_sold_approved')}</td>
                      <td className="num" style={{ position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.bl_txn_approved, 'bl_txn_approved')}</td>
                      <td className="num" style={{ position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.cost_per_bl, 'cost_per_bl')}</td>
                      <td className="num" style={{ color: '#29b6f6', position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.txn_approved_pct, 'txn_approved_pct')}</td>
                      <td className="num" style={{ color: '#ffca28', position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.bl_sold_pct, 'bl_sold_pct')}</td>
                      <td className="num" style={{ color: '#ef5350', position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.cost_per_txn, 'cost_per_txn')}</td>
                      {timePeriod === 'weekly' && <td className="num" style={{ position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.mcat_div, 'mcat_div')}</td>}
                      {timePeriod === 'weekly' && <td className="num" style={{ position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.pmcat_div, 'pmcat_div')}</td>}
                      <td className="num" style={{ position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.blni, 'blni')}</td>
                      <td className="num" style={{ position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.blni_pct, 'blni_pct')}</td>
                      <td className="num" style={{ color: '#ff8a65', position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.blni_approved_pct, 'blni_approved_pct')}</td>
                      <td className="num" style={{ position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.enq_approved, 'enq_approved')}</td>
                      <td className="num" style={{ position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.calls_approved, 'calls_approved')}</td>
                      <td className="num" style={{ color: '#ba68c8', position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40 }}>{formatVal(groupPerformanceData.totals.total_req_approved, 'total_req_approved')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PMCAT-wise Summary Table */}
          {granularity === 'pmcat' && pmcatPerformanceData && (
            <div className="cc" style={{ margin: '30px 0 0 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div className="ct">📋 PMCAT Performance Summary</div>
                  <div className="cs">{timePeriod === 'daily' ? 'Daily' : timePeriod === 'weekly' ? 'Weekly' : 'Monthly'} KPI metrics rolled up by PMCAT for {selectedWeek}</div>
                </div>
                <button onClick={downloadReportCsv} style={{ background: 'var(--teal)', color: '#000', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>⬇ Download CSV</button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: '4px 12px', background: 'var(--bg1)', color: 'var(--teal)', border: '1px solid var(--teal)', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' }}>Prev</button>
                <span style={{ padding: '4px 8px', color: '#fff' }}>Page {page + 1}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * 30 >= pmcatPerformanceData.rows.length} style={{ padding: '4px 12px', background: 'var(--bg1)', color: 'var(--teal)', border: '1px solid var(--teal)', borderRadius: '4px', cursor: 'pointer', marginLeft: '8px' }}>Next</button>
              </div>
              <div className="tw" style={{ marginTop: '5px', maxHeight: '500px', overflowY: 'auto', overflowX: 'auto', position: 'relative' }}>
                <table className="dt" style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: '1500px' }}>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', left: 0, top: 0, background: 'var(--bg2)', zIndex: 50, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>PMCAT</th>
                      <th style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Parent Group</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Impressions</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Clicks</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>CTR</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Cost</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Conversions</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>CPC</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Cost/Conv</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>BL Approved</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>BL Sold</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Txn</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Cost/BL</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Txn (Appr) %</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>BL Sold %</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Cost / Txn</th>
                      {timePeriod === 'weekly' && <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>MCAT Div.</th>}
                      {timePeriod === 'weekly' && <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>PMCAT Div.</th>}
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>BLNI</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>BLNI / Txn %</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Enq Appr.</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Calls Appr.</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Total Req Appr.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pmcatPerformanceData.rows.slice(page * 30, (page + 1) * 30).map((row: any) => (
                      <tr key={row.name}>
                        <td style={{ position: 'sticky', left: 0, background: 'var(--bg2)', zIndex: 30, fontWeight: 500 }}>{row.name}</td>
                        <td>{row.group}</td>
                        <td className="num">{formatVal(row.impressions, 'impressions')}</td>
                        <td className="num">{formatVal(row.clicks, 'clicks')}</td>
                        <td className="num" style={{ color: C.g }}>{formatVal(row.ctr, 'ctr')}</td>
                        <td className="num">{formatVal(row.cost, 'cost')}</td>
                        <td className="num">{formatVal(row.conversions, 'conversions')}</td>
                        <td className="num">{formatVal(row.cpc, 'cpc')}</td>
                        <td className="num">{formatVal(row.cost_per_conversion, 'cost_per_conversion')}</td>
                        <td className="num">{formatVal(row.bl_approved, 'bl_approved')}</td>
                        <td className="num">{formatVal(row.bl_sold_approved, 'bl_sold_approved')}</td>
                        <td className="num">{formatVal(row.bl_txn_approved, 'bl_txn_approved')}</td>
                        <td className="num">{formatVal(row.cost_per_bl, 'cost_per_bl')}</td>
                        <td className="num" style={{ color: '#29b6f6' }}>{formatVal(row.txn_approved_pct, 'txn_approved_pct')}</td>
                        <td className="num" style={{ color: '#ffca28' }}>{formatVal(row.bl_sold_pct, 'bl_sold_pct')}</td>
                        <td className="num" style={{ color: '#ef5350' }}>{formatVal(row.cost_per_txn, 'cost_per_txn')}</td>
                        {timePeriod === 'weekly' && (
                          <>
                            <td className="num" style={{ cursor: row.mcatMap ? 'pointer' : 'default', textDecoration: row.mcatMap ? 'underline' : 'none', color: '#9ccc65' }} onClick={() => {
                              if (row.mcatMap) {
                                setMcatModalData(Array.from(row.mcatMap.entries()).map(([k, v]: any) => ({ name: k, isAdRunning: v.isAdRunning, bl_approved: v.bl_approved })));
                                setShowMcatModal(true);
                              }
                            }}>{formatVal(row.mcat_div, 'mcat_div')}</td>
                            <td className="num">{formatVal(row.pmcat_div, 'pmcat_div')}</td>
                          </>
                        )}
                        <td className="num">{formatVal(row.blni, 'blni')}</td>
                        <td className="num">{formatVal(row.blni_pct, 'blni_pct')}</td>
                        <td className="num">{formatVal(row.enq_approved, 'enq_approved')}</td>
                        <td className="num">{formatVal(row.calls_approved, 'calls_approved')}</td>
                        <td className="num" style={{ color: '#ba68c8' }}>{formatVal(row.total_req_approved, 'total_req_approved')}</td>
                      </tr>
                    ))}
                    <tr style={{ position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40, fontWeight: 'bold', borderTop: '2px solid rgba(255, 255, 255, 0.15)' }}>
                      <td style={{ position: 'sticky', left: 0, bottom: 0, background: 'var(--bg2)', zIndex: 50, fontWeight: 'bold' }}>Total</td>
                      <td />
                      <td className="num">{formatVal(pmcatPerformanceData.totals.impressions, 'impressions')}</td>
                      <td className="num">{formatVal(pmcatPerformanceData.totals.clicks, 'clicks')}</td>
                      <td className="num" style={{ color: C.g }}>{formatVal(pmcatPerformanceData.totals.ctr, 'ctr')}</td>
                      <td className="num">{formatVal(pmcatPerformanceData.totals.cost, 'cost')}</td>
                      <td className="num">{formatVal(pmcatPerformanceData.totals.conversions, 'conversions')}</td>
                      <td className="num">{formatVal(pmcatPerformanceData.totals.cpc, 'cpc')}</td>
                      <td className="num">{formatVal(pmcatPerformanceData.totals.cost_per_conversion, 'cost_per_conversion')}</td>
                      <td className="num">{formatVal(pmcatPerformanceData.totals.bl_approved, 'bl_approved')}</td>
                      <td className="num">{formatVal(pmcatPerformanceData.totals.bl_sold_approved, 'bl_sold_approved')}</td>
                      <td className="num">{formatVal(pmcatPerformanceData.totals.bl_txn_approved, 'bl_txn_approved')}</td>
                      <td className="num">{formatVal(pmcatPerformanceData.totals.cost_per_bl, 'cost_per_bl')}</td>
                      <td className="num" style={{ color: '#29b6f6' }}>{formatVal(pmcatPerformanceData.totals.txn_approved_pct, 'txn_approved_pct')}</td>
                      <td className="num" style={{ color: '#ffca28' }}>{formatVal(pmcatPerformanceData.totals.bl_sold_pct, 'bl_sold_pct')}</td>
                      <td className="num" style={{ color: '#ef5350' }}>{formatVal(pmcatPerformanceData.totals.cost_per_txn, 'cost_per_txn')}</td>
                      {timePeriod === 'weekly' && <td className="num">{formatVal(pmcatPerformanceData.totals.mcat_div, 'mcat_div')}</td>}
                      {timePeriod === 'weekly' && <td className="num">{formatVal(pmcatPerformanceData.totals.pmcat_div, 'pmcat_div')}</td>}
                      <td className="num">{formatVal(pmcatPerformanceData.totals.blni, 'blni')}</td>
                      <td className="num">{formatVal(pmcatPerformanceData.totals.blni_pct, 'blni_pct')}</td>
                      <td className="num">{formatVal(pmcatPerformanceData.totals.enq_approved, 'enq_approved')}</td>
                      <td className="num">{formatVal(pmcatPerformanceData.totals.calls_approved, 'calls_approved')}</td>
                      <td className="num" style={{ color: '#ba68c8' }}>{formatVal(pmcatPerformanceData.totals.total_req_approved, 'total_req_approved')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MCAT-wise Summary Table */}
          {granularity === 'mcat' && mcatPerformanceData && (
            <div className="cc" style={{ margin: '30px 0 0 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div className="ct">📋 MCAT Performance Summary</div>
                  <div className="cs">{timePeriod === 'daily' ? 'Daily' : timePeriod === 'weekly' ? 'Weekly' : 'Monthly'} KPI metrics rolled up by MCAT for {selectedWeek}</div>
                </div>
                <button onClick={downloadReportCsv} style={{ background: 'var(--teal)', color: '#000', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>⬇ Download CSV</button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: '4px 12px', background: 'var(--bg1)', color: 'var(--teal)', border: '1px solid var(--teal)', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' }}>Prev</button>
                <span style={{ padding: '4px 8px', color: '#fff' }}>Page {page + 1}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * 30 >= mcatPerformanceData.rows.length} style={{ padding: '4px 12px', background: 'var(--bg1)', color: 'var(--teal)', border: '1px solid var(--teal)', borderRadius: '4px', cursor: 'pointer', marginLeft: '8px' }}>Next</button>
              </div>
              <div className="tw" style={{ marginTop: '5px', maxHeight: '500px', overflowY: 'auto', overflowX: 'auto', position: 'relative' }}>
                <table className="dt" style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: '1500px' }}>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', left: 0, top: 0, background: 'var(--bg2)', zIndex: 50, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>MCAT</th>
                      <th style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Parent PMCAT</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Impressions</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Clicks</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>CTR</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Cost</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Conversions</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>CPC</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Cost/Conv</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>BL Approved</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>BL Sold</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Txn</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Cost/BL</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Txn (Appr) %</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>BL Sold %</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Cost / Txn</th>
                      {timePeriod === 'weekly' && <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>MCAT Div.</th>}
                      {timePeriod === 'weekly' && <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>PMCAT Div.</th>}
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>BLNI</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>BLNI / Txn %</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Enq Appr.</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Calls Appr.</th>
                      <th className="num" style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 10, fontWeight: 'bold', borderBottom: '1px solid var(--bdr2)' }}>Total Req Appr.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mcatPerformanceData.rows.slice(page * 30, (page + 1) * 30).map((row: any) => (
                      <tr key={row.name}>
                        <td style={{ position: 'sticky', left: 0, background: 'var(--bg2)', zIndex: 30, fontWeight: 500 }}>{row.name}</td>
                        <td>{row.pmcat}</td>
                        <td className="num">{formatVal(row.impressions, 'impressions')}</td>
                        <td className="num">{formatVal(row.clicks, 'clicks')}</td>
                        <td className="num" style={{ color: C.g }}>{formatVal(row.ctr, 'ctr')}</td>
                        <td className="num">{formatVal(row.cost, 'cost')}</td>
                        <td className="num">{formatVal(row.conversions, 'conversions')}</td>
                        <td className="num">{formatVal(row.cpc, 'cpc')}</td>
                        <td className="num">{formatVal(row.cost_per_conversion, 'cost_per_conversion')}</td>
                        <td className="num">{formatVal(row.bl_approved, 'bl_approved')}</td>
                        <td className="num">{formatVal(row.bl_sold_approved, 'bl_sold_approved')}</td>
                        <td className="num">{formatVal(row.bl_txn_approved, 'bl_txn_approved')}</td>
                        <td className="num">{formatVal(row.cost_per_bl, 'cost_per_bl')}</td>
                        <td className="num" style={{ color: '#29b6f6' }}>{formatVal(row.txn_approved_pct, 'txn_approved_pct')}</td>
                        <td className="num" style={{ color: '#ffca28' }}>{formatVal(row.bl_sold_pct, 'bl_sold_pct')}</td>
                        <td className="num" style={{ color: '#ef5350' }}>{formatVal(row.cost_per_txn, 'cost_per_txn')}</td>
                        {timePeriod === 'weekly' && (
                          <>
                            <td className="num">{formatVal(row.mcat_div, 'mcat_div')}</td>
                            <td className="num">{formatVal(row.pmcat_div, 'pmcat_div')}</td>
                          </>
                        )}
                        <td className="num">{formatVal(row.blni, 'blni')}</td>
                        <td className="num">{formatVal(row.blni_pct, 'blni_pct')}</td>
                        <td className="num">{formatVal(row.enq_approved, 'enq_approved')}</td>
                        <td className="num">{formatVal(row.calls_approved, 'calls_approved')}</td>
                        <td className="num" style={{ color: '#ba68c8' }}>{formatVal(row.total_req_approved, 'total_req_approved')}</td>
                      </tr>
                    ))}
                    <tr style={{ position: 'sticky', bottom: 0, background: 'var(--bg2)', zIndex: 40, fontWeight: 'bold', borderTop: '2px solid rgba(255, 255, 255, 0.15)' }}>
                      <td style={{ position: 'sticky', left: 0, bottom: 0, background: 'var(--bg2)', zIndex: 50, fontWeight: 'bold' }}>Total</td>
                      <td />
                      <td className="num">{formatVal(mcatPerformanceData.totals.impressions, 'impressions')}</td>
                      <td className="num">{formatVal(mcatPerformanceData.totals.clicks, 'clicks')}</td>
                      <td className="num" style={{ color: C.g }}>{formatVal(mcatPerformanceData.totals.ctr, 'ctr')}</td>
                      <td className="num">{formatVal(mcatPerformanceData.totals.cost, 'cost')}</td>
                      <td className="num">{formatVal(mcatPerformanceData.totals.conversions, 'conversions')}</td>
                      <td className="num">{formatVal(mcatPerformanceData.totals.cpc, 'cpc')}</td>
                      <td className="num">{formatVal(mcatPerformanceData.totals.cost_per_conversion, 'cost_per_conversion')}</td>
                      <td className="num">{formatVal(mcatPerformanceData.totals.bl_approved, 'bl_approved')}</td>
                      <td className="num">{formatVal(mcatPerformanceData.totals.bl_sold_approved, 'bl_sold_approved')}</td>
                      <td className="num">{formatVal(mcatPerformanceData.totals.bl_txn_approved, 'bl_txn_approved')}</td>
                      <td className="num">{formatVal(mcatPerformanceData.totals.cost_per_bl, 'cost_per_bl')}</td>
                      <td className="num" style={{ color: '#29b6f6' }}>{formatVal(mcatPerformanceData.totals.txn_approved_pct, 'txn_approved_pct')}</td>
                      <td className="num" style={{ color: '#ffca28' }}>{formatVal(mcatPerformanceData.totals.bl_sold_pct, 'bl_sold_pct')}</td>
                      <td className="num" style={{ color: '#ef5350' }}>{formatVal(mcatPerformanceData.totals.cost_per_txn, 'cost_per_txn')}</td>
                      {timePeriod === 'weekly' && <td className="num">{formatVal(mcatPerformanceData.totals.mcat_div, 'mcat_div')}</td>}
                      {timePeriod === 'weekly' && <td className="num">{formatVal(mcatPerformanceData.totals.pmcat_div, 'pmcat_div')}</td>}
                      <td className="num">{formatVal(mcatPerformanceData.totals.blni, 'blni')}</td>
                      <td className="num">{formatVal(mcatPerformanceData.totals.blni_pct, 'blni_pct')}</td>
                      <td className="num">{formatVal(mcatPerformanceData.totals.enq_approved, 'enq_approved')}</td>
                      <td className="num">{formatVal(mcatPerformanceData.totals.calls_approved, 'calls_approved')}</td>
                      <td className="num" style={{ color: '#ba68c8' }}>{formatVal(mcatPerformanceData.totals.total_req_approved, 'total_req_approved')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MCAT Diversity Breakdown Modal */}
      {showMcatModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg)', color: 'var(--txt)', border: '1px solid var(--bdr)', borderRadius: '8px', padding: '20px', minWidth: '750px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: '-20px', background: 'var(--bg)', zIndex: 100, padding: '20px 20px 15px 20px', margin: '-20px -20px 15px -20px', borderBottom: '1px solid var(--bdr)' }}>
              <h3 style={{ margin: 0, color: 'var(--txt)' }}>MCAT Diversity Details</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => downloadDiversityExcel('mcat')}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--bdr2)', color: 'var(--txt)', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', fontWeight: 600, padding: '8px 12px' }}
                >
                  Download Excel
                </button>
                <button onClick={() => setShowMcatModal(false)} style={{ background: 'none', border: 'none', color: 'var(--txt)', cursor: 'pointer', fontSize: '28px', lineHeight: '1', padding: '0 5px' }}>&times;</button>
              </div>
            </div>
            {(() => {
              const adsRunningList = mcatModalData.filter(m => m.isAdRunning).sort((a,b) => b.bl_approved - a.bl_approved);
              const blGe10List = mcatModalData.filter(m => m.bl_approved >= 10).sort((a,b) => b.bl_approved - a.bl_approved);
              const diversity = adsRunningList.length > 0 ? ((blGe10List.length / adsRunningList.length) * 100).toFixed(1) : 0;
              return (
                <>
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', padding: '12px', background: 'var(--bg2)', border: '1px solid var(--bdr2)', borderRadius: '6px', fontSize: '14px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}><strong>Total Ads Running MCATs:</strong> <span style={{color: '#9ccc65', marginLeft: '5px'}}>{adsRunningList.length}</span></div>
                    <div style={{ flex: 1 }}><strong>Total MCATs (BL &ge; 10):</strong> <span style={{color: '#9ccc65', marginLeft: '5px'}}>{blGe10List.length}</span></div>
                    <div><strong>Diversity:</strong> <span style={{color: '#29b6f6', marginLeft: '5px', fontSize: '18px', fontWeight: 'bold'}}>{diversity}%</span></div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '24px' }}>
                    {/* Left Column */}
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid var(--bdr)', paddingBottom: '8px', color: 'var(--txt)' }}>📋 Ads Running MCATs</h4>
                      <table className="dt" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ color: 'var(--txt)' }}>MCAT Name</th>
                            <th className="num" style={{ color: 'var(--txt)' }}>BL Approved</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adsRunningList.map((item, idx) => (
                            <tr key={idx}>
                              <td style={{ color: 'var(--txt)' }}>{item.name}</td>
                              <td className="num" style={{ color: 'var(--txt)' }}>{item.bl_approved}</td>
                            </tr>
                          ))}
                          {adsRunningList.length === 0 && <tr><td colSpan={2} style={{ textAlign: 'center', padding: '20px', color: 'var(--txt)' }}>None found</td></tr>}
                        </tbody>
                      </table>
                    </div>

                    {/* Right Column */}
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid var(--bdr)', paddingBottom: '8px', color: 'var(--txt)' }}>⭐ MCATs (BL &ge; 10)</h4>
                      <table className="dt" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ color: 'var(--txt)' }}>MCAT Name</th>
                            <th className="num" style={{ color: 'var(--txt)' }}>BL Approved</th>
                          </tr>
                        </thead>
                        <tbody>
                          {blGe10List.map((item, idx) => (
                            <tr key={idx}>
                              <td style={{ color: 'var(--txt)' }}>{item.name}</td>
                              <td className="num" style={{ color: '#9ccc65', fontWeight: 'bold' }}>{item.bl_approved}</td>
                            </tr>
                          ))}
                          {blGe10List.length === 0 && <tr><td colSpan={2} style={{ textAlign: 'center', padding: '20px', color: 'var(--txt)' }}>None found</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* PMCAT Diversity Breakdown Modal */}
      {showPmcatModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg)', color: 'var(--txt)', border: '1px solid var(--bdr)', borderRadius: '8px', padding: '20px', minWidth: '750px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: '-20px', background: 'var(--bg)', zIndex: 100, padding: '20px 20px 15px 20px', margin: '-20px -20px 15px -20px', borderBottom: '1px solid var(--bdr)' }}>
              <h3 style={{ margin: 0, color: 'var(--txt)' }}>PMCAT Diversity Details</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => downloadDiversityExcel('pmcat')}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--bdr2)', color: 'var(--txt)', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', fontWeight: 600, padding: '8px 12px' }}
                >
                  Download Excel
                </button>
                <button onClick={() => setShowPmcatModal(false)} style={{ background: 'none', border: 'none', color: 'var(--txt)', cursor: 'pointer', fontSize: '28px', lineHeight: '1', padding: '0 5px' }}>&times;</button>
              </div>
            </div>
            {(() => {
              const adsRunningList = pmcatModalData.filter(m => m.isAdRunning).sort((a,b) => b.bl_approved - a.bl_approved);
              const blGe25List = pmcatModalData.filter(m => m.bl_approved >= 25).sort((a,b) => b.bl_approved - a.bl_approved);
              const diversity = adsRunningList.length > 0 ? ((blGe25List.length / adsRunningList.length) * 100).toFixed(1) : 0;
              return (
                <>
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', padding: '12px', background: 'var(--bg2)', border: '1px solid var(--bdr2)', borderRadius: '6px', fontSize: '14px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}><strong>Total Ads Running PMCATs:</strong> <span style={{color: '#26a69a', marginLeft: '5px'}}>{adsRunningList.length}</span></div>
                    <div style={{ flex: 1 }}><strong>Total PMCATs (BL &ge; 25):</strong> <span style={{color: '#26a69a', marginLeft: '5px'}}>{blGe25List.length}</span></div>
                    <div><strong>Diversity:</strong> <span style={{color: '#29b6f6', marginLeft: '5px', fontSize: '18px', fontWeight: 'bold'}}>{diversity}%</span></div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '24px' }}>
                    {/* Left Column */}
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid var(--bdr)', paddingBottom: '8px', color: 'var(--txt)' }}>📋 Ads Running PMCATs</h4>
                      <table className="dt" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ color: 'var(--txt)' }}>PMCAT Name</th>
                            <th className="num" style={{ color: 'var(--txt)' }}>BL Approved</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adsRunningList.map((item, idx) => (
                            <tr key={idx}>
                              <td style={{ color: 'var(--txt)' }}>{item.name}</td>
                              <td className="num" style={{ color: 'var(--txt)' }}>{item.bl_approved}</td>
                            </tr>
                          ))}
                          {adsRunningList.length === 0 && <tr><td colSpan={2} style={{ textAlign: 'center', padding: '20px', color: 'var(--txt)' }}>None found</td></tr>}
                        </tbody>
                      </table>
                    </div>

                    {/* Right Column */}
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid var(--bdr)', paddingBottom: '8px', color: 'var(--txt)' }}>⭐ PMCATs (BL &ge; 25)</h4>
                      <table className="dt" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ color: 'var(--txt)' }}>PMCAT Name</th>
                            <th className="num" style={{ color: 'var(--txt)' }}>BL Approved</th>
                          </tr>
                        </thead>
                        <tbody>
                          {blGe25List.map((item, idx) => (
                            <tr key={idx}>
                              <td style={{ color: 'var(--txt)' }}>{item.name}</td>
                              <td className="num" style={{ color: '#26a69a', fontWeight: 'bold' }}>{item.bl_approved}</td>
                            </tr>
                          ))}
                          {blGe25List.length === 0 && <tr><td colSpan={2} style={{ textAlign: 'center', padding: '20px', color: 'var(--txt)' }}>None found</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}



