<script lang="ts">
  import type { AnySailing, Sailing } from '$lib/client';
  import { isDev } from '$lib/env';
  import {
    calcSince,
    formatDuration,
    formatTime,
    formatTimestamp,
    vesselFinderUrl,
  } from '$lib/utils';
  import Link from '../link.svelte';
  import PeriodicRefresh from '../periodic-refresh.svelte';
  import * as Accordion from '../ui/accordion';
  import Progress from '../ui/progress/progress.svelte';
  import SailingFill from './sailing-fill.svelte';

  export let sailing: AnySailing;
  export let duration: number;
  export let timestamp: Date;

  $: value = typeof sailing.depart === 'string' ? sailing.depart : sailing.depart.toISOString();
  $: vessel = 'vessel' in sailing ? sailing.vessel : undefined;

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

  function calcOverUnder({ depart, arrive }: Sailing, duration: number) {
    if (!(depart instanceof Date) || !(arrive instanceof Date)) return;

    return (arrive.getTime() - depart.getTime()) / 1000 - duration;
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
  class="gap-4 rounded-lg border border-muted-foreground bg-muted px-4 py-2 transition-all hover:bg-muted-foreground/15 dark:hover:bg-muted-foreground/30"
>
  <Accordion.Trigger on:click={handleClick}>
    <div class="flex w-full flex-col items-start gap-1">
      <div class="grid w-full grid-cols-[1fr,auto,1fr] items-center gap-4 leading-none">
        <h3 class="justify-self-start text-2xl font-bold leading-none">
          {formatSailingTime(sailing.depart)}
        </h3>
        <span class="text-2xl leading-none">→</span>
        <h3 class="justify-self-end text-2xl font-bold leading-none">
          {#if sailing.arrive}
            {formatSailingTime(sailing.arrive)}
          {:else if 'fill' in sailing}
            <SailingFill fill={sailing.fill} />
          {/if}
        </h3>
      </div>

      <div
        class="grid w-full grid-cols-[1fr,auto,1fr] items-center gap-1 text-xs text-muted-foreground"
      >
        <span class="justify-self-start text-left">
          {#if sailing.depart instanceof Date}
            <PeriodicRefresh>
              {@const elapsed = calcSince(sailing.depart)}
              {#if elapsed.value < 0}
                in
              {/if}
              <code class="font-medium">
                {Math.abs(elapsed.value)}{elapsed.unit ? elapsed.unit.slice(0, 1) : ''}
              </code>
              {#if elapsed.value > 0}
                ago
              {/if}
            </PeriodicRefresh>
          {/if}
        </span>
        <span class="justify-self-center text-center">
          {#if vessel}
            on
            {#if vessel.id}
              <Link href={vesselFinderUrl(vessel.id)} external>{vessel.name}</Link>
            {:else}
              {vessel.name}
            {/if}
          {/if}
        </span>
        <span class="justify-self-end text-right">
          {#if sailing.arrive instanceof Date}
            <PeriodicRefresh>
              {@const elapsed = calcSince(sailing.arrive)}
              {@const overunder = calcOverUnder(sailing, duration)}
              {#if elapsed.value < 0}
                in
              {/if}
              {Math.abs(elapsed.value)}{elapsed.unit ? elapsed.unit.slice(0, 1) : ''}
              {#if elapsed.value > 0}
                ago
              {/if}
              {#if overunder}
                <span
                  class="font-mono"
                  class:text-success={overunder < 0}
                  class:text-failure={overunder > 0}
                >
                  ({`${overunder > 0 ? '+' : '-'}${formatDuration(Math.abs(overunder))}`})
                </span>
              {/if}
            </PeriodicRefresh>
          {/if}
        </span>
      </div>

      {#if sailing.depart instanceof Date}
        <PeriodicRefresh>
          {@const progress = calcProgress(sailing.depart, sailing.arrive, duration)}
          {#if progress}
            <div class="grid w-full">
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
      {#if !sailing.arrive && 'fill' in sailing && sailing.fill > 0 && (sailing.carFill > 0 || sailing.oversizeFill > 0)}
        <div class="grid grid-cols-2 grid-rows-2 place-items-center">
          <SailingFill fill={sailing.carFill} />
          <SailingFill fill={sailing.oversizeFill} />
          <span class="text-md">Standard</span>
          <span class="text-md">Overflow</span>
        </div>
      {/if}
      <p class="text-center text-xs italic text-muted-foreground">
        Data was updated at
        <span class="font-mono">{formatTimestamp(timestamp)}</span>
      </p>
      {#if isDev}
        <div class="dark text-primary">
          <pre
            class="whitespace-pre-wrap rounded-md bg-neutral-800 px-4 py-2 text-left text-neutral-200"><code
              >{JSON.stringify({ sailing, duration }, null, 2)}</code
            ></pre>
        </div>
      {/if}
    </div>
  </Accordion.Content>
</Accordion.Item>
