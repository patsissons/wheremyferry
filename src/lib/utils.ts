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

  if (value === 0) return { value: 'just now' };

  return { value: value.toFixed(), unit };
}

export function calcElapsed(elapsed: number, min = 5) {
  const abs = Math.floor(Math.abs(elapsed));
  if (abs < min) {
    return { value: 0 };
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
