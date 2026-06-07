import { sourceForType, type Source } from 'scrapemyferry';
import type { StaticContext } from './types';

const source = sourceForType('bcf') as Source;
if (!source) throw new Error('scrapemyferry: bcf source unavailable');

const TTL_MS = {
  routes: 24 * 60 * 60 * 1000,
  conditions: 2 * 60 * 1000,
  dailySchedule: 6 * 60 * 60 * 1000,
};

type CacheEntry<T> = { value: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();

async function cached<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T | null> {
  const now = Date.now();
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && entry.expiresAt > now) return entry.value;

  try {
    const value = await fetcher();
    cache.set(key, { value, expiresAt: now + ttl });
    return value;
  } catch (err) {
    console.warn(`[scrapemyferry] ${key} failed:`, err);
    // serve stale on error if we have it
    if (entry) return entry.value;
    return null;
  }
}

const SLUG_RE = /^([A-Z]{3})([A-Z]{3})$/;

export function parseSlug(slug?: string): { from: string; to: string } | undefined {
  if (!slug) return;
  const match = SLUG_RE.exec(slug);
  if (!match) return;
  return { from: match[1], to: match[2] };
}

export async function loadStaticContext(slug?: string): Promise<StaticContext> {
  const pair = parseSlug(slug);

  const routesPromise = cached('routes', TTL_MS.routes, () => source.routes());

  if (!pair) {
    const routes = await routesPromise;
    return { routes, conditions: null, dailySchedule: null };
  }

  const { from, to } = pair;
  const [routes, conditions, dailySchedule] = await Promise.all([
    routesPromise,
    cached(`conditions:${from}-${to}`, TTL_MS.conditions, () =>
      source.currentConditionsBeta(from, to),
    ),
    cached(`daily:${from}-${to}`, TTL_MS.dailySchedule, () => source.dailySchedule(from, to)),
  ]);

  return { routes, conditions, dailySchedule };
}
