<script lang="ts">
  import type { PreviousSailing } from '$lib/client';
  import { calcSailingProgress, formatDuration, formatTime, vesselFinderUrl } from '$lib/utils';
  import Link from '../link.svelte';
  import PeriodicRefresh from '../periodic-refresh.svelte';
  import Progress from '../ui/progress/progress.svelte';
  import SailingElapsed from './sailing-elapsed.svelte';

  export let sailing: PreviousSailing;
  /** the parent sailing's origin terminal code — controls arrow direction */
  export let referenceFrom: string;

  // arrow points toward our departure terminal when the vessel was inbound,
  // otherwise it points the same way as the parent sailing.
  $: inbound = sailing.to === referenceFrom;
  $: vessel = sailing.vessel;
  $: totalDelay = computeTotalDelay(sailing);

  // departure delay: same math as the live sailing trigger. Reads Date.now()
  // each call so when invoked inside SailingElapsed's PeriodicRefresh slot it
  // grows tick-by-tick whenever the API is lagging behind reality (sailing
  // still status='future' but its scheduled time is already past).
  function computeDepartDelay({ depart, scheduledDepart, status }: PreviousSailing) {
    if (!(scheduledDepart instanceof Date)) return;
    const now = Date.now();
    const effective = status === 'future' && depart.getTime() < now ? now : depart.getTime();
    const minutes = Math.round((effective - scheduledDepart.getTime()) / 60_000);
    if (minutes === 0) return;
    // hide a positive delta before the scheduled time (it's just forecast
    // shift, not real delay); negative deltas (left early) always surface.
    if (minutes > 0 && scheduledDepart.getTime() > now) return;
    return minutes * 60;
  }

  // arrival delta uses total-time-from-scheduled-departure (per spec): how far
  // off the original schedule the trip ended up being. More predictive of
  // downstream cascade than (arrive − actual depart), which only measures the
  // crossing itself.
  function computeTotalDelay({ arrive, scheduledDepart, duration }: PreviousSailing) {
    if (!(arrive instanceof Date)) return;
    if (!(scheduledDepart instanceof Date)) return;
    if (duration <= 0) return;
    const span = Math.round((arrive.getTime() - scheduledDepart.getTime()) / 1000);
    const delta = span - duration;
    if (delta === 0) return;
    return delta;
  }

  function fmt(time: Date | undefined) {
    return time instanceof Date ? formatTime(time) : '';
  }
</script>

<div
  class="flex w-full flex-col gap-1 px-4 py-2 {sailing.status === 'current'
    ? 'bg-highlight/15 dark:bg-highlight/20'
    : 'bg-background/40'}"
>
  <div class="grid grid-cols-[1fr,auto,1fr] items-center leading-none">
    <div class="justify-self-start whitespace-nowrap text-2xl font-bold leading-none">
      <h3>{fmt(sailing.depart)}</h3>
    </div>
    <div class="text-2xl leading-none">
      <span>{inbound ? '←' : '→'}</span>
    </div>
    <div class="justify-self-end whitespace-nowrap text-2xl font-bold leading-none">
      <h3>{fmt(sailing.arrive)}</h3>
    </div>
  </div>

  <div class="grid grid-cols-[1fr,auto,1fr] items-center gap-1 text-xs text-muted-foreground">
    <div class="self-start justify-self-start text-left">
      <div class="flex flex-wrap gap-1">
        <SailingElapsed timestamp={sailing.depart}>
          {@const departDelay = computeDepartDelay(sailing)}
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
          {#if totalDelay}
            <span
              class="whitespace-nowrap font-mono"
              class:text-success={totalDelay < 0}
              class:text-failure={totalDelay > 0}
            >
              ({`${totalDelay > 0 ? '+' : '-'}${formatDuration(Math.abs(totalDelay))}`})
            </span>
          {/if}
        </SailingElapsed>
      </div>
    </div>
  </div>

  {#if sailing.status === 'current'}
    <PeriodicRefresh>
      {@const progress = calcSailingProgress(sailing.depart, sailing.arrive, sailing.duration)}
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
