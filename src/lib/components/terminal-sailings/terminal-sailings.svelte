<script lang="ts">
  import Link from '$lib/components/link.svelte';
  import type { Route, Sailing } from '$lib/client';
  import { formatTime, seasonalSailingsUrl } from '$lib/utils';
  import * as Accordion from '../ui/accordion';
  import TerminalSailingItem from './terminal-sailing-item.svelte';
  import type { EnrichmentMap } from './types';

  export let route: Route;
  export let timestamp: Date;
  export let enrichment: EnrichmentMap | undefined = undefined;

  $: keyedSailings = buildKeyedSailings(route.sailings);

  function sailingKey({ scheduledDepart, depart, vessel }: Sailing) {
    const time = scheduledDepart ?? depart;
    const iso = time instanceof Date ? time.toISOString() : time;
    return `${iso}|${vessel?.name ?? ''}`;
  }

  // Keys must be unique or the keyed each throws mid-navigation (which also
  // wedges the route change). Upstream matching bugs have produced two
  // sailings sharing a scheduledDepart, so uniquify any residual collision
  // rather than crash — colliding rows are pathological data, not real
  // distinct sailings we need stable identity for.
  function buildKeyedSailings(sailings: Sailing[]) {
    const seen = new Map<string, number>();
    return sailings.map((sailing) => {
      const base = sailingKey(sailing);
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      return { key: count === 0 ? base : `${base}#${count}`, sailing };
    });
  }

  function enrichmentFor(sailing: Sailing) {
    if (!enrichment) return;
    const target = sailing.scheduledDepart ?? sailing.depart;
    if (!(target instanceof Date)) return;
    return enrichment.get(formatTime(target));
  }
</script>

{#if route.sailings.length > 0}
  <div class="flex h-full flex-col items-center overflow-y-auto">
    <Accordion.Root class="my-0.5 w-full space-y-3">
      {#each keyedSailings as { key, sailing } (key)}
        <TerminalSailingItem
          {sailing}
          duration={route.duration}
          {timestamp}
          from={route.from}
          enrichment={enrichmentFor(sailing)}
        />
      {/each}
    </Accordion.Root>
  </div>
{:else}
  <div class="grid h-full place-content-center text-center">
    <p class="animate-pulse text-xl font-bold text-failure">
      No regular scheduled sailings detected
    </p>
    <Link href={seasonalSailingsUrl(route.from, route.to)} external>
      Check BC ferries for seasonal sailings
    </Link>
  </div>
{/if}
