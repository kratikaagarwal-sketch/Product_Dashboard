import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.MCAT_PAUSE_SHEET_URL || 'https://docs.google.com/spreadsheets/d/1kGs6D4HVKwRSnM8cGKINugmEW44flq_5TD8eglgRUxU/export?format=csv&gid=197629805';

  try {
    const response = await fetch(url);
    
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
    // Use a basic regex to split by comma but ignore commas inside quotes
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

    const dataRows = rows.slice(1);
    const today = new Date();

    const parseDate = (dateStr: string) => {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
      }
      return new Date();
    };

    // Columns: 0:MCAT ID, 1:PMCAT ID, 2:status, 3:Last 3 days BL Count, 4:Date Paused, 5:Unpause Date, 6:MCAT Name, 7:Group Name
    const pausedLong = dataRows
      .filter(row => row[4] && (!row[5] || row[5] === '\r')) // Currently paused
      .map(row => {
        const pauseDate = parseDate(row[4]);
        const diffTime = Math.abs(today.getTime() - pauseDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          id: row[0],
          name: row[6]?.replace(/\r$/, ''),
          group: row[7]?.replace(/\r$/, ''),
          date: row[4],
          bl: parseInt(row[3]) || 0,
          days: diffDays,
        };
      })
      .filter(r => r.name);

    // Sort by days paused (longest first) and take the top ones for the longest paused analysis
    const freqPaused = [...pausedLong].sort((a, b) => b.days - a.days).slice(0, 50);

    return NextResponse.json({ 
      success: true, 
      data: { 
        pausedLong, 
        freqPaused
      } 
    }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
  } catch (error: any) {
    console.error('Google Sheets API Error:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
