<script lang="ts">
  import type { CurrentConditionsBeta } from 'scrapemyferry';
  import Link from '../link.svelte';

  export let links: CurrentConditionsBeta['links'];
  export let conditionsUrl: string | undefined = undefined;

  $: entries = [
    { href: links.booking, label: 'Book' },
    { href: links.schedule, label: 'Full schedule' },
    { href: links.calculateFare, label: 'Fare calculator' },
    { href: links.departuresArrivals, label: 'Departures' },
    { href: conditionsUrl, label: 'Current conditions' },
  ].filter((e) => !!e.href);
</script>

{#if entries.length > 0}
  <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
    {#each entries as entry}
      <Link href={entry.href} external>{entry.label}</Link>
    {/each}
  </div>
{/if}
