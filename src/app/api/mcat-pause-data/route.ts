import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  const url = process.env.MCAT_PAUSE_SHEET_URL || 'https://docs.google.com/spreadsheets/d/1kGs6D4HVKwRSnM8cGKINugmEW44flq_5TD8eglgRUxU/export?format=csv&gid=197629805';

  try {
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ 
          success: false, 
          error: 'Access Denied (401). The sheet may not be public. Please ensure it is shared as "Anyone with the link can view".' 
        });
      }
      throw new Error(`Google Sheets fetch failed: ${response.statusText}`);
    }

    const csvText = await response.text();
    const rows = csvText.split('\n').map(line => {
      let cells = [];
      let currentCell = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
          inQuotes = !inQuotes;
        } else if (line[i] === ',' && !inQuotes) {
          cells.push(currentCell.trim());
          currentCell = '';
        } else {
          currentCell += line[i];
        }
      }
      cells.push(currentCell.trim());
      return cells;
    });

    if (!rows || rows.length < 2) {
      return NextResponse.json({ success: false, error: 'No data found in the sheet' });
    }

    const dataRows = rows.slice(1).filter(r => r.length >= 7);
    const today = new Date();

    const parseDate = (dateStr: string) => {
      if (!dateStr) return null;
      if (dateStr.includes('T')) return new Date(dateStr);
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
      }
      return null;
    };

    const parsed = dataRows.map(row => {
      const pauseD = parseDate(row[4]);
      const unpauseD = parseDate(row[5]);
      let days = 0;
      if (pauseD && unpauseD) {
        days = Math.round((unpauseD.getTime() - pauseD.getTime()) / (1000 * 60 * 60 * 24));
      } else if (pauseD) {
        days = Math.round((today.getTime() - pauseD.getTime()) / (1000 * 60 * 60 * 24));
      }
      return {
        name: row[6]?.replace(/\r$/, '') || '',
        group: row[7]?.replace(/\r$/, '') || '',
        bl: parseInt(row[3]) || 0,
        days: days
      };
    }).filter(r => r.name && r.days > 0);

    // Sort by longest duration
    parsed.sort((a, b) => b.days - a.days);
    const topLongest = parsed.slice(0, 50);

    // Group by frequency
    const freqCount: Record<string, number> = {};
    for (const row of parsed) {
      freqCount[row.name] = (freqCount[row.name] || 0) + 1;
    }
    
    const freqArr = Object.entries(freqCount).map(([name, freq]) => {
      const row = parsed.find(r => r.name === name);
      return {
        name,
        group: row?.group || '',
        freq
      };
    }).sort((a, b) => b.freq - a.freq);
    
    const topFrequent = freqArr.slice(0, 50);

    return NextResponse.json({ 
      success: true, 
      data: { 
        pausedLong: topLongest, 
        freqPaused: topFrequent
      } 
    }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
  } catch (error: any) {
    console.error('Google Sheets API Error:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
