"use client";

import React, { useState, useEffect, useMemo } from 'react';
import ChartComponent from '../ChartComponent';

const C = { t: '#00cba4', b: '#4d9fff', g: '#3dd68c', r: '#ff6168', a: '#ffb547', p: '#a78bfa', d: '#4a6070' };

const METRICS = [
  { key: 'clicks', label: 'Clicks' },
  { key: 'impressions', label: 'Impressions' },
  { key: 'cost', label: 'Cost (INR)' },
  { key: 'conversions', label: 'Conversions' },
  { key: 'ctr', label: 'CTR %' },
  { key: 'bl_approved', label: 'BL Approved' },
  { key: 'txn_approved_pct', label: 'Txn (Approved) %' },
  { key: 'bl_sold_pct', label: 'BL Sold %' },
  { key: 'cost_per_txn', label: 'Cost / Txn' },
  { key: 'mcat_diversity_pct', label: 'MCAT Diversity %' },
  { key: 'pmcat_diversity_pct', label: 'PMCAT Diversity %' }
];

export default function CampaignDetailTab() {
  const [data, setData] = useState<any[]>([]);
  const [campaignData, setCampaignData] = useState<any[]>([]);
  const [adsRunningMcats, setAdsRunningMcats] = useState<string[]>([]);
  const [hierarchy, setHierarchy] = useState<Record<string, { pmcat: string; group: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
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

  useEffect(() => {
    if (granularity === 'mcat' && (rankMetric === 'mcat_diversity_pct' || rankMetric === 'pmcat_diversity_pct')) {
      setRankMetric('ctr');
    } else if (granularity === 'pmcat' && rankMetric === 'pmcat_diversity_pct') {
      setRankMetric('ctr');
    }
  }, [granularity, rankMetric]);

  const activeMetrics = useMemo(() => {
    return METRICS.filter(m => {
      if (granularity === 'mcat' && (m.key === 'mcat_diversity_pct' || m.key === 'pmcat_diversity_pct')) return false;
      if (granularity === 'pmcat' && m.key === 'pmcat_diversity_pct') return false;
      return true;
    });
  }, [granularity]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/mcat-weekly-performance?period=${timePeriod}`).then(r => r.json()),
      fetch('/mcat_hierarchy.json').then(r => r.json()).catch(() => ({}))
    ])
    .then(([resRedshift, resHierarchy]) => {
      if (resRedshift.success) {
        setHierarchy(resHierarchy);
        setData(resRedshift.data);
        setCampaignData(resRedshift.campaignData || []);
        setAdsRunningMcats(resRedshift.adsRunningMcats || []);

        const dateArr = Array.from(new Set(resRedshift.data.map((d: any) => d.week_start_date))).sort((a: any, b: any) => b.localeCompare(a));
        if (dateArr.length > 0) {
          setSelectedWeek(dateArr[0] as string);
        } else {
          setSelectedWeek('');
        }
      } else {
        setError(resRedshift.error || 'Failed to fetch Redshift data');
      }
      setLoading(false);
    })
    .catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, [timePeriod]);

  const enrichedData = useMemo(() => {
    return data.map(d => {
      const lookupKey = d.mcat ? d.mcat.toString().trim().toLowerCase() : '';
      const h = hierarchy[lookupKey];
      return {
        ...d,
        mcat: d.mcat || 'Unknown',
        group: h?.group || 'Unknown Group',
        pmcat: h?.pmcat || 'Unknown PMCAT'
      };
    });
  }, [data, hierarchy]);

  const adsRunningSet = useMemo(() => new Set(adsRunningMcats.map(m => m.toLowerCase())), [adsRunningMcats]);
  
  const adsRunningPmcatsSet = useMemo(() => {
    const set = new Set<string>();
    adsRunningMcats.forEach(m => {
      const h = hierarchy[m.toLowerCase()];
      if (h && h.pmcat) set.add(h.pmcat);
    });
    return set;
  }, [adsRunningMcats, hierarchy]);

  const pmcatToGroup = useMemo(() => {
    const map = new Map<string, string>();
    Object.values(hierarchy).forEach(h => {
      if (h.pmcat && h.group) map.set(h.pmcat, h.group);
    });
    return map;
  }, [hierarchy]);

  const weeks = useMemo(() => Array.from(new Set(data.map(d => d.week_start_date))).sort((a: any, b: any) => b.localeCompare(a)) as string[], [data]);

  const compareWeeksList = useMemo(() => {
    if (weeks.length < 2) return [];
    return weeks.slice(1, 1 + compareWeeksCount);
  }, [weeks, compareWeeksCount]);

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

  const denominators = useMemo(() => {
    let mcatDenominator = 0;
    let pmcatDenominator = 0;
    if (granularity === 'group') {
      mcatDenominator = adsRunningMcats.filter(m => selectedGroup === 'all' || hierarchy[m.toLowerCase()]?.group === selectedGroup).length;
      pmcatDenominator = Array.from(adsRunningPmcatsSet).filter(p => selectedGroup === 'all' || pmcatToGroup.get(p) === selectedGroup).length;
    } else if (granularity === 'pmcat') {
      mcatDenominator = adsRunningMcats.filter(m => {
        const h = hierarchy[m.toLowerCase()];
        const matchGroup = selectedGroup === 'all' || h?.group === selectedGroup;
        const matchPmcat = selectedPmcat === 'all' || h?.pmcat === selectedPmcat;
        return matchGroup && matchPmcat;
      }).length;
    }
    return { mcatDenominator, pmcatDenominator };
  }, [granularity, selectedGroup, selectedPmcat, adsRunningMcats, adsRunningPmcatsSet, pmcatToGroup, hierarchy]);

  const calcKpisForWeek = (week: string) => {
    let filtered = baseFilteredData.filter(d => d.week_start_date === week);
    const totals: any = { clicks: 0, impressions: 0, cost: 0, conversions: 0, ctr: 0, bl_sold_approved: 0, bl_approved: 0, bl_txn_approved: 0, blni: 0, txn_approved_pct: 0, bl_sold_pct: 0, cost_per_txn: 0, mcat_diversity_pct: 0, pmcat_diversity_pct: 0 };
    
    const numeratorMcats = new Set<string>();
    const pmcatBlTotals = new Map<string, number>();

    filtered.forEach(d => {
      totals.clicks += d.clicks || 0;
      totals.impressions += d.impressions || 0;
      totals.cost += d.cost || 0;
      totals.conversions += d.conversions || 0;
      totals.bl_sold_approved += d.bl_sold_approved || 0;
      totals.bl_approved += d.bl_approved || 0;
      totals.bl_txn_approved += d.bl_txn_approved || 0;
      totals.blni += d.blni || 0;
      
      if (d.bl_approved >= 10 && adsRunningSet.has(d.mcat.toLowerCase())) {
        numeratorMcats.add(d.mcat);
      }

      if (granularity === 'group' && adsRunningPmcatsSet.has(d.pmcat)) {
        pmcatBlTotals.set(d.pmcat, (pmcatBlTotals.get(d.pmcat) || 0) + (d.bl_approved || 0));
      }
    });

    let pmcatNumerator = 0;
    pmcatBlTotals.forEach(bl => {
      if (bl >= 10) pmcatNumerator++;
    });

    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    totals.txn_approved_pct = totals.bl_approved > 0 ? (totals.bl_txn_approved / totals.bl_approved) * 100 : 0;
    totals.bl_sold_pct = totals.bl_approved > 0 ? (totals.bl_sold_approved / totals.bl_approved) * 100 : 0;
    totals.cost_per_txn = totals.bl_txn_approved > 0 ? totals.cost / totals.bl_txn_approved : 0;
    totals.mcat_diversity_pct = denominators.mcatDenominator > 0 ? (numeratorMcats.size / denominators.mcatDenominator) * 100 : 0;
    totals.pmcat_diversity_pct = denominators.pmcatDenominator > 0 ? (pmcatNumerator / denominators.pmcatDenominator) * 100 : 0;
    return totals;
  };

  // Standard Week KPI calculation
  const kpiStats = useMemo(() => calcKpisForWeek(selectedWeek), [selectedWeek, baseFilteredData, denominators, adsRunningSet, adsRunningPmcatsSet, granularity]);

  // Compare Mode Calculations
  const compareData = useMemo(() => {
    return compareWeeksList.map(week => {
      return { week, stats: calcKpisForWeek(week) };
    });
  }, [compareWeeksList, baseFilteredData, denominators, adsRunningSet, adsRunningPmcatsSet, granularity]);

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
          // Lower is better (excluding zeroes)
          if (d.stats[k] > 0 && (d.stats[k] < best[k].val || best[k].val === 0)) {
            best[k] = { val: d.stats[k], week: d.week };
          }
        } else {
           // Higher is better
          if (d.stats[k] > best[k].val) {
             best[k] = { val: d.stats[k], week: d.week };
          }
        }
      });
    });
    return best;
  }, [compareData]);

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

  const formatVal = (val: number, metric: string) => {
    if (metric === 'cost') return `₹${val.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
    if (metric === 'cost_per_txn') return `₹${val.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
    if (metric === 'conversions') return val.toLocaleString(undefined, { maximumFractionDigits: 1 });
    if (metric === 'ctr' || metric === 'txn_approved_pct' || metric === 'bl_sold_pct' || metric === 'mcat_diversity_pct' || metric === 'pmcat_diversity_pct') return `${val.toFixed(1)}%`;
    return val.toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  const getEntityTitle = () => {
    if (granularity === 'group') return selectedGroup === 'all' ? 'All Groups' : selectedGroup;
    if (granularity === 'pmcat') return selectedPmcat === 'all' ? (selectedGroup === 'all' ? 'All PMCATs' : `PMCATs in ${selectedGroup}`) : selectedPmcat;
    return selectedMcat === 'all' ? (selectedPmcat === 'all' ? 'All MCATs' : `MCATs in ${selectedPmcat}`) : selectedMcat;
  };

  const downloadCompareCsv = () => {
    let csv = `Metric,${compareWeeksList.join(',')}\n`;
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

  // Roll up data for Ranking Analysis (only used in Standard Mode)
  const rankingData = useMemo(() => {
    if (isCompareMode) return { top10: [], bottom10: [] };

    let weeklyData = enrichedData.filter(d => d.week_start_date === selectedWeek);
    if (selectedGroup !== 'all') weeklyData = weeklyData.filter(d => d.group === selectedGroup);
    if (granularity === 'mcat' && selectedPmcat !== 'all') weeklyData = weeklyData.filter(d => d.pmcat === selectedPmcat);

    const denomMapMcat = new Map<string, number>();
    const denomMapPmcat = new Map<string, number>();
    
    if (granularity === 'group') {
      adsRunningMcats.forEach(m => {
        const h = hierarchy[m.toLowerCase()];
        if (h && h.group) denomMapMcat.set(h.group, (denomMapMcat.get(h.group) || 0) + 1);
      });
      adsRunningPmcatsSet.forEach(p => {
        const g = pmcatToGroup.get(p);
        if (g) denomMapPmcat.set(g, (denomMapPmcat.get(g) || 0) + 1);
      });
    } else if (granularity === 'pmcat') {
      adsRunningMcats.forEach(m => {
        const h = hierarchy[m.toLowerCase()];
        if (h && h.pmcat) denomMapMcat.set(h.pmcat, (denomMapMcat.get(h.pmcat) || 0) + 1);
      });
    }

    const rolledUp = new Map<string, any>();
    
    weeklyData.forEach(d => {
      let key = d.mcat;
      if (granularity === 'pmcat') key = d.pmcat;
      if (granularity === 'group') key = d.group;

      if (!rolledUp.has(key)) {
        rolledUp.set(key, { name: key, clicks: 0, impressions: 0, cost: 0, conversions: 0, ctr: 0, bl_sold_approved: 0, bl_approved: 0, bl_txn_approved: 0, blni: 0, numeratorSet: new Set(), pmcatBlTotals: new Map<string, number>() });
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
      
      if (d.bl_approved >= 10 && adsRunningSet.has(d.mcat.toLowerCase())) {
        existing.numeratorSet.add(d.mcat);
      }

      if (granularity === 'group' && adsRunningPmcatsSet.has(d.pmcat)) {
        existing.pmcatBlTotals.set(d.pmcat, (existing.pmcatBlTotals.get(d.pmcat) || 0) + (d.bl_approved || 0));
      }
    });

    const rolledUpArr = Array.from(rolledUp.values()).map(d => {
      const denomMcat = denomMapMcat.get(d.name) || 0;
      const denomPmcat = denomMapPmcat.get(d.name) || 0;

      let pmcatNum = 0;
      d.pmcatBlTotals.forEach((bl: number) => {
        if (bl >= 10) pmcatNum++;
      });

      return {
        ...d,
        ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
        txn_approved_pct: d.bl_approved > 0 ? (d.bl_txn_approved / d.bl_approved) * 100 : 0,
        bl_sold_pct: d.bl_approved > 0 ? (d.bl_sold_approved / d.bl_approved) * 100 : 0,
        cost_per_txn: d.bl_txn_approved > 0 ? d.cost / d.bl_txn_approved : 0,
        mcat_diversity_pct: denomMcat > 0 ? (d.numeratorSet.size / denomMcat) * 100 : 0,
        pmcat_diversity_pct: denomPmcat > 0 ? (pmcatNum / denomPmcat) * 100 : 0
      };
    });

    const sorted = [...rolledUpArr].sort((a, b) => b[rankMetric] - a[rankMetric]);
    
    const bottomSorted = [...rolledUpArr]
      .filter(d => rankMetric !== 'ctr' || d.impressions > 100) 
      .sort((a, b) => a[rankMetric] - b[rankMetric]);

    return {
      top10: sorted.slice(0, 10),
      bottom10: bottomSorted.slice(0, 10)
    };
  }, [enrichedData, selectedWeek, granularity, selectedGroup, selectedPmcat, rankMetric, adsRunningMcats, adsRunningSet, adsRunningPmcatsSet, pmcatToGroup, hierarchy, isCompareMode]);

  const aiInsights = useMemo(() => {
    if (isCompareMode) {
      if (compareData.length === 0) return [];
      const insights = [];
      const recentCtr = compareData[0].stats.ctr;
      const oldCtr = compareData[compareData.length - 1].stats.ctr;
      
      if (recentCtr > oldCtr) {
         insights.push(`Positive Trend: CTR has improved from ${oldCtr.toFixed(1)}% to ${recentCtr.toFixed(1)}% over the selected weeks.`);
      } else if (recentCtr < oldCtr) {
         insights.push(`Attention Required: CTR has declined from ${oldCtr.toFixed(1)}% to ${recentCtr.toFixed(1)}%. Consider refreshing creatives or adjusting bids.`);
      }

      const maxCostWeek = [...compareData].sort((a, b) => b.stats.cost - a.stats.cost)[0];
      if (maxCostWeek && maxCostWeek.stats.cost > 0) {
         insights.push(`Budget Check: Highest spend occurred during the week of ${maxCostWeek.week} (₹${maxCostWeek.stats.cost.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits:1})}). Check if conversions aligned with this spend.`);
      }
      return insights;
    }

    // Standard Mode Insights
    if (rankingData.top10.length === 0) return [];
    
    const insights = [];
    const topPerformer = rankingData.top10[0];
    const topCost = [...rankingData.top10, ...rankingData.bottom10].sort((a,b) => b.cost - a.cost)[0];
    const avgCtr = kpiStats.ctr;
    const metricLabel = METRICS.find(m => m.key === rankMetric)?.label || rankMetric;

    insights.push(`Top Driver: ${topPerformer.name} is leading the selected group with the highest ${metricLabel}.`);
    
    if (topCost && topCost.cost > 0) {
      insights.push(`Budget Focus: ${topCost.name} consumed the highest budget (₹${topCost.cost.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}) this week.`);
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

  if (loading) {
    return (
      <div className="tab on" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--bdr2)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Querying Redshift & Loading Hierarchy...</span>
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
                {[2,3,4,5,6,7,8,9,10,11,12].map(n => (
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
            <label>Group Filter</label>
            <select value={selectedGroup} onChange={(e) => { setSelectedGroup(e.target.value); resetFilters('pmcat'); }} style={{ maxWidth: '250px' }}>
              <option value="all">All Groups</option>
              {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          
          {(granularity === 'pmcat' || granularity === 'mcat') && (
            <div>
              <label>PMCAT Filter</label>
              <select value={selectedPmcat} onChange={(e) => { setSelectedPmcat(e.target.value); resetFilters('mcat'); }} style={{ maxWidth: '250px' }}>
                <option value="all">All PMCATs</option>
                {availablePmcats.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}

          {granularity === 'mcat' && (
            <div>
              <label>MCAT Filter</label>
              <select value={selectedMcat} onChange={(e) => setSelectedMcat(e.target.value)} style={{ maxWidth: '250px' }}>
                <option value="all">All MCATs</option>
                {availableMcats.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {isCompareMode && bestKpis ? (
        <div className="compare-view">
          {/* Best KPIs Banner */}
          <div className="banner" style={{ marginBottom: '18px', background: 'linear-gradient(90deg, #1e1e24, #121216)', borderLeft: '4px solid #ab47bc' }}>
            <div className="bn-left">
              <div style={{ fontSize: '24px' }}>🏆</div>
              <div>
                <div className="bn-title" style={{ color: '#fff' }}>Best Ever KPIs</div>
                <div className="bn-sub">Across {compareWeeksCount} {timePeriod === 'weekly' ? 'weeks' : timePeriod === 'daily' ? 'days' : 'months'} ({compareWeeksList[compareWeeksList.length-1]} to {compareWeeksList[0]})</div>
              </div>
            </div>
            <div className="bn-stats" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div>
                <div className="bn-val" style={{ color: C.b }}>{bestKpis.impressions.val.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                <div className="bn-lbl">Impressions</div>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '2px', textAlign: 'center' }}>{formatWeekLabel(bestKpis.impressions.week)}</div>
              </div>
              <div>
                <div className="bn-val" style={{ color: C.t }}>{bestKpis.clicks.val.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                <div className="bn-lbl">Clicks</div>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '2px', textAlign: 'center' }}>{formatWeekLabel(bestKpis.clicks.week)}</div>
              </div>
              <div>
                <div className="bn-val" style={{ color: C.g }}>{bestKpis.ctr.val.toFixed(1)}%</div>
                <div className="bn-lbl">CTR</div>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '2px', textAlign: 'center' }}>{formatWeekLabel(bestKpis.ctr.week)}</div>
              </div>
              <div>
                <div className="bn-val" style={{ color: C.r }}>₹{bestKpis.cost.val.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                <div className="bn-lbl">Cost (Min)</div>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '2px', textAlign: 'center' }}>{formatWeekLabel(bestKpis.cost.week)}</div>
              </div>
              <div>
                <div className="bn-val" style={{ color: C.a }}>{bestKpis.conversions.val.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                <div className="bn-lbl">Conversions</div>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '2px', textAlign: 'center' }}>{formatWeekLabel(bestKpis.conversions.week)}</div>
              </div>
              <div>
                <div className="bn-val" style={{ color: '#29b6f6' }}>{bestKpis.txn_approved_pct.val.toFixed(1)}%</div>
                <div className="bn-lbl">Txn (Appr) %</div>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '2px', textAlign: 'center' }}>{formatWeekLabel(bestKpis.txn_approved_pct.week)}</div>
              </div>
              <div>
                <div className="bn-val" style={{ color: '#ef5350' }}>₹{bestKpis.cost_per_txn.val.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                <div className="bn-lbl">Cost/Txn (Min)</div>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '2px', textAlign: 'center' }}>{formatWeekLabel(bestKpis.cost_per_txn.week)}</div>
              </div>
              {granularity !== 'mcat' && (
                <div>
                  <div className="bn-val" style={{ color: '#ab47bc' }}>{bestKpis.mcat_diversity_pct.val.toFixed(1)}%</div>
                  <div className="bn-lbl">MCAT Div.</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '2px', textAlign: 'center' }}>{formatWeekLabel(bestKpis.mcat_diversity_pct.week)}</div>
                </div>
              )}
              {granularity === 'group' && (
                <div>
                  <div className="bn-val" style={{ color: '#ec407a' }}>{bestKpis.pmcat_diversity_pct.val.toFixed(1)}%</div>
                  <div className="bn-lbl">PMCAT Div.</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '2px', textAlign: 'center' }}>{formatWeekLabel(bestKpis.pmcat_diversity_pct.week)}</div>
                </div>
              )}
            </div>
          </div>

          <div className="sh" style={{ marginTop: '30px' }}>
            <h2>✨ AI Generated Insights <span>Based on {compareWeeksCount} {timePeriod === 'weekly' ? 'weeks' : timePeriod === 'daily' ? 'days' : 'months'} trend</span></h2>
          </div>
          <div className="cc" style={{ margin: 0, marginBottom: '25px', background: 'var(--bg2)', border: '1px solid var(--teal)' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {aiInsights.map((insight, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ color: 'var(--teal)' }}>✦</span>
                  <span style={{ fontSize: '14px', lineHeight: '1.4' }}>{insight}</span>
                </li>
              ))}
              {aiInsights.length === 0 && <li style={{ color: 'var(--muted)' }}>Not enough data to generate insights.</li>}
            </ul>
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
                  {activeMetrics.map(m => (
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
          {/* Standard View Mode */}
          <div className="banner" style={{ marginBottom: '18px' }}>
            <div className="bn-left">
              <div style={{ fontSize: '24px' }}>⚡</div>
              <div>
                <div className="bn-title" style={{ color: C.t }}>
                  {getEntityTitle()}
                </div>
                <div className="bn-sub">{timePeriod === 'weekly' ? 'Week' : timePeriod === 'daily' ? 'Date' : 'Month'} of {selectedWeek} · Redshift DWH</div>
              </div>
            </div>
            <div className="bn-stats" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div><div className="bn-val" style={{ color: C.b }}>{kpiStats.impressions.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div><div className="bn-lbl">Impressions</div></div>
              <div><div className="bn-val" style={{ color: C.t }}>{kpiStats.clicks.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div><div className="bn-lbl">Clicks</div></div>
              <div><div className="bn-val" style={{ color: C.g }}>{kpiStats.ctr.toFixed(1)}%</div><div className="bn-lbl">CTR</div></div>
              <div><div className="bn-val" style={{ color: C.r }}>₹{kpiStats.cost.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div><div className="bn-lbl">Cost (INR)</div></div>
              <div><div className="bn-val" style={{ color: C.a }}>{kpiStats.conversions.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div><div className="bn-lbl">Conversions</div></div>
              <div><div className="bn-val" style={{ color: C.p }}>{kpiStats.bl_approved.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div><div className="bn-lbl">BL Approved</div></div>
              <div><div className="bn-val" style={{ color: '#66bb6a' }}>{kpiStats.bl_sold_approved.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div><div className="bn-lbl">BL Sold</div></div>
              <div><div className="bn-val" style={{ color: C.d }}>{kpiStats.bl_txn_approved.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div><div className="bn-lbl">Txn Approved</div></div>
              <div><div className="bn-val" style={{ color: '#ff8a65' }}>{kpiStats.blni.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div><div className="bn-lbl">BLNI</div></div>
              <div><div className="bn-val" style={{ color: '#29b6f6' }}>{kpiStats.txn_approved_pct.toFixed(1)}%</div><div className="bn-lbl">Txn (Appr) %</div></div>
              <div><div className="bn-val" style={{ color: '#ffca28' }}>{kpiStats.bl_sold_pct.toFixed(1)}%</div><div className="bn-lbl">BL Sold %</div></div>
              <div><div className="bn-val" style={{ color: '#ef5350' }}>₹{kpiStats.cost_per_txn.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div><div className="bn-lbl">Cost / Txn</div></div>
              {granularity !== 'mcat' && <div><div className="bn-val" style={{ color: '#ab47bc' }}>{kpiStats.mcat_diversity_pct.toFixed(1)}%</div><div className="bn-lbl">MCAT Diversity</div></div>}
              {granularity === 'group' && <div><div className="bn-val" style={{ color: '#ec407a' }}>{kpiStats.pmcat_diversity_pct.toFixed(1)}%</div><div className="bn-lbl">PMCAT Diversity</div></div>}
            </div>
          </div>

          <div className="sh" style={{ marginTop: '30px' }}>
            <h2>✨ AI Generated Insights <span>Based on selected filters</span></h2>
          </div>
          <div className="cc" style={{ margin: 0, marginBottom: '25px', background: 'var(--bg2)', border: '1px solid var(--teal)' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {aiInsights.map((insight, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ color: 'var(--teal)' }}>✦</span>
                  <span style={{ fontSize: '14px', lineHeight: '1.4' }}>{insight}</span>
                </li>
              ))}
              {aiInsights.length === 0 && <li style={{ color: 'var(--muted)' }}>Not enough data to generate insights for this selection.</li>}
            </ul>
          </div>

          <div className="sh" style={{ marginTop: '30px' }}>
            <h2>{granularity.toUpperCase()} Ranking Analysis <span>{timePeriod === 'weekly' ? 'Week' : timePeriod === 'daily' ? 'Date' : 'Month'} of {selectedWeek}</span></h2>
          </div>

          <div className="ai-tabs" style={{ marginBottom: '20px' }}>
            {activeMetrics.map(m => (
              <button 
                key={m.key} 
                className={`ai-tab ${rankMetric === m.key ? 'on' : ''}`} 
                onClick={() => setRankMetric(m.key)}
              >
                Rank by {m.label}
              </button>
            ))}
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
                        <td style={{ color: 'var(--muted)', width: '40px' }}>#{idx + 1}</td>
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
                        <td style={{ color: 'var(--muted)', width: '40px' }}>#{idx + 1}</td>
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


        </>
      )}
    </div>
  );
}
