<script lang="ts">
  import type { CurrentConditionsBeta } from 'scrapemyferry';
  import SpaceAvailable from './space-available.svelte';
  import VesselLink from './vessel-link.svelte';

  export let tomorrow: CurrentConditionsBeta['tomorrow'];

  $: entries = tomorrow.slice(0, 3);
</script>

{#if entries.length > 0}
  <div class="flex flex-col gap-2">
    <h4 class="text-sm font-semibold">Tomorrow's first sailings</h4>
    <ul class="flex flex-col gap-1 text-sm">
      {#each entries as t}
        <li
          class="grid grid-cols-[1fr,auto,1fr] items-baseline gap-2 rounded border border-transparent px-2 py-1 hover:border-muted-foreground/40"
        >
          <span class="justify-self-start font-mono">{t.scheduled}</span>
          <span class="min-w-0 justify-self-center truncate text-xs text-muted-foreground">
            <VesselLink name={t.vessel.name} url={t.vessel.url} />
          </span>
          <span class="justify-self-end font-mono text-xs">
            <SpaceAvailable availableSpace={t.availableSpace} />
          </span>
        </li>
      {/each}
    </ul>
  </div>
{/if}
