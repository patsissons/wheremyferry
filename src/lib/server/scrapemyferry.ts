import { sourceForType, type DailySchedule, type Source } from 'scrapemyferry';
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

const PACIFIC_TZ = 'America/Vancouver';

/**
 * BC Ferries has no daily schedule page for some minor routes — e.g.
 * routes-fares/schedules/daily/HSB-BOW redirects to the seasonal page — so
 * the daily scrape parses zero rows. Fall back to synthesizing today's
 * schedule from the seasonal page's per-weekday listing. Same midnight
 * staleness window as the daily cache entry it replaces.
 */
async function loadDailySchedule(from: string, to: string): Promise<DailySchedule> {
  const daily = await source.dailySchedule(from, to);
  if (daily.sailings.length > 0) return daily;

  const seasonal = await source.seasonalSchedule(from, to);
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: PACIFIC_TZ,
  }).format(new Date());
  // seasonal day labels are pluralized ("Fridays")
  const day = seasonal.days.find((d) => d.day.toLowerCase().startsWith(weekday.toLowerCase()));
  if (!day) return daily;

  return {
    url: seasonal.url,
    sailings: day.sailings.map(({ depart, arrive, duration, messages }) => ({
      depart,
      arrive,
      duration: normalizeDuration(duration),
      type: messages.join('; '),
    })),
  };
}

// seasonal pages report duration as "0h 20m"; daily pages use "0:20"
function normalizeDuration(value: string): string {
  const match = /^(\d+)h\s+(\d+)m$/.exec(value.trim());
  if (!match) return value;
  return `${match[1]}:${match[2].padStart(2, '0')}`;
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
      cached(`daily:${from}-${to}`, TTL_MS.dailySchedule, () => loadDailySchedule(from, to)),
      // Reverse-leg dailySchedule lets us override scheduledDepart and
      // duration for previousSailings on the reverse route (the same vessel's
      // inbound trips). Without this, reverse-leg rows fall back to stored
      // localStorage data which is often contaminated by the live API's
      // windowed observation pattern.
      cached(`daily:${to}-${from}`, TTL_MS.dailySchedule, () => loadDailySchedule(to, from)),
    ]);

  return { routes, conditions, arrivalConditions, dailySchedule, reverseDailySchedule };
}
