import { NextResponse } from 'next/server';
import { readJsonCache, writeJsonCache } from '@/lib/server/jsonStore';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type PauseRow = {
  name: string;
  group: string;
  bl: number;
  days: number;
};

const CACHE_FILE = 'mcat-pause-data.json';
const SHEET_URL = process.env.MCAT_PAUSE_SHEET_URL || 'https://docs.google.com/spreadsheets/d/1kGs6D4HVKwRSnM8cGKINugmEW44flq_5TD8eglgRUxU/export?format=csv&gid=197629805';

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

  const dataRows = rows.slice(1).filter(r => r.length >= 7);
  const today = new Date();

  const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    if (dateStr.includes('T')) return new Date(dateStr);
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return null;
  };

  return dataRows
    .map(row => {
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
        days,
      } as PauseRow;
    })
    .filter(r => r.name && r.days > 0);
};

const fetchAndCachePauseData = async () => {
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
  const parsed = parseCsv(csvText);

  if (parsed.length === 0) {
    return { success: false, error: 'No data found in the sheet' };
  }

  const pausedLong = [...parsed].sort((a, b) => b.days - a.days).slice(0, 50);
  const freqCount: Record<string, number> = {};

  for (const row of parsed) {
    freqCount[row.name] = (freqCount[row.name] || 0) + 1;
  }

  const freqPaused = Object.entries(freqCount)
    .map(([name, freq]) => {
      const row = parsed.find(r => r.name === name);
      return {
        name,
        group: row?.group || '',
        freq,
      };
    })
    .sort((a, b) => b.freq - a.freq)
    .slice(0, 50);

  const payload = {
    pausedLong,
    freqPaused,
  };

  await writeJsonCache(CACHE_FILE, payload);
  return { success: true, data: payload };
};

export async function GET() {
  try {
    let cached: { pausedLong: PauseRow[]; freqPaused: Array<{ name: string; group: string; freq: number }> } | null = null;
    try {
      cached = await readJsonCache<{ pausedLong: PauseRow[]; freqPaused: Array<{ name: string; group: string; freq: number }> }>(CACHE_FILE);
    } catch {
      cached = null;
    }
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const result = await fetchAndCachePauseData();
    return NextResponse.json(result, result.success ? undefined : { status: 500 });
  } catch (error: any) {
    console.error('Google Sheets API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
