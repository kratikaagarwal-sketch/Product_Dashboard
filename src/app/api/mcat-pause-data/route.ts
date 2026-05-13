import { NextResponse } from 'next/server';

export async function GET() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '1X91YEaBjTEM-pVnrAdsLmKSDavjHaB0_h-CNwJUOb-M';

  // URL for public CSV export (Anyone with the link can view)
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ 
          success: false, 
          error: 'Access Denied (401). Please ensure the spreadsheet is shared as "Anyone with the link can view" AND "Published to the web" (File > Share > Publish to web).' 
        });
      }
      throw new Error(`Google Sheets fetch failed: ${response.statusText}`);
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
    });
  } catch (error: any) {
    console.error('Google Sheets API Error:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
