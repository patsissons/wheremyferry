import { isDev } from '$lib/env';
import { vessels } from '$lib/data/vessels';

import type { Data, Route, Sailing, SailingStatus, Vessel } from './types';

const STORAGE_VERSION = 1;

export const HISTORY_CONFIG = {
  windowMs: 24 * 60 * 60 * 1000,
  matchWindowMs: 60 * 60 * 1000,
  transitionalWindowMs: 60 * 60 * 1000,
  transitionalMaxSinceLastSeenMs: 15 * 60 * 1000,
  storageKey: 'wmf:sailings:v1',
};

export interface StoredSailing {
  routeCode: string;
  scheduledDepart: string;
  latestDepart: string;
  latestArrive?: string;
  vesselName?: string;
  lastStatus?: SailingStatus;
  firstSeenAt: string;
  /**
   * last tick in which the API still listed this sailing. drives both
   * pruning (drop rows the API hasn't mentioned for windowMs) and
   * transitional detection (a stored row whose lastSeenAt is recent but
   * which is missing from the current tick is mid-transition).
   */
  lastSeenAt: string;
}

export interface HistoryState {
  version: number;
  updatedAt: string;
  sailings: StoredSailing[];
}

function emptyState(): HistoryState {
  return { version: STORAGE_VERSION, updatedAt: new Date(0).toISOString(), sailings: [] };
}

export function loadHistory(): HistoryState {
  if (typeof localStorage === 'undefined') return emptyState();

  try {
    const raw = localStorage.getItem(HISTORY_CONFIG.storageKey);
    if (!raw) return emptyState();

    const parsed = JSON.parse(raw) as Partial<HistoryState>;
    if (parsed?.version !== STORAGE_VERSION || !Array.isArray(parsed.sailings)) {
      return emptyState();
    }

    return {
      version: STORAGE_VERSION,
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
      sailings: parsed.sailings,
    };
  } catch (err) {
    if (isDev) console.warn('Failed to load sailing history', err);
    return emptyState();
  }
}

export function saveHistory(state: HistoryState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_CONFIG.storageKey, JSON.stringify(state));
  } catch (err) {
    if (isDev) console.warn('Failed to save sailing history', err);
  }
}

// Stored ISO strings from before parseTime started zeroing ms can carry
// residual subseconds. Clamp to minute precision when rehydrating so any
// arithmetic against these Dates (depart delay, total duration, over/under)
// stays minute-aligned.
function parseStoredDate(iso: string): Date {
  const d = new Date(iso);
  d.setSeconds(0, 0);
  return d;
}

export function pruneHistory(state: HistoryState, now: Date): HistoryState {
  const cutoff = now.getTime() - HISTORY_CONFIG.windowMs;
  const sailings = state.sailings.filter((row) => {
    const seen = Date.parse(row.lastSeenAt);
    return Number.isFinite(seen) && seen >= cutoff;
  });

  if (sailings.length === state.sailings.length) return state;

  return { ...state, sailings };
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function findMatch(
  candidates: StoredSailing[],
  routeCode: string,
  depart: Date,
  claimed?: Set<string>,
): StoredSailing | undefined {
  const departTime = depart.getTime();
  let best: StoredSailing | undefined;
  let bestDelta = Infinity;

  for (const row of candidates) {
    if (row.routeCode !== routeCode) continue;
    if (claimed?.has(row.scheduledDepart)) continue;

    const scheduled = new Date(row.scheduledDepart);
    if (!sameLocalDay(scheduled, depart)) continue;

    const delta = Math.abs(scheduled.getTime() - departTime);
    if (delta > HISTORY_CONFIG.matchWindowMs) continue;

    if (delta < bestDelta) {
      best = row;
      bestDelta = delta;
    }
  }

  return best;
}

export function upsertFromApi(state: HistoryState, data: Data, now: Date): HistoryState {
  const nowIso = now.toISOString();
  const rows = state.sailings.map((row) => ({ ...row }));

  for (const route of data.routes.values()) {
    // greedy claim per route — prevents two API sailings from both binding to
    // the same stored row when the match window covers more than one sailing.
    const claimed = new Set<string>();

    for (const sailing of route.sailings) {
      if (!(sailing.depart instanceof Date)) continue;

      const match = findMatch(rows, route.id, sailing.depart, claimed);
      const departIso = sailing.depart.toISOString();
      const arriveIso = sailing.arrive instanceof Date ? sailing.arrive.toISOString() : undefined;

      if (match) {
        claimed.add(match.scheduledDepart);
        match.latestDepart = departIso;
        match.latestArrive = arriveIso;
        match.vesselName = sailing.vessel?.name ?? match.vesselName;
        match.lastStatus = sailing.status ?? match.lastStatus;
        match.lastSeenAt = nowIso;
      } else {
        const fresh: StoredSailing = {
          routeCode: route.id,
          scheduledDepart: departIso,
          latestDepart: departIso,
          latestArrive: arriveIso,
          vesselName: sailing.vessel?.name,
          lastStatus: sailing.status,
          firstSeenAt: nowIso,
          lastSeenAt: nowIso,
        };
        rows.push(fresh);
        claimed.add(fresh.scheduledDepart);
      }
    }
  }

  return { version: STORAGE_VERSION, updatedAt: nowIso, sailings: rows };
}

export function mergeWithHistory(state: HistoryState, data: Data, now: Date): Data {
  if (state.sailings.length === 0) return data;

  const routes = new Map<string, Route>();
  const nowMs = now.getTime();

  for (const [id, route] of data.routes) {
    const matchedScheduled = new Set<string>();
    const enhanced = route.sailings.map((sailing) => {
      if (!(sailing.depart instanceof Date)) return sailing;
      const match = findMatch(state.sailings, route.id, sailing.depart, matchedScheduled);
      if (!match) return sailing;
      matchedScheduled.add(match.scheduledDepart);
      return { ...sailing, scheduledDepart: parseStoredDate(match.scheduledDepart) };
    });

    const injected: Sailing[] = [];

    for (const stored of state.sailings) {
      if (stored.routeCode !== route.id) continue;
      if (matchedScheduled.has(stored.scheduledDepart)) continue;
      if (stored.lastStatus !== 'future') continue;

      const scheduled = new Date(stored.scheduledDepart);
      if (Math.abs(scheduled.getTime() - nowMs) > HISTORY_CONFIG.transitionalWindowMs) continue;

      const sinceLastSeen = nowMs - Date.parse(stored.lastSeenAt);
      if (!Number.isFinite(sinceLastSeen)) continue;
      if (sinceLastSeen > HISTORY_CONFIG.transitionalMaxSinceLastSeenMs) continue;

      const vessel: Vessel | undefined = stored.vesselName
        ? { ...vessels[stored.vesselName], name: stored.vesselName }
        : undefined;

      injected.push({
        depart: parseStoredDate(stored.latestDepart),
        arrive: stored.latestArrive ? parseStoredDate(stored.latestArrive) : undefined,
        scheduledDepart: parseStoredDate(stored.scheduledDepart),
        vessel,
        status: 'departing',
      });
    }

    const sailings =
      injected.length === 0
        ? enhanced
        : [...enhanced, ...injected].sort((a, b) => sailingSortKey(a) - sailingSortKey(b));

    routes.set(id, { ...route, sailings });
  }

  return { ...data, routes };
}

export function sailingSortKey(sailing: Sailing): number {
  const key = sailing.scheduledDepart ?? sailing.depart;
  return key instanceof Date ? key.getTime() : Number.MAX_SAFE_INTEGER;
}
