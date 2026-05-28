"use client";

import React, { useEffect, useMemo, useState } from 'react';
import SearchableSelect from '../SearchableSelect';
import { useCachedApiData } from '@/lib/clientApiCache';
import { WEEKLY_REPORT_METRICS } from '@/lib/weeklyReportMetrics';

type Granularity = 'group' | 'pmcat' | 'mcat';

type WeeklyReportResponse = {
  availableGroups: string[];
  availablePmcats: string[];
  availableMcats: string[];
  weeks: string[];
  reportData: {
    dataByWeek: Array<{
      week: string;
      stats: Record<string, number | null>;
    }>;
    bestEver: Record<string, number | null>;
  };
};

export default function WeeklyReportTab() {
  const [isMobile, setIsMobile] = useState(false);
  const [granularity, setGranularity] = useState<Granularity>('group');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedPmcat, setSelectedPmcat] = useState<string>('all');
  const [selectedMcat, setSelectedMcat] = useState<string>('all');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const updateIsMobile = () => setIsMobile(mediaQuery.matches);

    updateIsMobile();
    mediaQuery.addEventListener('change', updateIsMobile);
    return () => mediaQuery.removeEventListener('change', updateIsMobile);
  }, []);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      granularity,
      selectedGroup,
      selectedPmcat,
      selectedMcat
    });
    return params.toString();
  }, [granularity, selectedGroup, selectedPmcat, selectedMcat]);

  const { data, loading, error } = useCachedApiData<WeeklyReportResponse>(
    `weekly-report:${queryString}`,
    `/api/weekly-report?${queryString}`
  );

  const availableGroups = data?.availableGroups ?? [];
  const availablePmcats = data?.availablePmcats ?? [];
  const availableMcats = data?.availableMcats ?? [];
  const weeks = data?.weeks ?? [];
  const reportData = data?.reportData ?? { dataByWeek: [], bestEver: {} };

  const sectionedMetrics = useMemo(() => {
    return WEEKLY_REPORT_METRICS.reduce((acc, metric) => {
      if (!acc[metric.section]) acc[metric.section] = [];
      acc[metric.section].push(metric);
      return acc;
    }, {} as Record<string, typeof WEEKLY_REPORT_METRICS>);
  }, []);

  const formatWeekLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startMonthIndex = parseInt(parts[1], 10) - 1;
    const startDay = parts[2];

    const startDate = new Date(dateStr);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    return `${monthNames[startMonthIndex]} ${startDay} - ${monthNames[endDate.getMonth()]} ${String(endDate.getDate()).padStart(2, '0')}`;
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

  const buildWorkbook = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Weekly Report');

    const columns: Array<{ header: string; key: string; width: number }> = [
      { header: 'Section', key: 'section', width: 28 },
      { header: 'Metric', key: 'metric', width: 38 },
      { header: 'Best ever', key: 'best', width: 16 },
    ];
    weeks.forEach(week => columns.push({ header: formatWeekLabel(week), key: week, width: 16 }));
    columns.push({ header: 'delta % (+/- LW)', key: 'delta', width: 18 });
    ws.columns = columns;

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.height = 22;
    headerRow.eachCell((cell, col) => {
      cell.alignment = { vertical: 'middle', horizontal: col <= 2 ? 'left' : 'center', wrapText: true };
      cell.border = { bottom: { style: 'medium', color: { argb: 'FF888888' } } };
      if (col === 3) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } };
      } else if (col > 3 && col < columns.length) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      } else if (col === columns.length) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF404040' } };
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      }
    });

    const applyNumFmt = (cell: any, type: string) => {
      if (type === 'currency') cell.numFmt = '₹#,##0.0;[Red]-₹#,##0.0';
      else if (type === 'percent') cell.numFmt = '0.00%';
      else if (type === 'number') cell.numFmt = '#,##0.0';
    };

    const sectionRanges: Array<{ name: string; startRow: number; endRow: number }> = [];
    let currentSection = '';
    let sectionStart = 2;

    WEEKLY_REPORT_METRICS.forEach((metric, index) => {
      if (metric.section !== currentSection) {
        if (currentSection !== '') {
          sectionRanges.push({ name: currentSection, startRow: sectionStart, endRow: index + 1 });
        }
        currentSection = metric.section;
        sectionStart = index + 2;
      }

      const rowData: Record<string, string | number> = {
        section: metric.section,
        metric: metric.label,
        best: metric.type === 'percent'
          ? (reportData.bestEver[metric.key] ?? 0) / 100
          : (reportData.bestEver[metric.key] ?? 'N/A'),
      };

      weeks.forEach(week => {
        const weekStat = reportData.dataByWeek.find(entry => entry.week === week)?.stats;
        const value = weekStat ? weekStat[metric.key] : null;
        rowData[week] = metric.type === 'percent' && typeof value === 'number' ? value / 100 : (value ?? 'N/A');
      });

      let deltaNumber = 0;
      let deltaValue: string | number = 'N/A';
      let hasDelta = false;
      if (reportData.dataByWeek.length >= 2 && metric.type !== 'na') {
        const latest = reportData.dataByWeek[reportData.dataByWeek.length - 1].stats[metric.key] || 0;
        const previous = reportData.dataByWeek[reportData.dataByWeek.length - 2].stats[metric.key] || 0;
        if (previous > 0) {
          deltaNumber = ((latest as number) - (previous as number)) / (previous as number);
          deltaValue = deltaNumber;
          hasDelta = true;
        } else if ((latest as number) > 0) {
          deltaNumber = 1;
          deltaValue = 1;
          hasDelta = true;
        } else {
          deltaNumber = 0;
          deltaValue = 0;
          hasDelta = true;
        }
      }
      rowData.delta = deltaValue;

      const row = ws.addRow(rowData);
      row.height = 18;

      const sectionCell = row.getCell(1);
      sectionCell.font = { bold: true };
      sectionCell.alignment = { vertical: 'middle', horizontal: 'left' };

      const metricCell = row.getCell(2);
      metricCell.alignment = { vertical: 'middle', horizontal: 'left' };

      const bestCell = row.getCell(3);
      applyNumFmt(bestCell, metric.type);
      bestCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
      bestCell.alignment = { vertical: 'middle', horizontal: 'center' };
      bestCell.font = { bold: true, color: { argb: 'FF7B6000' } };

      let colIndex = 4;
      weeks.forEach(() => {
        const cell = row.getCell(colIndex);
        applyNumFmt(cell, metric.type);
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 === 0 ? 'FFE8F0FE' : 'FFFFFFFF' } };
        colIndex++;
      });

      const deltaCell = row.getCell(colIndex);
      if (hasDelta) {
        deltaCell.numFmt = '+0.00%;[Red]-0.00%;0.00%';
        deltaCell.alignment = { vertical: 'middle', horizontal: 'center' };
        const isCostMetric = metric.key.includes('cost_per') || metric.key === 'cpc';
        const isBad = isCostMetric ? deltaNumber > 0 : deltaNumber < 0;
        if (deltaNumber !== 0) {
          deltaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isBad ? 'FFFFCDD2' : 'FFC8E6C9' } };
          deltaCell.font = { color: { argb: isBad ? 'FFD32F2F' : 'FF388E3C' }, bold: true };
        }
      }

      const isLastInSection = index === WEEKLY_REPORT_METRICS.length - 1 || WEEKLY_REPORT_METRICS[index + 1].section !== metric.section;
      if (isLastInSection) {
        row.eachCell(cell => {
          cell.border = { bottom: { style: 'medium', color: { argb: 'FF888888' } } };
        });
      }
    });

    sectionRanges.push({ name: currentSection, startRow: sectionStart, endRow: WEEKLY_REPORT_METRICS.length + 1 });

    sectionRanges.forEach(range => {
      if (range.endRow > range.startRow) {
        ws.mergeCells(range.startRow, 1, range.endRow, 1);
      }
      const cell = ws.getCell(range.startRow, 1);
      cell.value = range.name;
      cell.font = { bold: true, size: 11 };
      cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    });

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

  if (loading) {
    return <div style={{ padding: '24px', color: '#888' }}>Loading weekly data...</div>;
  }

  if (error) {
    return <div style={{ padding: '24px', color: 'var(--red, #ff6168)' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '24px', color: 'var(--txt, #fff)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>Granularity</label>
          <div style={{ display: 'flex', gap: '12px', background: 'var(--bg2, #1e1e24)', padding: '6px', borderRadius: '8px', border: '1px solid var(--bdr, #2a2a35)' }}>
            {(['group', 'pmcat', 'mcat'] as const).map(option => (
              <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', textTransform: 'capitalize' }}>
                <input
                  type="radio"
                  name="granularity"
                  checked={granularity === option}
                  onChange={() => {
                    setGranularity(option);
                    setSelectedGroup('all');
                    setSelectedPmcat('all');
                    setSelectedMcat('all');
                  }}
                />
                {option}
              </label>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>Group</label>
          <SearchableSelect
            value={selectedGroup}
            onChange={value => {
              setSelectedGroup(value);
              setSelectedPmcat('all');
              setSelectedMcat('all');
            }}
            options={[{ label: 'All Groups', value: 'all' }, ...availableGroups.map(group => ({ label: group, value: group }))]}
          />
        </div>

        {(granularity === 'pmcat' || granularity === 'mcat') && (
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>PMCAT</label>
            <SearchableSelect
              value={selectedPmcat}
              onChange={value => {
                setSelectedPmcat(value);
                setSelectedMcat('all');
              }}
              options={[{ label: 'All PMCATs', value: 'all' }, ...availablePmcats.map(pmcat => ({ label: pmcat, value: pmcat }))]}
            />
          </div>
        )}

        {granularity === 'mcat' && (
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>MCAT</label>
            <SearchableSelect
              value={selectedMcat}
              onChange={setSelectedMcat}
              options={[{ label: 'All MCATs', value: 'all' }, ...availableMcats.map(mcat => ({ label: mcat, value: mcat }))]}
            />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Weekly Performance - {getEntityTitle()}</h2>
        <button
          onClick={downloadExcel}
          style={{
            padding: '8px 16px',
            background: 'var(--teal)',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>📊</span> Export to Excel
        </button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--bdr)', borderRadius: '8px', background: 'var(--bg)', width: '100%', maxHeight: 'calc(100vh - 250px)' }}>
        <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: 'var(--surf2)' }}>
              {!isMobile && (
                <th style={{ padding: '12px', borderBottom: '1px solid var(--bdr)', textAlign: 'left', minWidth: '150px', position: 'sticky', left: 0, top: 0, background: 'var(--surf2)', zIndex: 20 }}>
                  Section
                </th>
              )}
              <th style={{ padding: '12px', borderBottom: '1px solid var(--bdr)', textAlign: 'left', minWidth: isMobile ? '180px' : '200px', position: 'sticky', left: 0, top: 0, background: 'var(--surf2)', zIndex: 20 }}>
                Metric
              </th>
              <th style={{ padding: '12px', borderBottom: '1px solid var(--bdr)', minWidth: isMobile ? '110px' : '120px', background: 'var(--amber)', color: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10 }}>
                Best ever
              </th>
              {weeks.map(week => (
                <th key={week} style={{ padding: '12px', borderBottom: '1px solid var(--bdr)', minWidth: isMobile ? '110px' : '120px', background: 'var(--blue)', color: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10 }}>
                  {formatWeekLabel(week)}
                </th>
              ))}
              <th style={{ padding: '12px', borderBottom: '1px solid var(--bdr)', minWidth: isMobile ? '110px' : '120px', background: 'var(--surf2)', position: 'sticky', top: 0, zIndex: 10 }}>
                delta % (+/- LW)
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(sectionedMetrics).map(([sectionName, metrics]) =>
              metrics.map((metric, index) => {
                const isFirstInSection = index === 0;
                const isLastInSection = index === metrics.length - 1;

                let deltaStr = 'N/A';
                let deltaColor = 'inherit';
                if (reportData.dataByWeek.length >= 2 && metric.type !== 'na') {
                  const latest = reportData.dataByWeek[reportData.dataByWeek.length - 1].stats[metric.key] || 0;
                  const previous = reportData.dataByWeek[reportData.dataByWeek.length - 2].stats[metric.key] || 0;
                  if (previous > 0) {
                    const delta = ((latest as number) - (previous as number)) / (previous as number) * 100;
                    deltaStr = `${delta > 0 ? '+' : ''}${delta.toFixed(2)}%`;
                    if (metric.key.includes('cost_per') || metric.key.includes('cpc')) {
                      deltaColor = delta > 0 ? 'var(--red)' : 'var(--green)';
                    } else {
                      deltaColor = delta > 0 ? 'var(--green)' : 'var(--red)';
                    }
                  } else if ((latest as number) > 0) {
                    deltaStr = '+100.00%';
                    deltaColor = metric.key.includes('cost_per') || metric.key.includes('cpc') ? 'var(--red)' : 'var(--green)';
                  } else {
                    deltaStr = '0.00%';
                  }
                }

                return (
                  <tr key={metric.key} style={{ borderBottom: isLastInSection ? '2px solid var(--bdr)' : '1px solid var(--bdr)' }}>
                    {!isMobile && isFirstInSection && (
                      <td rowSpan={metrics.length} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 'bold', background: 'var(--surf3)', position: 'sticky', left: 0, zIndex: 5, verticalAlign: 'top', borderRight: '1px solid var(--bdr)' }}>
                        {sectionName}
                      </td>
                    )}
                    <td style={{ padding: '8px 12px', textAlign: 'left', position: 'sticky', left: 0, background: 'var(--surf)', zIndex: 5, borderRight: '1px solid var(--bdr)', minWidth: isMobile ? '180px' : '200px' }}>
                      {isMobile && isFirstInSection && (
                        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: '6px' }}>
                          {sectionName}
                        </div>
                      )}
                      <div>{metric.label}</div>
                    </td>
                    <td style={{ padding: '8px 12px', minWidth: isMobile ? '110px' : '120px', background: 'var(--adim)' }}>
                      {formatVal(reportData.bestEver[metric.key] ?? null, metric.type)}
                    </td>
                    {reportData.dataByWeek.map(entry => (
                      <td key={entry.week} style={{ padding: '8px 12px', minWidth: isMobile ? '110px' : '120px' }}>
                        {formatVal(entry.stats[metric.key] ?? null, metric.type)}
                      </td>
                    ))}
                    <td style={{ padding: '8px 12px', minWidth: isMobile ? '110px' : '120px', fontWeight: 'bold', color: deltaColor, background: 'var(--surf2)' }}>
                      {deltaStr}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
