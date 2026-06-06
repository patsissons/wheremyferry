<script lang="ts">
  import Link from '$lib/components/link.svelte';
  import type { Route, Sailing } from '$lib/client';
  import { seasonalSailingsUrl } from '$lib/utils';
  import * as Accordion from '../ui/accordion';
  import TerminalSailingItem from './terminal-sailing-item.svelte';

  export let route: Route;
  export let timestamp: Date;

  function sailingKey({ scheduledDepart, depart }: Sailing) {
    const key = scheduledDepart ?? depart;
    return key instanceof Date ? key.toISOString() : key;
  }
</script>

{#if route.sailings.length > 0}
  <div class="flex h-full flex-col items-center overflow-y-auto">
    <Accordion.Root class="my-0.5 w-full space-y-3">
      {#each route.sailings as sailing (sailingKey(sailing))}
        <TerminalSailingItem
          {sailing}
          duration={route.duration}
          {timestamp}
          from={route.from}
          to={route.to}
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
