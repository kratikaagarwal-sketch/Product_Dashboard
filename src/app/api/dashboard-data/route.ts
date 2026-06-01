import { NextResponse } from 'next/server';
import { readJsonCache, writeJsonCache } from '@/lib/server/jsonStore';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type DashboardRow = Record<string, string | number>;

const CACHE_FILE = 'dashboard-data.json';
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1oT-zgpdPFVPDdzFRGm9Xhj63deyzprER9Bx6Ou9MahY/export?format=csv';

const parseCsv = (csvText: string) => {
  const rows = csvText.split('\n').map(line => {
    let cells: string[] = [];
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
    return [];
  }

  const headers = rows[0].map(h => h.replace(/\r$/, '').trim());
  const dataRows = rows.slice(1).filter(r => r.some(c => c && c.trim() !== ''));

  return dataRows.map(row => {
    const obj: DashboardRow = {};
    headers.forEach((h, i) => {
      const val = row[i]?.replace(/\r$/, '').trim() || '';
      const numVal = val.replace(/,/g, '');
      if (numVal !== '' && !isNaN(Number(numVal))) {
        obj[h] = Number(numVal);
      } else {
        obj[h] = val;
      }
    });
    return obj;
  });
};

const fetchAndCacheDashboardData = async () => {
  const response = await fetch(SHEET_URL, { cache: 'no-store' });

  if (!response.ok) {
    if (response.status === 401) {
      return {
        success: false,
        error: 'Access Denied (401). The sheet may not be public. Please ensure it is shared as "Anyone with the link can view".',
      };
    }

    throw new Error(`Google Sheets fetch failed: ${response.statusText}`);
  }

  const csvText = await response.text();

  if (csvText.trim().toLowerCase().startsWith('<!doctype html>')) {
    return {
      success: false,
      error: 'Access Denied. Google returned a login page. Please ensure the sheet is shared as "Anyone with the link can view".',
    };
  }

  const parsedData = parseCsv(csvText);
  if (parsedData.length === 0) {
    return { success: false, error: 'No data found in the sheet' };
  }

  await writeJsonCache(CACHE_FILE, parsedData);
  return { success: true, data: parsedData };
};

export async function GET() {
  try {
    let cached: DashboardRow[] | null = null;
    try {
      cached = await readJsonCache<DashboardRow[]>(CACHE_FILE);
    } catch {
      cached = null;
    }
    if (cached && cached.length > 0) {
      return NextResponse.json({ success: true, data: cached });
    }

    const result = await fetchAndCacheDashboardData();
    return NextResponse.json(result, result.success ? undefined : { status: 500 });
  } catch (error: any) {
    console.error('Dashboard data error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
