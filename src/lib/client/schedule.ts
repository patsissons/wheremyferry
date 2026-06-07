import type { CurrentConditionsBeta, DailySchedule } from 'scrapemyferry';
import { vessels } from '$lib/data/vessels';
import { parseWallClockTime } from '$lib/utils';
import {
  loadHistory,
  reconcileScheduledDepartures,
  saveHistory,
  type ScheduledDepartCorrection,
} from './history';
import type { PreviousSailing, Route, Sailing, SailingStatus, Vessel } from './types';

const PREVIOUS_SAILING_WINDOW_MS = 6 * 60 * 60 * 1000;
const PREVIOUS_SAILING_LIMIT = 2;

const MATCH_WINDOW_MS = 60 * 60 * 1000;

/**
 * Some BC Ferries API routes (often noncapacity ones) come back with an
 * empty sailingDuration, so `route.duration` parses to 0. That breaks every
 * downstream delay calc (depart/arrive over-under, total time from scheduled
 * departure, progress bar). Fall back to the first parseable duration in
 * scrapemyferry's dailySchedule for that route, which is always populated.
 *
 * Per-sailing duration variance (e.g. a "Round trip" entry that's longer
 * than regular sailings) is ignored here — picking the first entry is a
 * pragmatic choice that handles the typical case and avoids threading
 * per-sailing duration through the render pipeline.
 */
export function applyDurationOverride(
  route: Route | undefined,
  dailySchedule: DailySchedule | null | undefined,
): Route | undefined {
  if (!route) return route;
  if (route.duration > 0) return route;
  if (!dailySchedule?.sailings?.length) return route;
  for (const entry of dailySchedule.sailings) {
    const seconds = parseScheduleDurationSeconds(entry.duration);
    if (seconds > 0) return { ...route, duration: seconds };
  }
  return route;
}

// dailySchedule entries report duration as "HH:MM" (e.g. "00:40", "01:35").
function parseScheduleDurationSeconds(value: string): number {
  const match = /^(\d+):(\d+)$/.exec(value.trim());
  if (!match) return 0;
  return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60;
}

/**
 * Construct a routes Map with duration overrides applied for both the current
 * (forward) route and its reverse leg, using each direction's own dailySchedule.
 * This is what attachPreviousSailingsToRoute needs in order to compute correct
 * duration-dependent badges (totalDelay, projected arrive) for prior sailings
 * on either direction.
 */
export function buildEnrichedRoutes(
  routes: Map<string, Route> | undefined,
  selectedRoute: Route | undefined,
  reverseDailySchedule: DailySchedule | null | undefined,
): Map<string, Route> | undefined {
  if (!routes) return routes;
  const map = new Map(routes);
  if (selectedRoute) {
    map.set(selectedRoute.id, selectedRoute);
    const reverseId = `${selectedRoute.to}${selectedRoute.from}`;
    const reverse = map.get(reverseId);
    if (reverse) {
      const enriched = applyDurationOverride(reverse, reverseDailySchedule);
      if (enriched) map.set(reverseId, enriched);
    }
  }
  return map;
}

export function buildScheduledList(dailySchedule: DailySchedule | null | undefined): Date[] {
  if (!dailySchedule?.sailings?.length) return [];
  return dailySchedule.sailings
    .map((s) => parseWallClockTime(s.depart))
    .filter((d): d is Date => d instanceof Date)
    .sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Override each sailing's scheduledDepart with the BC Ferries published
 * dailySchedule entry it most closely matches (within an hour). dailySchedule
 * is authoritative — it tells us the real publish-time scheduled departure
 * regardless of when the user loaded the page. History-derived
 * scheduledDepart is preserved as a fallback for sailings that don't match
 * any dailySchedule entry (e.g. cancellations, off-schedule special sailings,
 * or when scrapemyferry's scrape failed).
 *
 * Greedy claim-once matching: each dailySchedule entry can only be assigned
 * to one live sailing, so two sailings can't both claim the same scheduled
 * slot.
 */
export function applyScheduleOverride(
  route: Route | undefined,
  scheduledList: Date[],
): Route | undefined {
  if (!route || scheduledList.length === 0) return route;

  const remaining = scheduledList.map((d) => d.getTime());
  const sailings: Sailing[] = route.sailings.map((sailing) => {
    if (!(sailing.depart instanceof Date)) return sailing;
    const departMs = sailing.depart.getTime();

    let bestIdx = -1;
    let bestDelta = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const delta = Math.abs(remaining[i] - departMs);
      if (delta > MATCH_WINDOW_MS) continue;
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIdx = i;
      }
    }

    if (bestIdx < 0) return sailing;
    const scheduledMs = remaining.splice(bestIdx, 1)[0];
    return { ...sailing, scheduledDepart: new Date(scheduledMs) };
  });

  return { ...route, sailings };
}

/**
 * The BC Ferries JSON API only returns a windowed slice of today's sailings
 * (typically a few past + a few upcoming), so the live sailings list is
 * incomplete. Use scrapemyferry's full dailySchedule to fill in the gaps,
 * enriching synthesized sailings with vessel + actual times from
 * currentConditionsBeta when an entry there matches.
 */
export function injectMissingSailings(
  route: Route | undefined,
  dailySchedule: DailySchedule | null | undefined,
  conditions: CurrentConditionsBeta | null | undefined,
): Route | undefined {
  if (!route) return route;
  if (!dailySchedule?.sailings?.length) return route;

  // Track scheduled times already represented in the live list so we don't
  // duplicate. Live sailings carry scheduledDepart from applyScheduleOverride
  // when a dailySchedule entry was claimed; otherwise their `depart` itself
  // is the relevant marker.
  const presentScheduledMs = new Set<number>();
  for (const s of route.sailings) {
    if (s.scheduledDepart instanceof Date) {
      presentScheduledMs.add(s.scheduledDepart.getTime());
    } else if (s.depart instanceof Date) {
      presentScheduledMs.add(s.depart.getTime());
    }
  }

  const arrivedByScheduled = new Map<string, CurrentConditionsBeta['arrivedUnderway'][number]>();
  const upcomingByScheduled = new Map<string, CurrentConditionsBeta['upcoming'][number]>();
  for (const a of conditions?.arrivedUnderway ?? []) arrivedByScheduled.set(a.scheduled, a);
  for (const u of conditions?.upcoming ?? []) upcomingByScheduled.set(u.scheduled, u);

  const nowMs = Date.now();
  const injected: Sailing[] = [];

  for (const entry of dailySchedule.sailings) {
    const scheduled = parseWallClockTime(entry.depart);
    if (!scheduled) continue;
    if (presentScheduledMs.has(scheduled.getTime())) continue;

    const arriveScheduled = parseWallClockTime(entry.arrive);
    const arrivedEntry = arrivedByScheduled.get(entry.depart);
    const upcomingEntry = upcomingByScheduled.get(entry.depart);

    let depart: Date = scheduled;
    let arrive: Date | undefined = arriveScheduled;
    let vessel: Vessel | undefined;
    let status: SailingStatus | undefined;

    if (arrivedEntry) {
      depart = parseWallClockTime(arrivedEntry.departed) ?? scheduled;
      arrive = parseWallClockTime(arrivedEntry.arrived) ?? arriveScheduled;
      vessel = makeVessel(arrivedEntry.vessel?.name);
      status = 'past';
    } else if (upcomingEntry) {
      depart = parseWallClockTime(upcomingEntry.etd) ?? scheduled;
      arrive = parseWallClockTime(upcomingEntry.eta) ?? arriveScheduled;
      vessel = makeVessel(upcomingEntry.vessel?.name);
      status = 'future';
    } else {
      // no conditions enrichment — infer status from scheduled times alone
      if (scheduled.getTime() > nowMs) status = 'future';
      else if (arriveScheduled && arriveScheduled.getTime() > nowMs) status = 'current';
      else status = 'past';
    }

    injected.push({ depart, arrive, scheduledDepart: scheduled, vessel, status });
  }

  if (injected.length === 0) return route;

  const sailings = [...route.sailings, ...injected].sort(sailingSortKey);
  return { ...route, sailings };
}

function makeVessel(name: string | undefined): Vessel | undefined {
  if (!name) return undefined;
  return { ...vessels[name], name };
}

function sailingSortKey(a: Sailing, b: Sailing): number {
  const aMs = sortMs(a);
  const bMs = sortMs(b);
  return aMs - bMs;
}

function sortMs(s: Sailing): number {
  if (s.scheduledDepart instanceof Date) return s.scheduledDepart.getTime();
  if (s.depart instanceof Date) return s.depart.getTime();
  return Number.MAX_SAFE_INTEGER;
}

/**
 * Source of scrapemyferry "what happened today" data for one route direction,
 * used to build PreviousSailing rows for an inbound vessel.
 */
export interface PrevSailingScrapeSource {
  routeCode: string;
  from: string;
  to: string;
  duration: number;
  conditions: CurrentConditionsBeta | null | undefined;
  dailySchedule: DailySchedule | null | undefined;
}

/**
 * Build previousSailings for `vesselName` from scrapemyferry's authoritative
 * arrivedUnderway data, drawing from both the forward and reverse route
 * sources passed in. This is the primary path — localStorage history is only
 * consulted as a fallback when scrape data has no entries for the vessel
 * (e.g. it served a route outside our current page's scope).
 */
export function findPreviousSailingsFromScrape(
  vesselName: string,
  beforeMs: number,
  sources: PrevSailingScrapeSource[],
): PreviousSailing[] {
  const cutoffMs = beforeMs - PREVIOUS_SAILING_WINDOW_MS;
  type Candidate = { prev: PreviousSailing; departMs: number };
  const candidates: Candidate[] = [];

  for (const src of sources) {
    const arrivedUnderway = src.conditions?.arrivedUnderway;
    if (!arrivedUnderway?.length) continue;

    // Per-sailing duration from dailySchedule, keyed by the scheduled time
    // string used in arrivedUnderway entries.
    const durationByScheduled = new Map<string, number>();
    for (const entry of src.dailySchedule?.sailings ?? []) {
      const dur = parseScheduleDurationSeconds(entry.duration);
      if (dur > 0) durationByScheduled.set(entry.depart, dur);
    }

    for (const entry of arrivedUnderway) {
      if (entry.vessel?.name !== vesselName) continue;
      const departed = parseWallClockTime(entry.departed);
      if (!departed) continue;
      const departMs = departed.getTime();
      if (departMs >= beforeMs || departMs < cutoffMs) continue;

      const scheduled = parseWallClockTime(entry.scheduled);
      const arrived = entry.arrived ? parseWallClockTime(entry.arrived) : undefined;
      const duration = durationByScheduled.get(entry.scheduled) ?? src.duration;
      // Project arrive from depart + scheduled duration when the API hasn't
      // recorded an actual arrival yet (vessel still underway).
      const arrive =
        arrived ?? (duration > 0 ? new Date(departMs + duration * 1000) : undefined);

      candidates.push({
        prev: {
          routeCode: src.routeCode,
          from: src.from,
          to: src.to,
          duration,
          depart: departed,
          arrive,
          scheduledDepart: scheduled,
          vessel: makeVessel(vesselName),
          status: 'past',
        },
        departMs,
      });
    }
  }

  candidates.sort((a, b) => b.departMs - a.departMs);
  return candidates.slice(0, PREVIOUS_SAILING_LIMIT).map((c) => c.prev);
}

/**
 * Persist scheduledDepart corrections discovered by applyScheduleOverride
 * back into localStorage so they also flow through to features that read
 * directly from history (e.g. the previousSailings list inside expanded
 * sailing items). No-op on the server / when localStorage isn't available,
 * and skips the localStorage round-trip entirely when nothing changed.
 */
export function persistScheduleCorrections(route: Route | undefined): void {
  if (typeof localStorage === 'undefined') return;
  if (!route?.sailings?.length) return;

  const corrections: ScheduledDepartCorrection[] = [];
  for (const sailing of route.sailings) {
    if (!(sailing.depart instanceof Date)) continue;
    if (!(sailing.scheduledDepart instanceof Date)) continue;
    corrections.push({
      latestDepartIso: sailing.depart.toISOString(),
      scheduledDepartIso: sailing.scheduledDepart.toISOString(),
    });
  }
  if (corrections.length === 0) return;

  const state = loadHistory();
  const next = reconcileScheduledDepartures(state, route.id, corrections);
  if (next !== state) saveHistory(next);
}
