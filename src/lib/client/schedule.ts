import type { DailySchedule } from 'scrapemyferry';
import { parseWallClockTime } from '$lib/utils';
import {
  loadHistory,
  reconcileScheduledDepartures,
  saveHistory,
  type ScheduledDepartCorrection,
} from './history';
import type { Route, Sailing } from './types';

const MATCH_WINDOW_MS = 60 * 60 * 1000;

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
