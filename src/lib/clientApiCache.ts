"use client";

import { useEffect, useState } from 'react';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: string;
};

type CacheEntry = {
  data: unknown;
  updatedAt: number;
};

const DEFAULT_TTL_MS = 60 * 1000;
const responseCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<unknown>>();

const isFresh = (cacheKey: string, ttlMs: number) => {
  const cached = responseCache.get(cacheKey);
  return !!cached && Date.now() - cached.updatedAt < ttlMs;
};

export const getCachedApiData = <T,>(cacheKey: string) => {
  const cached = responseCache.get(cacheKey);
  return cached ? (cached.data as T) : undefined;
};

export const fetchCachedApiData = async <T,>(cacheKey: string, url: string, ttlMs = DEFAULT_TTL_MS) => {
  if (isFresh(cacheKey, ttlMs)) {
    return responseCache.get(cacheKey)!.data as T;
  }

  const existingRequest = inFlightRequests.get(cacheKey);
  if (existingRequest) {
    return existingRequest as Promise<T>;
  }

  const request = fetch(url)
    .then(async response => {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const result = await response.json() as ApiEnvelope<T>;
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      responseCache.set(cacheKey, {
        data: result.data,
        updatedAt: Date.now()
      });

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

export const useCachedApiData = <T,>(cacheKey: string, url: string, ttlMs = DEFAULT_TTL_MS) => {
  const cachedData = getCachedApiData<T>(cacheKey);
  const [data, setData] = useState<T | null>(cachedData ?? null);
  const [loading, setLoading] = useState(cachedData === undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const cached = getCachedApiData<T>(cacheKey);

    if (cached !== undefined) {
      setData(cached);
      setLoading(false);
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
  }, [cacheKey, url, ttlMs]);

  return {
    data,
    loading,
    error
  };
};
