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
    
    // Sheet columns: MCAT ID(0), MCAT Name(1), Group Name(2), Pause Date(3), Pause BL(4), Duration(5)
    const pausedLong = dataRows.map(row => ({
      id:   row[0],
      name: row[1],    // MCAT Name (display name)
      group: row[2],   // Group Name (e.g. "Industrial Plants, Machinery & Equipment")
      date: row[3],    // Pause Date (e.g. "24-04-2026") — kept for reference
      bl:   parseInt(row[4]) || 0,   // Pause BL
      days: parseInt(row[5]) || 0,   // Duration (days paused)
    })).filter(r => r.name);

    // Freq paused: MCATs with duration >= 3 days treated as frequently-paused
    const freqPaused = dataRows.map(row => ({
      name:  row[1],
      group: row[2],
      freq:  parseInt(row[5]) || 0,   // Use duration as proxy for severity
    })).filter(r => r.name && r.freq >= 3);

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
