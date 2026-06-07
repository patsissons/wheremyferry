<script lang="ts">
  import type { AnySailing, Sailing } from '$lib/client';
  import { isDev } from '$lib/env';
  import {
    currentConditionsUrl,
    formatDuration,
    formatTime,
    formatTimestamp,
    vesselFinderUrl,
  } from '$lib/utils';
  import type { SailingEnrichment, SailingLinks } from './types';
  import Link from '../link.svelte';
  import PeriodicRefresh from '../periodic-refresh.svelte';
  import * as Accordion from '../ui/accordion';
  import Progress from '../ui/progress/progress.svelte';
  import PreviousSailingRow from './previous-sailing.svelte';
  import RelativeTime from './relative-time.svelte';
  import SailingElapsed from './sailing-elapsed.svelte';
  import SailingFill from './sailing-fill.svelte';

  export let sailing: AnySailing;
  export let duration: number;
  export let timestamp: Date;
  export let from: string;
  export let to: string;
  export let enrichment: SailingEnrichment | undefined = undefined;
  export let links: SailingLinks | undefined = undefined;

  $: previousSailings = sailing.previousSailings ?? [];

  // Reference for ticket-sales-closes (15 min before scheduled depart). Only
  // meaningful for sailings that haven't left yet — once a vessel is
  // departing/active/past, ticket sales for it are irrelevant. Prefer
  // scheduledDepart (history-derived true scheduled time); fall back to
  // sailing.depart, which for future sailings is the scheduled time.
  $: scheduledReference =
    sailing.status === 'future'
      ? sailing.scheduledDepart instanceof Date
        ? sailing.scheduledDepart
        : sailing.depart instanceof Date
          ? sailing.depart
          : undefined
      : undefined;
  $: ticketSalesCloseAt = scheduledReference
    ? new Date(scheduledReference.getTime() - 15 * 60 * 1000)
    : undefined;
  $: checkinOpensAtDate = parseClockTime(enrichment?.checkinOpensAt);
  $: spaceReleasedAtDate = parseClockTime(enrichment?.spaceReleasedAt);
  $: showCheckinBand =
    !!enrichment?.checkinOpensAt ||
    !!enrichment?.spaceReleasedAt ||
    !!ticketSalesCloseAt ||
    typeof enrichment?.availableSpace === 'number';

  function parseClockTime(value?: string): Date | undefined {
    if (!value) return;
    const match = /^(\d+):(\d+)\s+(AM|PM|am|pm)$/.exec(value.trim());
    if (!match) return;
    const hours = (parseInt(match[1]) % 12) + (match[3].toLowerCase() === 'pm' ? 12 : 0);
    const minutes = parseInt(match[2]);
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  $: value = typeof sailing.depart === 'string' ? sailing.depart : sailing.depart.toISOString();
  $: vessel = 'vessel' in sailing ? sailing.vessel : undefined;
  $: showDebug = isDev || location.search.includes('debug');
  $: originalArrive =
    sailing.scheduledDepart instanceof Date && duration > 0
      ? new Date(sailing.scheduledDepart.getTime() + duration * 1000)
      : undefined;
  $: totalDuration =
    sailing.status === 'past' &&
    sailing.scheduledDepart instanceof Date &&
    sailing.arrive instanceof Date
      ? Math.trunc((sailing.arrive.getTime() - sailing.scheduledDepart.getTime()) / 1000)
      : undefined;
  $: totalDelay = totalDuration && duration > 0 ? totalDuration - duration : undefined;

  function calcProgress(depart: Date, arrive: Date | string | undefined, duration: number) {
    const now = Date.now();
    const departTime = depart.getTime();
    if (now < departTime) return 0;

    const durationMs = duration * 1000;

    if (arrive instanceof Date) {
      const arriveTime = arrive.getTime();
      if (now >= arriveTime) {
        // if it's long since arrived we don't need to show full progress
        if (now - arriveTime > durationMs) return 0;
        return 1;
      }

      return (now - departTime) / (arriveTime - departTime);
    } else if (duration > 0) {
      return Math.max(0, Math.min(1, (now - departTime) / durationMs));
    }
  }

  function calcOverUnder({ depart, arrive, status }: Sailing, duration: number) {
    // Skip future sailings: depart/arrive are forecasts (etd/eta or pure
    // schedule), and any delta is either a forecast deviation or a phantom
    // mismatch between route.duration and the per-sailing scheduled duration.
    // Once the sailing is departing/current/past, the delta reflects observed
    // reality and is worth showing.
    if (status === 'future') return;
    if (!(depart instanceof Date) || !(arrive instanceof Date)) return;

    return (arrive.getTime() - depart.getTime()) / 1000 - duration;
  }

  function calcDepartDelay({ depart, scheduledDepart, status }: Sailing) {
    if (!(depart instanceof Date) || !(scheduledDepart instanceof Date)) return;

    const now = Date.now();
    // if the API still says 'future' but the recorded depart is already in
    // the past, the API is lagging — clamp to now so the displayed delay
    // keeps growing tick-by-tick until the API catches up.
    const effective = status === 'future' && depart.getTime() < now ? now : depart.getTime();

    // Math.round (not Math.trunc) so residual subsecond drift between when
    // scheduledDepart was stored and when depart was re-parsed doesn't push a
    // clean -1 minute to 0 (e.g. -59_667 ms truncs to 0 but rounds to -1).
    const minutes = Math.round((effective - scheduledDepart.getTime()) / 60_000);
    if (minutes === 0) return;
    // before the scheduled depart, a positive delta is just a forecast shift,
    // not a real delay — only surface it once the sailing has actually reached
    // its scheduled time. negative deltas (leaving early) always surface.
    if (minutes > 0 && scheduledDepart.getTime() > now) return;

    return minutes * 60;
  }

  function formatSailingTime(time: Date | string) {
    if (time instanceof Date) return formatTime(time);

    return time;
  }

  function handleClick() {
    console.log('expanded sailing', sailing);
  }
</script>

<Accordion.Item
  {value}
  class="gap-4 rounded-lg border border-muted-foreground bg-muted transition-all hover:bg-muted-foreground/15 dark:hover:bg-muted-foreground/30"
>
  <Accordion.Trigger class="px-4 py-2" on:click={handleClick}>
    <div class="flex w-full flex-col gap-1">
      <div class="grid grid-cols-[1fr,auto,1fr] items-center leading-none">
        <div class="justify-self-start whitespace-nowrap text-2xl font-bold leading-none">
          <h3 class:animate-pulse={sailing.status === 'departing'}>
            {formatSailingTime(sailing.depart)}
          </h3>
        </div>
        <div class="text-2xl leading-none">
          <span>→</span>
        </div>
        <div class="justify-self-end whitespace-nowrap text-2xl font-bold leading-none">
          <h3>
            {#if sailing.arrive}
              {formatSailingTime(sailing.arrive)}
            {:else if 'fill' in sailing}
              <SailingFill fill={sailing.fill} />
            {/if}
          </h3>
        </div>
      </div>

      <div class="grid grid-cols-[1fr,auto,1fr] items-center gap-1 text-xs text-muted-foreground">
        <div class="self-start justify-self-start text-left">
          <div class="flex flex-wrap gap-1">
            {#if sailing.status === 'departing'}
              <span
                class="whitespace-nowrap rounded bg-failure/20 px-1.5 font-mono uppercase text-failure"
              >
                departing
              </span>
            {:else}
              <SailingElapsed timestamp={sailing.depart}>
                {@const departDelay = calcDepartDelay(sailing)}
                {#if departDelay}
                  <span
                    class="whitespace-nowrap font-mono"
                    class:text-success={departDelay < 0}
                    class:text-failure={departDelay > 0}
                  >
                    ({`${departDelay > 0 ? '+' : '-'}${formatDuration(Math.abs(departDelay))}`})
                  </span>
                {/if}
              </SailingElapsed>
            {/if}
          </div>
        </div>
        <div class="self-start justify-self-center text-center">
          <span>
            {#if vessel}
              on
              {#if vessel.id}
                <Link href={vesselFinderUrl(vessel.id)} external>{vessel.name}</Link>
              {:else}
                {vessel.name}
              {/if}
            {/if}
          </span>
        </div>
        <div class="self-start justify-self-end text-right">
          <div class="flex flex-wrap justify-end gap-1 text-right">
            <SailingElapsed timestamp={sailing.arrive}>
              {@const overunder = calcOverUnder(sailing, duration)}
              {#if overunder}
                <span
                  class="whitespace-nowrap font-mono"
                  class:text-success={overunder < 0}
                  class:text-failure={overunder > 0}
                >
                  ({`${overunder > 0 ? '+' : '-'}${formatDuration(Math.abs(overunder))}`})
                </span>
              {/if}
            </SailingElapsed>
          </div>
        </div>
      </div>

      {#if sailing.depart instanceof Date && sailing.status === 'current'}
        <PeriodicRefresh>
          {@const progress = calcProgress(sailing.depart, sailing.arrive, duration)}
          {#if progress}
            <div class="grid">
              <Progress class="bg-muted-foreground" max={1} value={progress}>
                <span class="text-xs text-primary-foreground dark:text-primary">
                  {(progress * 100).toFixed(2)}%
                </span>
              </Progress>
            </div>
          {/if}
        </PeriodicRefresh>
      {/if}
    </div>
  </Accordion.Trigger>
  <Accordion.Content>
    <div class="flex flex-col gap-2 transition-all">
      {#if previousSailings.length > 0}
        <div class="flex flex-col gap-1">
          <h4 class="px-1 text-xs uppercase tracking-wide text-muted-foreground">
            Recent {vessel?.name ?? 'vessel'} sailings
          </h4>
          {#each previousSailings as prev (prev.routeCode + prev.depart.toISOString())}
            <PreviousSailingRow sailing={prev} referenceFrom={from} />
          {/each}
        </div>
      {/if}
      {#if !sailing.arrive && 'fill' in sailing && sailing.fill > 0 && (sailing.carFill > 0 || sailing.oversizeFill > 0)}
        <div class="grid grid-cols-2 grid-rows-2 place-items-center">
          <SailingFill fill={sailing.carFill} />
          <SailingFill fill={sailing.oversizeFill} />
          <span class="text-md">Standard</span>
          <span class="text-md">Overflow</span>
        </div>
      {/if}
      {#if showCheckinBand}
        <div
          class="grid grid-cols-2 items-baseline gap-x-3 gap-y-1 bg-background/40 px-3 py-2 text-xs"
        >
          {#if enrichment?.checkinOpensAt}
            <span class="text-muted-foreground">Check-in opens</span>
            <span class="font-mono">
              {enrichment.checkinOpensAt}
              {#if checkinOpensAtDate}
                <RelativeTime time={checkinOpensAtDate} />
              {/if}
            </span>
          {/if}
          {#if enrichment?.spaceReleasedAt}
            <span class="text-muted-foreground">Space released</span>
            <span class="font-mono">
              {enrichment.spaceReleasedAt}
              {#if spaceReleasedAtDate}
                <RelativeTime time={spaceReleasedAtDate} />
              {/if}
            </span>
          {/if}
          {#if ticketSalesCloseAt}
            <span class="text-muted-foreground">Ticket sales close</span>
            <span class="font-mono">
              {formatTime(ticketSalesCloseAt)}
              <RelativeTime time={ticketSalesCloseAt} />
            </span>
          {/if}
          {#if typeof enrichment?.availableSpace === 'number'}
            <span class="text-muted-foreground">Space available</span>
            <span class="font-mono">{Math.round(enrichment.availableSpace * 100)}%</span>
          {/if}
        </div>
      {/if}
      <ul class="list-inside list-disc space-y-1 px-4 text-xs text-muted-foreground">
        {#if sailing.scheduledDepart instanceof Date}
          <li>
            Original departure:
            <span class="font-mono">{formatSailingTime(sailing.scheduledDepart)}</span>
          </li>
        {/if}
        {#if originalArrive}
          <li>
            Original estimated arrival:
            <span class="font-mono">{formatSailingTime(originalArrive)}</span>
          </li>
        {/if}
        {#if totalDuration}
          <li>
            Total time from scheduled departure:
            <span class="font-mono">{formatDuration(totalDuration)}</span>
            {#if totalDelay}
              <span
                class="font-mono"
                class:text-success={totalDelay < 0}
                class:text-failure={totalDelay > 0}
              >
                ({`${totalDelay > 0 ? '+' : '-'}${formatDuration(Math.abs(totalDelay))}`})
              </span>
            {/if}
          </li>
        {/if}
        <li>
          <Link href={links?.conditions ?? currentConditionsUrl(from, to)} external>
            {`Current conditions for ${from} → ${to}`}
          </Link>
        </li>
        {#if links?.booking}
          <li>
            <Link href={links.booking} external>Book this sailing</Link>
          </li>
        {/if}
        {#if links?.schedule}
          <li>
            <Link href={links.schedule} external>Full schedule</Link>
          </li>
        {/if}
      </ul>
      <p class="text-center text-xs italic text-muted-foreground">
        Data was updated at
        <span class="font-mono">{formatTimestamp(timestamp)}</span>
      </p>
      {#if showDebug}
        <div class="dark -mb-4 text-primary">
          <pre
            class="whitespace-pre-wrap rounded-md bg-neutral-800 px-4 py-2 text-left text-neutral-200"><code
              >{JSON.stringify({ sailing, duration }, null, 2)}</code
            ></pre>
        </div>
      {/if}
    </div>
  </Accordion.Content>
</Accordion.Item>
