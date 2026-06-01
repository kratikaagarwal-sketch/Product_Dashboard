import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';

const CACHE_ROOT = process.env.VERCEL
  ? path.join('/tmp', 'json-cache')
  : path.join(process.cwd(), 'data', 'json-cache');
type CacheEntry = {
  mtimeMs: number;
  size: number;
  data: unknown;
};

const memoryCache = new Map<string, CacheEntry>();

const resolveCachePath = (fileName: string) => path.join(CACHE_ROOT, fileName);

const ensureCacheRoot = async () => {
  await fs.mkdir(CACHE_ROOT, { recursive: true });
};

export const readJsonCache = async <T,>(fileName: string): Promise<T | null> => {
  const filePath = resolveCachePath(fileName);
  try {
    const stats = await fs.stat(filePath);
    const cached = memoryCache.get(filePath);
    if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
      return cached.data as T;
    }

    const raw = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(raw) as T;
    memoryCache.set(filePath, {
      mtimeMs: stats.mtimeMs,
      size: stats.size,
      data,
    });
    return data;
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      const cached = memoryCache.get(filePath);
      if (cached) {
        return cached.data as T;
      }
      return null;
    }
    throw error;
  }
};

export const writeJsonCache = async <T,>(fileName: string, data: T): Promise<void> => {
  const filePath = resolveCachePath(fileName);
  const serialized = JSON.stringify(data, null, 2);
  memoryCache.set(filePath, {
    mtimeMs: Date.now(),
    size: Buffer.byteLength(serialized, 'utf8'),
    data,
  });

  try {
    await ensureCacheRoot();
    await fs.writeFile(filePath, serialized, 'utf8');
    const stats = await fs.stat(filePath);
    memoryCache.set(filePath, {
      mtimeMs: stats.mtimeMs,
      size: stats.size,
      data,
    });
  } catch (error: any) {
    if (error?.code === 'EROFS' || error?.code === 'EACCES' || error?.code === 'EPERM') {
      console.warn(`Skipping disk cache write for ${fileName} on this runtime: ${error.code}`);
      return;
    }
    throw error;
  }
};
