"use client";

import { useEffect, useState } from 'react';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: string;
};

const DEFAULT_TTL_MS = 60 * 1000;
const inFlightRequests = new Map<string, Promise<unknown>>();
type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};
const responseCache = new Map<string, CacheEntry<unknown>>();

const getCachedEntry = <T,>(cacheKey: string): T | undefined => {
  const entry = responseCache.get(cacheKey) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() >= entry.expiresAt) {
    responseCache.delete(cacheKey);
    return undefined;
  }
  return entry.data;
};

const setCachedEntry = <T,>(cacheKey: string, data: T, ttlMs: number) => {
  responseCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
};

export const getCachedApiData = <T,>(cacheKey: string) => {
  return getCachedEntry<T>(cacheKey);
};

export const fetchCachedApiData = async <T,>(cacheKey: string, url: string, ttlMs = DEFAULT_TTL_MS) => {
  const cached = getCachedEntry<T>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const existingRequest = inFlightRequests.get(cacheKey);
  if (existingRequest) {
    return existingRequest as Promise<T>;
  }

  const request = fetch(url)
    .then(async response => {
      const bodyText = await response.text();
      if (!response.ok) {
        try {
          const parsed = JSON.parse(bodyText) as { error?: string; message?: string };
          const serverMessage = parsed?.error || parsed?.message;
          throw new Error(serverMessage ? `Request failed with status ${response.status}: ${serverMessage}` : `Request failed with status ${response.status}`);
        } catch {
          throw new Error(bodyText ? `Request failed with status ${response.status}: ${bodyText}` : `Request failed with status ${response.status}`);
        }
      }

      const result = JSON.parse(bodyText) as ApiEnvelope<T>;
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setCachedEntry(cacheKey, result.data, ttlMs);
      return result.data;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, request);
  return request;
};

export const prefetchCachedApiData = <T,>(cacheKey: string, url: string, ttlMs = DEFAULT_TTL_MS) => {
  void fetchCachedApiData<T>(cacheKey, url, ttlMs).catch(() => undefined);
};

export const useCachedApiData = <T,>(
  cacheKey: string,
  url: string,
  ttlMs = DEFAULT_TTL_MS,
  initialData?: T,
) => {
  const cachedData = initialData ?? getCachedApiData<T>(cacheKey);
  const [data, setData] = useState<T | null>(cachedData ?? null);
  const [loading, setLoading] = useState(cachedData === undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const cached = initialData ?? getCachedApiData<T>(cacheKey);

    if (cached !== undefined) {
      setCachedEntry(cacheKey, cached, ttlMs);
      setData(cached);
      setLoading(false);
      setError(null);
      return () => {
        isActive = false;
      };
    } else {
      setLoading(true);
    }

    setError(null);

    fetchCachedApiData<T>(cacheKey, url, ttlMs)
      .then(result => {
        if (!isActive) return;
        setData(result);
        setLoading(false);
      })
      .catch(err => {
        if (!isActive) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
        setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [cacheKey, url, ttlMs, initialData]);

  return {
    data,
    loading,
    error
  };
};
