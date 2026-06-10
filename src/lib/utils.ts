import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type FlyAndScaleParams = {
  y?: number;
  x?: number;
  start?: number;
  duration?: number;
};

export const flyAndScale = (
  node: Element,
  params: FlyAndScaleParams = { y: -8, x: 0, start: 0.95, duration: 150 },
): TransitionConfig => {
  const style = getComputedStyle(node);
  const transform = style.transform === 'none' ? '' : style.transform;

  const scaleConversion = (valueA: number, scaleA: [number, number], scaleB: [number, number]) => {
    const [minA, maxA] = scaleA;
    const [minB, maxB] = scaleB;

    const percentage = (valueA - minA) / (maxA - minA);
    const valueB = percentage * (maxB - minB) + minB;

    return valueB;
  };

  const styleToString = (style: Record<string, number | string | undefined>): string => {
    return Object.keys(style).reduce((str, key) => {
      if (style[key] === undefined) return str;
      return str + `${key}:${style[key]};`;
    }, '');
  };

  return {
    duration: params.duration ?? 200,
    delay: 0,
    css: (t) => {
      const y = scaleConversion(t, [0, 1], [params.y ?? 5, 0]);
      const x = scaleConversion(t, [0, 1], [params.x ?? 0, 0]);
      const scale = scaleConversion(t, [0, 1], [params.start ?? 0.95, 1]);

      return styleToString({
        transform: `${transform} translate3d(${x}px, ${y}px, 0) scale(${scale})`,
        opacity: t,
      });
    },
    easing: cubicOut,
  };
};

export function formatTimestamp(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function formatTime(time: Date) {
  return time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDuration(duration: number) {
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);

  if (!hours) return `${minutes}m`;

  return `${hours}h ${minutes}m`;
}

export function formatElapsed(elapsed: number) {
  const { value, unit } = calcElapsed(elapsed);

  if (value === 0) return { unit };

  return { value: value.toFixed(), unit };
}

export function calcElapsed(elapsed: number, min = 5) {
  const abs = Math.floor(Math.abs(elapsed));
  if (abs < min) {
    return { value: 0, unit: 'just now' };
  }

  let value = Math.floor(elapsed),
    unit = 'second';
  if (abs > 3600) {
    value = Math.floor(elapsed / 3600);
    unit = 'hour';
  } else if (abs > 60) {
    value = Math.floor(elapsed / 60);
    unit = 'minute';
  }

  return { value, unit: unit + (value === 1 ? '' : 's') };
}

export function calcSince(time: Date) {
  const elapsed = Math.floor(Date.now() - time.getTime()) / 1000;
  return calcElapsed(elapsed);
}

export function seasonalSailingsUrl(from: string, to: string) {
  return `https://www.bcferries.com/routes-fares/schedules/seasonal/${from}-${to}`;
}

export function currentConditionsUrl(from: string, to: string) {
  return `https://www.bcferries.com/current-conditions/${from}-${to}`;
}

export function vesselFinderUrl(id: number) {
  return `https://www.vesselfinder.com/vessels/details/${id}`;
}

/**
 * Fraction (0..1) of how far into a crossing we are right now, or undefined
 * when there isn't enough info to derive one. After arrival, returns 1 until
 * one durationMs has elapsed past arrive, then 0 — keeps the bar visible just
 * long enough to confirm completion without sticking on stale sailings.
 */
export function calcSailingProgress(
  depart: Date,
  arrive: Date | string | undefined,
  duration: number,
): number | undefined {
  const now = Date.now();
  const departTime = depart.getTime();
  if (now < departTime) return 0;

  const durationMs = duration * 1000;

  if (arrive instanceof Date) {
    const arriveTime = arrive.getTime();
    if (now >= arriveTime) {
      if (now - arriveTime > durationMs) return 0;
      return 1;
    }
    return (now - departTime) / (arriveTime - departTime);
  } else if (duration > 0) {
    return Math.max(0, Math.min(1, (now - departTime) / durationMs));
  }
}

/**
 * Parse a wall-clock time string like "7:30 am" / "10:25 PM" into a Date at
 * today's local date with seconds/ms zeroed. Case-insensitive. Returns
 * undefined when the input doesn't match the expected shape.
 */
export function parseWallClockTime(value: string): Date | undefined {
  const match = /^(\d+):(\d+)\s+(AM|PM|am|pm)$/.exec(value.trim());
  if (!match) return;
  const hours = (parseInt(match[1]) % 12) + (match[3].toLowerCase() === 'pm' ? 12 : 0);
  const minutes = parseInt(match[2]);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}
