import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gid = searchParams.get('gid');
  
  if (!gid) {
    return NextResponse.json({ success: false, error: 'Missing gid parameter' }, { status: 400 });
  }

  const url = `https://docs.google.com/spreadsheets/d/1oT-zgpdPFVPDdzFRGm9Xhj63deyzprER9Bx6Ou9MahY/export?format=csv&gid=${gid}`;

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
    
    // Check if it returned HTML (login page) instead of CSV
    if (csvText.trim().toLowerCase().startsWith('<!doctype html>')) {
        return NextResponse.json({ 
          success: false, 
          error: 'Access Denied. Google returned a login page. Please ensure the sheet is shared as "Anyone with the link can view".' 
        });
    }

    // Basic CSV parser
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

    const headers = rows[0].map(h => h.replace(/\r$/, '').trim());
    const dataRows = rows.slice(1).filter(r => r.some(c => c && c.trim() !== ''));

    const parsedData = dataRows.map(row => {
      const obj: any = {};
      headers.forEach((h, i) => {
        const val = row[i]?.replace(/\r$/, '').trim() || '';
        // Try parsing as number if it looks like one (ignore commas for large numbers)
        const numVal = val.replace(/,/g, '');
        if (numVal !== '' && !isNaN(Number(numVal))) {
          obj[h] = Number(numVal);
        } else {
          obj[h] = val;
        }
      });
      return obj;
    });

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Google Sheets API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
