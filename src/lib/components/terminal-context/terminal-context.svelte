<script lang="ts">
  import { page } from '$app/stores';
  import type { Routes, CurrentConditionsBeta } from 'scrapemyferry';
  import type { StaticContext } from '$lib/server/types';
  import MapIcon from '~icons/ion/map-outline';
  import * as Accordion from '../ui/accordion';
  import Webcams from './webcams.svelte';
  import TrackingMap from './tracking-map.svelte';
  import TerminalCard from './terminal-card.svelte';
  import Links from './links.svelte';
  import DailySchedule from './daily-schedule.svelte';
  import TomorrowStrip from './tomorrow-strip.svelte';

  export let staticContext: StaticContext;

  $: ({ conditions, arrivalConditions, dailySchedule, routes } = staticContext);
  $: slug = $page.params.slug;
  $: pair = parseSlug(slug);
  $: terminalName =
    conditions?.terminal?.name ?? findFromName(routes, pair) ?? pair?.from ?? 'Route';
  $: directionsUrl = buildDirectionsUrl(conditions);
  $: hasAny =
    !!conditions?.terminal ||
    !!conditions?.cameras?.webcams?.some((w) => w.url) ||
    !!conditions?.links?.trackingMap ||
    !!dailySchedule?.sailings?.length;

  function parseSlug(slug?: string) {
    if (!slug) return;
    const match = /^([A-Z]{3})([A-Z]{3})$/.exec(slug);
    if (!match) return;
    return { from: match[1], to: match[2] };
  }

  function findFromName(
    routes: Routes | null,
    pair: { from: string; to: string } | undefined,
  ) {
    if (!routes || !pair) return;
    for (const region of routes.regions) {
      for (const from of region.from) {
        if (from.code === pair.from) return from.name;
      }
    }
  }

  function parseScheduledTime(value: string): Date | undefined {
    const match = /^(\d+):(\d+)\s+(AM|PM|am|pm)$/.exec(value.trim());
    if (!match) return;
    const hours = (parseInt(match[1]) % 12) + (match[3].toLowerCase() === 'pm' ? 12 : 0);
    const minutes = parseInt(match[2]);
    const d = new Date();
    d.setHours(hours, minutes, 0, 0); // already zeroes ms via the 4th arg
    return d;
  }

  function buildDirectionsUrl(conditions: CurrentConditionsBeta | null) {
    if (!conditions?.terminal?.address) return;
    const arrivalMs = conditions.upcoming
      ?.map((next) => {
        const scheduled = parseScheduledTime(next.scheduled);
        if (!scheduled) return;

        const arrivalMs = scheduled.getTime() - 20 * 60 * 1000;
        if (arrivalMs <= Date.now()) return;

        return arrivalMs;
      })
      ?.find((arrivalMs) => Boolean(arrivalMs));
    if (!arrivalMs) return;

    // require the sailing be at least 20 minutes in the future

    // the consumer ?api=1 URL spec doesn't support arrival_time, so we use the
    // undocumented data= blob that Google's own UI generates:
    // !4m5/!4m4/!2m2 = nested directions containers
    // !6e1 = arrive by, !8j<unix> = timestamp (standard UTC seconds —
    //        !7e2 would shift interpretation to "seconds since local-1970",
    //        double-applying the tz offset),
    // !3e0 = driving
    // !5m1!1e1 = view-layer container with traffic overlay enabled
    // "Current+Location" as the origin nudges Maps to geolocate the user.
    const destination = encodeURIComponent(conditions.terminal.address);
    const unix = Math.floor(arrivalMs / 1000);
    return `https://www.google.com/maps/dir/Current+Location/${destination}/data=!4m5!4m4!2m2!6e1!8j${unix}!3e0!5m1!1e1`;
  }
</script>

{#if hasAny}
  <Accordion.Root class="rounded-lg border border-muted-foreground bg-muted px-3 py-2">
    <Accordion.Item value="context" class="border-0">
      <div class="flex w-full items-center gap-2">
        <Accordion.Trigger class="flex-1 py-1 text-left text-sm font-semibold">
          {terminalName} details
        </Accordion.Trigger>
        {#if directionsUrl}
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-link"
            aria-label="Directions to {conditions?.terminal?.name ?? 'terminal'}"
            on:click|stopPropagation
          >
            <MapIcon class="size-5" />
          </a>
        {/if}
      </div>
      <Accordion.Content>
        <div class="flex flex-col gap-4 pt-2">
          {#if conditions?.terminal || arrivalConditions?.terminal}
            <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
              {#if conditions?.terminal}
                <TerminalCard terminal={conditions.terminal} label="Departing from" />
              {/if}
              {#if arrivalConditions?.terminal}
                <TerminalCard terminal={arrivalConditions.terminal} label="Arriving at" />
              {/if}
            </div>
          {/if}

          {#if conditions?.links}
            <Links links={conditions.links} />
          {/if}

          {#if conditions?.cameras?.webcams?.length}
            <Webcams cameras={conditions.cameras} />
          {/if}

          {#if conditions?.links?.trackingMap}
            <TrackingMap url={conditions.links.trackingMap} />
          {/if}

          {#if dailySchedule}
            <DailySchedule
              schedule={dailySchedule}
              upcoming={conditions?.upcoming}
              arrivedUnderway={conditions?.arrivedUnderway}
            />
          {/if}

          {#if conditions?.tomorrow?.length}
            <TomorrowStrip tomorrow={conditions.tomorrow} />
          {/if}
        </div>
      </Accordion.Content>
    </Accordion.Item>
  </Accordion.Root>
{/if}
