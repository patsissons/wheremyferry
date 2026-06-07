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
    return {
      routes,
      conditions: null,
      arrivalConditions: null,
      dailySchedule: null,
      reverseDailySchedule: null,
    };
  }

  const { from, to } = pair;
  const [routes, conditions, arrivalConditions, dailySchedule, reverseDailySchedule] =
    await Promise.all([
      routesPromise,
      cached(`conditions:${from}-${to}`, TTL_MS.conditions, () =>
        source.currentConditionsBeta(from, to),
      ),
      // Second conditions scrape for the reverse direction so we can show the
      // arrival terminal's address. The conditions payload always carries info
      // for the "from" terminal, so flipping the args is the only way to get
      // the other.
      cached(`conditions:${to}-${from}`, TTL_MS.conditions, () =>
        source.currentConditionsBeta(to, from),
      ),
      cached(`daily:${from}-${to}`, TTL_MS.dailySchedule, () => source.dailySchedule(from, to)),
      // Reverse-leg dailySchedule lets us override scheduledDepart and
      // duration for previousSailings on the reverse route (the same vessel's
      // inbound trips). Without this, reverse-leg rows fall back to stored
      // localStorage data which is often contaminated by the live API's
      // windowed observation pattern.
      cached(`daily:${to}-${from}`, TTL_MS.dailySchedule, () => source.dailySchedule(to, from)),
    ]);

  return { routes, conditions, arrivalConditions, dailySchedule, reverseDailySchedule };
}
