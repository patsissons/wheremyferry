<script lang="ts">
  import Link from '$lib/components/link.svelte';
  import type { Route } from '$lib/client';
  import { seasonalSailingsUrl } from '$lib/utils';
  import * as Accordion from '../ui/accordion';
  import TerminalSailingItem from './terminal-sailing-item.svelte';

  export let route: Route;
  export let timestamp: Date;
</script>

{#if route.sailings.length > 0}
  <div class="flex h-full flex-col items-center overflow-y-auto">
    <Accordion.Root class="my-0.5 w-full max-w-md space-y-3">
      {#each route.sailings as sailing (sailing.depart)}
        <TerminalSailingItem {sailing} duration={route.duration} {timestamp} />
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
