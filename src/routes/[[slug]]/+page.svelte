<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { poll, type Data } from '$lib/client';
  import { attachPreviousSailingsToRoute } from '$lib/client/history';
  import {
    applyDurationOverride,
    applyScheduleOverride,
    buildEnrichedRoutes,
    buildScheduledList,
    injectMissingSailings,
    persistScheduleCorrections,
    type PrevSailingScrapeSource,
  } from '$lib/client/schedule';
  import TerminalHeader from '$lib/components/terminal-header.svelte';
  import TerminalSailings from '$lib/components/terminal-sailings/terminal-sailings.svelte';
  import TerminalContext from '$lib/components/terminal-context/terminal-context.svelte';
  import PeriodicRefresh from '$lib/components/periodic-refresh.svelte';
  import type {
    EnrichmentMap,
    SailingEnrichment,
    SailingLinks,
  } from '$lib/components/terminal-sailings/types';
  import type { CurrentConditionsBeta } from 'scrapemyferry';
  import { formatElapsed, formatTimestamp } from '$lib/utils';
  import { isDev } from '$lib/env';
  import type { PageData } from './$types';

  export let data: PageData;

  let liveData: Data | undefined;

  $: slug = $page.params.slug;
  // scrapemyferry's published dailySchedule is the authoritative source for
  // scheduledDepart — recomputed once when SSR data refreshes, then applied
  // to every live update. Both forward and reverse direction lists feed the
  // previousSailings override so inbound prior trips (reverse route) get
  // proper scheduledDepart instead of stale stored values.
  $: scheduledList = buildScheduledList(data.dailySchedule);
  $: reverseScheduledList = buildScheduledList(data.reverseDailySchedule);
  // Apply override against the slice the live API returned (this is what we
  // want to reconcile back to localStorage). injectMissingSailings then fills
  // in the rest of today from dailySchedule so the UI shows the full day.
  // Duration override fills in route.duration for routes where the live API
  // returns an empty sailingDuration — without it, downstream delay math
  // produces phantom over-under values.
  $: liveRoute = applyScheduleOverride(
    applyDurationOverride(loadRouteFromSlug(liveData, slug), data.dailySchedule),
    scheduledList,
  );
  $: persistScheduleCorrections(liveRoute);
  // Routes map with duration overrides applied for both forward and reverse
  // legs, so prior-sailing lookups on either direction get correct duration.
  $: enrichedRoutes = buildEnrichedRoutes(liveData?.routes, liveRoute, data.reverseDailySchedule);
  $: scheduledListByRoute = buildScheduledListByRoute(
    liveRoute,
    scheduledList,
    reverseScheduledList,
  );
  // scrapemyferry's arrivedUnderway is the primary source for previousSailings.
  // localStorage history (via attachPreviousSailingsToRoute) is the fallback
  // for vessels whose recent activity isn't in the current page's conditions
  // payloads (e.g. they served a totally different route).
  $: scrapeSources = buildScrapeSources(liveRoute, enrichedRoutes, data);
  $: selectedRoute = attachPreviousSailingsToRoute(
    injectMissingSailings(liveRoute, data.dailySchedule, data.conditions),
    enrichedRoutes,
    scrapeSources,
    scheduledListByRoute,
  );
  $: enrichment = buildEnrichmentMap(data.conditions?.upcoming);
  $: links = buildLinks(data.conditions?.links);

  onMount(() => {
    return poll(updated);
  });

  function loadRouteFromSlug(data?: Data, slug?: string) {
    if (!data || !slug) return;

    return data.routes.get(slug);
  }

  function updated(update: Data) {
    liveData = update;
    if (isDev) console.log('Data updated:', liveData);
  }

  function buildEnrichmentMap(
    upcoming: CurrentConditionsBeta['upcoming'] | undefined,
  ): EnrichmentMap | undefined {
    if (!upcoming?.length) return;
    const map: EnrichmentMap = new Map();
    for (const entry of upcoming) {
      const enrichment: SailingEnrichment = {
        checkinOpensAt: entry.checkinOpensAt || undefined,
        spaceReleasedAt: entry.spaceReleasedAt || undefined,
        availableSpace: typeof entry.availableSpace === 'number' ? entry.availableSpace : undefined,
      };
      map.set(entry.scheduled, enrichment);
    }
    return map;
  }

  function buildScheduledListByRoute(
    route: ReturnType<typeof loadRouteFromSlug>,
    forward: Date[],
    reverse: Date[],
  ): Map<string, Date[]> | undefined {
    if (!route) return;
    const map = new Map<string, Date[]>();
    if (forward.length) map.set(route.id, forward);
    if (reverse.length) map.set(`${route.to}${route.from}`, reverse);
    return map.size > 0 ? map : undefined;
  }

  function buildScrapeSources(
    route: ReturnType<typeof loadRouteFromSlug>,
    routes: Map<string, ReturnType<typeof loadRouteFromSlug>> | undefined,
    data: PageData,
  ): PrevSailingScrapeSource[] | undefined {
    if (!route) return;
    const sources: PrevSailingScrapeSource[] = [];
    sources.push({
      routeCode: route.id,
      from: route.from,
      to: route.to,
      duration: route.duration,
      conditions: data.conditions,
      dailySchedule: data.dailySchedule,
    });
    const reverseId = `${route.to}${route.from}`;
    const reverse = routes?.get(reverseId);
    if (reverse) {
      sources.push({
        routeCode: reverseId,
        from: route.to,
        to: route.from,
        duration: reverse.duration,
        conditions: data.arrivalConditions,
        dailySchedule: data.reverseDailySchedule,
      });
    } else {
      // No live route entry — synthesize one so reverse-leg prior sailings
      // still flow through with route metadata from scrapemyferry.
      sources.push({
        routeCode: reverseId,
        from: route.to,
        to: route.from,
        duration: 0,
        conditions: data.arrivalConditions,
        dailySchedule: data.reverseDailySchedule,
      });
    }
    return sources;
  }

  function buildLinks(raw: CurrentConditionsBeta['links'] | undefined): SailingLinks | undefined {
    if (!raw) return;
    return {
      booking: raw.booking || undefined,
      schedule: raw.schedule || undefined,
    };
  }
</script>

<main class="container mx-auto grid h-full grid-rows-[auto,auto,1fr,auto] gap-4">
  {#if liveData}
    <TerminalHeader data={liveData} {selectedRoute} />
  {/if}
  {#if slug}
    <TerminalContext staticContext={data} />
  {/if}
  {#if liveData}
    {#if selectedRoute}
      <TerminalSailings route={selectedRoute} timestamp={liveData.timestamp} {enrichment} {links} />
      {#if liveData.timestamp}
        <div class="w-full justify-self-center rounded-md bg-muted px-2 py-1">
          <p class="text-center text-xs italic leading-none text-muted-foreground">
            <PeriodicRefresh>
              <svelte:fragment let:now>
                {@const elapsed = formatElapsed((now - liveData.timestamp.getTime()) / 1000)}
                updated
                {#if elapsed.value}
                  <code class="font-medium">{elapsed.value}</code>
                {/if}
                {#if elapsed.unit}
                  {elapsed.unit}
                {/if}
                {#if elapsed.value}
                  ago
                {/if}
                ({formatTimestamp(liveData.timestamp)})
              </svelte:fragment>
            </PeriodicRefresh>
          </p>
        </div>
      {/if}
    {/if}
  {/if}
</main>
