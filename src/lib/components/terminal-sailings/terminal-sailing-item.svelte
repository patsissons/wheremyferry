<script lang="ts">
  import type { AnySailing, Sailing } from '$lib/client';
  import { isDev } from '$lib/env';
  import { calcSince, formatDuration, formatTime, formatTimestamp } from '$lib/utils';
  import PeriodicRefresh from '../periodic-refresh.svelte';
  import SailingFill from './sailing-fill.svelte';

  export let sailing: AnySailing;
  export let duration: number;
  export let timestamp: Date;

  let expanded = false;

  $: departElapsed = Boolean(sailing.depart && !(sailing.arrive instanceof Date));
  $: vessel = 'vessel' in sailing ? sailing.vessel : undefined;

  function calcElapsed(sailing: Sailing, duration: number) {
    if (sailing.arrive instanceof Date) {
      return {
        ...calcSince(sailing.arrive),
        overunder:
          sailing.depart instanceof Date
            ? (sailing.arrive.getTime() - sailing.depart.getTime()) / 1000 - duration
            : undefined,
      };
    }

    if (sailing.depart instanceof Date) {
      return {
        ...calcSince(sailing.depart),
        overunder: undefined,
      };
    }
  }

  function formatSailingTime(time: Date | string) {
    if (time instanceof Date) return formatTime(time);

    return time;
  }

  function handleClick() {
    console.log('clicked', sailing);
    expanded = !expanded;
  }
</script>

<li>
  <button
    class="flex w-full flex-col gap-1 rounded-lg bg-muted px-4 py-2 transition-all hover:bg-muted-foreground/30"
    type="button"
    on:click={handleClick}
  >
    <div class="flex w-full flex-col gap-4">
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
        <p
          class="text-xs italic leading-none text-muted-foreground"
          class:self-end={!departElapsed}
        >
          {#if vessel}
            <span>on {vessel},</span>
          {/if}
          <PeriodicRefresh interval={60_000}>
            {@const elapsed = calcElapsed(sailing, duration)}
            {#if elapsed}
              {#if elapsed.value < 0}
                in
              {/if}
              <code class="font-medium">{Math.abs(elapsed.value)}</code>
              {#if elapsed.unit}
                {elapsed.unit}
              {/if}
              {#if elapsed.value > 0}
                ago
              {/if}
              {#if elapsed.overunder}
                <span
                  class:text-success={elapsed.overunder < 0}
                  class:text-failure={elapsed.overunder > 0}
                >
                  ({`${elapsed.overunder > 0 ? '+' : '-'}${formatDuration(Math.abs(elapsed.overunder))}`})
                </span>
              {/if}
            {/if}
          </PeriodicRefresh>
        </p>
      </div>
      <div class="flex flex-col gap-2 transition-all" class:hidden={!expanded}>
        {#if !sailing.arrive && 'fill' in sailing}
          <div class="grid grid-cols-2 grid-rows-2">
            <SailingFill fill={sailing.carFill} />
            <SailingFill fill={sailing.oversizeFill} />
            <span class="text-md">Standard</span>
            <span class="text-md">Overflow</span>
          </div>
        {/if}
        <p class="text-xs italic text-muted-foreground">
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
    </div>
  </button>
</li>
