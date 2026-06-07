<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { poll, type Data } from '$lib/client';
  import {
    applyDurationOverride,
    applyScheduleOverride,
    buildScheduledList,
    injectMissingSailings,
    persistScheduleCorrections,
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
  // to every live update.
  $: scheduledList = buildScheduledList(data.dailySchedule);
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
  $: selectedRoute = injectMissingSailings(liveRoute, data.dailySchedule, data.conditions);
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
