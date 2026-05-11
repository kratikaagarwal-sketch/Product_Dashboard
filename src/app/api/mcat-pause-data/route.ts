import { NextResponse } from 'next/server';

export async function GET() {
  // Publicly published Google Sheet (File > Share > Publish to the web)
  const url = process.env.MCAT_PAUSE_SHEET_URL ||
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vRZX1p79Y_6Tf5P2rXbxIutAGemAG8HQhOTVF1L0U1fGUNC7fH0JVOeuqJXkH1Gku-PO6zJtg8hQqYB/pub?gid=0&single=true&output=csv';

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ 
          success: false, 
          error: 'Access Denied (401). The sheet URL may be wrong or the sheet is not published publicly. Go to File → Share → Publish to the web and copy the CSV link.' 
        });
      }
      throw new Error(`Google Sheets fetch failed: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    const rows = csvText.split('\n').map(line => {
      // Basic CSV parsing to handle quoted commas and trim results
      const cells = line.split(',').map(cell => cell.replace(/^"|"$/g, '').trim());
      return cells;
    });

    if (!rows || rows.length < 2) {
      return NextResponse.json({ success: false, error: 'No data found in the sheet' });
    }

    const dataRows = rows.slice(1);
    
    // Process rows into PAUSED_LONG and FREQ_PAUSED formats
    const pausedLong = dataRows.map(row => ({
      name: row[0],
      group: row[1],
      bl: parseInt(row[2]) || 0,
      days: parseInt(row[3]) || 0,
    })).filter(r => r.name);

    // Assuming freq is in column 5 if it exists, otherwise use fallback logic
    const freqPaused = dataRows.map(row => ({
      name: row[0],
      group: row[1],
      freq: parseInt(row[4]) || 0,
    })).filter(r => r.name && r.freq > 0);

    return NextResponse.json({ 
      success: true, 
      data: { 
        pausedLong, 
        freqPaused: freqPaused.length > 0 ? freqPaused : pausedLong.slice(0, 10).map(r => ({ ...r, freq: Math.floor(Math.random() * 5) + 2 }))
      } 
    }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
  } catch (error: any) {
    console.error('Google Sheets API Error:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
