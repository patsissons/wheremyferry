import { isDev } from '$lib/env';
import { vessels } from '$lib/data/vessels';

import { findPreviousSailingsFromScrape, type PrevSailingScrapeSource } from './schedule';
import type { Data, PreviousSailing, Route, Sailing, SailingStatus, Vessel } from './types';

const STORAGE_VERSION = 1;

export const HISTORY_CONFIG = {
  windowMs: 24 * 60 * 60 * 1000,
  matchWindowMs: 60 * 60 * 1000,
  transitionalWindowMs: 60 * 60 * 1000,
  transitionalMaxSinceLastSeenMs: 15 * 60 * 1000,
  // how far back to look for prior same-vessel sailings to surface as
  // "recent history" context inside a sailing's expanded view
  previousVesselWindowMs: 6 * 60 * 60 * 1000,
  previousVesselLimit: 2,
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

/**
 * Drop stored rows whose scheduledDepart doesn't match any actual entry in
 * the authoritative dailySchedule for their route. These are usually
 * "phantom" rows caused by findMatch latching onto the wrong scheduled slot
 * during a windowed API observation, and leaving them in place means the
 * NEXT findMatch can latch onto them too, propagating the contamination.
 *
 * Limited to routes we actually have dailySchedule for (forward + reverse);
 * rows on routes we can't verify are left alone.
 */
export function evictContaminatedRows(
  state: HistoryState,
  knownSchedules: Map<string, Date[]>,
  matchWindowMs: number = 5 * 60 * 1000,
): HistoryState {
  if (knownSchedules.size === 0) return state;
  let mutated = false;

  const keep = state.sailings.filter((row) => {
    const schedule = knownSchedules.get(row.routeCode);
    if (!schedule?.length) return true;

    const scheduledMs = Date.parse(row.scheduledDepart);
    if (!Number.isFinite(scheduledMs)) {
      mutated = true;
      return false;
    }

    const hasMatch = schedule.some((s) => Math.abs(s.getTime() - scheduledMs) <= matchWindowMs);
    if (!hasMatch) mutated = true;
    return hasMatch;
  });

  if (!mutated) return state;
  return {
    version: STORAGE_VERSION,
    updatedAt: new Date().toISOString(),
    sailings: keep,
  };
}

export interface ScheduledDepartCorrection {
  /** matches stored row.latestDepart (which always equals the live sailing's
   *  depart after the most recent upsertFromApi pass) */
  latestDepartIso: string;
  scheduledDepartIso: string;
}

/**
 * Update stored rows' scheduledDepart when scrapemyferry's published schedule
 * disagrees with what we recorded. Without this, sailings learned during the
 * API "blind spot" (page first loaded after the sailing went current/past)
 * would forever have scheduledDepart === actualDepart, hiding the real delay.
 *
 * Limited to the given routeId — we only have authoritative dailySchedule for
 * the currently-selected route, so we never touch other routes' rows.
 *
 * If a correction would produce a (routeCode, scheduledDepart) duplicate of
 * another row, the more recently seen one wins and the older copy is dropped.
 */
export function reconcileScheduledDepartures(
  state: HistoryState,
  routeId: string,
  corrections: ScheduledDepartCorrection[],
): HistoryState {
  if (corrections.length === 0) return state;

  const correctionByDepart = new Map<string, string>();
  for (const c of corrections) correctionByDepart.set(c.latestDepartIso, c.scheduledDepartIso);

  let mutated = false;
  const updated = state.sailings.map((row) => {
    if (row.routeCode !== routeId) return row;
    const corrected = correctionByDepart.get(row.latestDepart);
    if (!corrected || corrected === row.scheduledDepart) return row;
    mutated = true;
    return { ...row, scheduledDepart: corrected };
  });

  if (!mutated) return state;

  // Dedupe by (routeCode, scheduledDepart); keep the most recently seen row.
  // Walks every row, not just routeId — cheap and prevents stale duplicates
  // from any prior bad correction.
  const byKey = new Map<string, StoredSailing>();
  for (const row of updated) {
    const key = `${row.routeCode}|${row.scheduledDepart}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }
    const existingSeen = Date.parse(existing.lastSeenAt);
    const rowSeen = Date.parse(row.lastSeenAt);
    if (Number.isFinite(rowSeen) && (!Number.isFinite(existingSeen) || rowSeen >= existingSeen)) {
      byKey.set(key, row);
    }
  }

  return {
    version: STORAGE_VERSION,
    updatedAt: new Date().toISOString(),
    sailings: Array.from(byKey.values()),
  };
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
  exactOnly = false,
): StoredSailing | undefined {
  const departTime = depart.getTime();
  let best: StoredSailing | undefined;
  let bestDelta = Infinity;

  for (const row of candidates) {
    if (row.routeCode !== routeCode) continue;
    if (claimed?.has(row.scheduledDepart)) continue;

    const scheduled = new Date(row.scheduledDepart);
    if (!sameLocalDay(scheduled, depart)) continue;

    if (exactOnly) {
      // minute-clamped equality — stored rows from before parseTime zeroed
      // subseconds can carry residual ms that raw comparison would miss
      if (parseStoredDate(row.scheduledDepart).getTime() === departTime) return row;
      continue;
    }

    const delta = Math.abs(scheduled.getTime() - departTime);
    if (delta > HISTORY_CONFIG.matchWindowMs) continue;

    if (delta < bestDelta) {
      best = row;
      bestDelta = delta;
    }
  }

  return best;
}

/**
 * Match each sailing (by index) to a stored row in two passes: sailings whose
 * depart exactly equals a row's scheduledDepart claim their row first, then
 * the rest match nearest-within-window. Single-pass greedy matching let a
 * delayed sailing steal the row belonging to a sailing departing exactly at
 * that scheduled time; the on-time sailing then fell back to keying by its
 * own depart, colliding with the thief's scheduledDepart (duplicate keys in
 * the sailings keyed each).
 */
function matchSailingsToRows(
  sailings: Sailing[],
  rows: StoredSailing[],
  routeCode: string,
): Map<number, StoredSailing> {
  const claimed = new Set<string>();
  const matches = new Map<number, StoredSailing>();

  for (const exactOnly of [true, false]) {
    sailings.forEach((sailing, idx) => {
      if (matches.has(idx)) return;
      if (!(sailing.depart instanceof Date)) return;
      const match = findMatch(rows, routeCode, sailing.depart, claimed, exactOnly);
      if (!match) return;
      claimed.add(match.scheduledDepart);
      matches.set(idx, match);
    });
  }

  return matches;
}

export function upsertFromApi(state: HistoryState, data: Data, now: Date): HistoryState {
  const nowIso = now.toISOString();
  const rows = state.sailings.map((row) => ({ ...row }));

  for (const route of data.routes.values()) {
    // two-pass claim per route — prevents two API sailings from both binding
    // to the same stored row, and stops a delayed sailing from stealing an
    // on-time sailing's exact row.
    const matches = matchSailingsToRows(route.sailings, rows, route.id);

    route.sailings.forEach((sailing, idx) => {
      if (!(sailing.depart instanceof Date)) return;

      const match = matches.get(idx);

      // Only upsert from sailings that haven't departed yet. Once a sailing
      // is current/past, scrapemyferry's currentConditionsBeta has more
      // accurate actuals (departed/arrived/vessel) than the BC Ferries JSON
      // API, and persisting the API's values to localStorage was
      // contaminating the previousSailings lookup. We still bump lastSeenAt
      // on existing rows so they don't get pruned out from under us during
      // the 24h window.
      if (sailing.status !== 'future') {
        if (match) match.lastSeenAt = nowIso;
        return;
      }

      const departIso = sailing.depart.toISOString();
      const arriveIso = sailing.arrive instanceof Date ? sailing.arrive.toISOString() : undefined;

      if (match) {
        match.latestDepart = departIso;
        match.latestArrive = arriveIso;
        match.vesselName = sailing.vessel?.name ?? match.vesselName;
        match.lastStatus = sailing.status ?? match.lastStatus;
        match.lastSeenAt = nowIso;
      } else {
        rows.push({
          routeCode: route.id,
          scheduledDepart: departIso,
          latestDepart: departIso,
          latestArrive: arriveIso,
          vesselName: sailing.vessel?.name,
          lastStatus: sailing.status,
          firstSeenAt: nowIso,
          lastSeenAt: nowIso,
        });
      }
    });
  }

  return { version: STORAGE_VERSION, updatedAt: nowIso, sailings: rows };
}

function buildPreviousSailing(row: StoredSailing, routes: Map<string, Route>): PreviousSailing {
  const route = routes.get(row.routeCode);
  // routeCode is from+to concatenated (e.g. "HSBLNG"); fall back to splitting
  // it if the route isn't currently in the API payload (vessel briefly served
  // a non-scheduled route, etc.)
  const from = route?.from ?? row.routeCode.slice(0, 3);
  const to = route?.to ?? row.routeCode.slice(3, 6);
  const duration = route?.duration ?? 0;
  const vessel: Vessel | undefined = row.vesselName
    ? { ...vessels[row.vesselName], name: row.vesselName }
    : undefined;

  const depart = parseStoredDate(row.latestDepart);
  const actualArrive = row.latestArrive ? parseStoredDate(row.latestArrive) : undefined;
  // Project arrival from depart + scheduled duration when the API never
  // reported an actual arrival. Carries the departure delay forward into the
  // arrival delta, which is the best signal we have for "how late did this
  // inbound trip actually run". Skipped when duration is 0 because the
  // projection would degenerate to arrive = depart and produce noisy badges.
  const arrive =
    actualArrive ?? (duration > 0 ? new Date(depart.getTime() + duration * 1000) : undefined);

  return {
    routeCode: row.routeCode,
    from,
    to,
    duration,
    depart,
    arrive,
    scheduledDepart: parseStoredDate(row.scheduledDepart),
    vessel,
    status: row.lastStatus,
  };
}

function findPreviousVesselSailings(
  rows: StoredSailing[],
  vesselName: string,
  beforeMs: number,
  routes: Map<string, Route>,
): PreviousSailing[] {
  const cutoff = beforeMs - HISTORY_CONFIG.previousVesselWindowMs;
  return rows
    .filter((row) => {
      if (row.vesselName !== vesselName) return false;
      const departTime = Date.parse(row.latestDepart);
      if (!Number.isFinite(departTime)) return false;
      // strictly before this sailing — excludes the current sailing's own row
      return departTime < beforeMs && departTime >= cutoff;
    })
    .sort((a, b) => Date.parse(b.latestDepart) - Date.parse(a.latestDepart))
    .slice(0, HISTORY_CONFIG.previousVesselLimit)
    .map((row) => buildPreviousSailing(row, routes));
}

/**
 * Anchor the "previous sailings" cutoff at the scheduled time when a sailing
 * ran late. A stale conditions snapshot can still list the sailing itself in
 * `upcoming` under its scheduled time; anchoring at the actual (later) depart
 * would let the sailing match itself as its own previous trip.
 */
function previousSailingCutoffMs(
  depart: Date,
  scheduledDepart: Sailing['scheduledDepart'],
): number {
  const departMs = depart.getTime();
  return scheduledDepart instanceof Date ? Math.min(scheduledDepart.getTime(), departMs) : departMs;
}

export function attachPreviousSailings<T extends Sailing>(
  sailing: T,
  state: HistoryState,
  routes: Map<string, Route>,
): T {
  const vesselName = sailing.vessel?.name;
  if (!vesselName) return sailing;
  if (!(sailing.depart instanceof Date)) return sailing;
  const previousSailings = findPreviousVesselSailings(
    state.sailings,
    vesselName,
    previousSailingCutoffMs(sailing.depart, sailing.scheduledDepart),
    routes,
  );
  if (previousSailings.length === 0) return sailing;
  return { ...sailing, previousSailings };
}

/**
 * Attach previousSailings to every sailing in the route, preferring
 * scrapemyferry's authoritative arrivedUnderway data over localStorage
 * history. localStorage is only consulted as a fallback for vessels that
 * scrape data doesn't cover (e.g. a vessel that briefly served a route
 * outside the current page's scope).
 */
export function attachPreviousSailingsToRoute(
  route: Route | undefined,
  routes: Map<string, Route> | undefined,
  scrapeSources?: PrevSailingScrapeSource[],
  scheduledListByRoute?: Map<string, Date[]>,
): Route | undefined {
  if (!route || !routes) return route;

  const hasScrape = !!scrapeSources?.length;
  const hasLocalStorage = typeof localStorage !== 'undefined';
  const state = hasLocalStorage ? loadHistory() : undefined;
  const hasFallback = !!state && state.sailings.length > 0;
  if (!hasScrape && !hasFallback) return route;

  const sailings = route.sailings.map((sailing) => {
    const vesselName = sailing.vessel?.name;
    if (!vesselName) return sailing;
    if (!(sailing.depart instanceof Date)) return sailing;

    const beforeMs = previousSailingCutoffMs(sailing.depart, sailing.scheduledDepart);

    let previousSailings: PreviousSailing[] = [];
    if (hasScrape) {
      previousSailings = findPreviousSailingsFromScrape(vesselName, beforeMs, scrapeSources!);
    }

    // Fallback to localStorage only when scrape gave us nothing.
    if (previousSailings.length === 0 && hasFallback) {
      previousSailings = findPreviousVesselSailings(state!.sailings, vesselName, beforeMs, routes);
      // For fallback rows, override scheduledDepart from authoritative
      // dailySchedule when available — stored value may be contaminated.
      if (previousSailings.length > 0 && scheduledListByRoute?.size) {
        previousSailings = previousSailings.map((prev) => {
          const scheduledList = scheduledListByRoute.get(prev.routeCode);
          if (!scheduledList?.length) return prev;
          const closest = findClosestScheduled(prev.depart, scheduledList);
          if (!closest) return prev;
          return { ...prev, scheduledDepart: closest };
        });
      }
    }

    if (previousSailings.length === 0) return sailing;
    return { ...sailing, previousSailings };
  });
  return { ...route, sailings };
}

function findClosestScheduled(depart: Date, scheduledList: Date[]): Date | undefined {
  const departMs = depart.getTime();
  let best: Date | undefined;
  let bestDelta = Infinity;
  for (const s of scheduledList) {
    const delta = Math.abs(s.getTime() - departMs);
    if (delta > 60 * 60 * 1000) continue;
    if (delta < bestDelta) {
      bestDelta = delta;
      best = s;
    }
  }
  return best;
}

export function mergeWithHistory(state: HistoryState, data: Data, now: Date): Data {
  if (state.sailings.length === 0) return data;

  const routes = new Map<string, Route>();
  const nowMs = now.getTime();

  for (const [id, route] of data.routes) {
    // mergeWithHistory only handles scheduledDepart enrichment + transitional
    // 'departing' injection. previousSailings attachment is deferred to a
    // page-level pass (attachPreviousSailingsToRoute) so it can prefer
    // scrapemyferry's authoritative arrivedUnderway data over the
    // localStorage history.
    const matches = matchSailingsToRows(route.sailings, state.sailings, route.id);
    const matchedScheduled = new Set<string>();
    for (const match of matches.values()) matchedScheduled.add(match.scheduledDepart);
    const enhanced = route.sailings.map((sailing, idx) => {
      const match = matches.get(idx);
      if (!match) return sailing;
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
