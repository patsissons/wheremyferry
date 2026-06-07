<script lang="ts">
  import type { CurrentConditionsBeta, DailySchedule } from 'scrapemyferry';
  import SpaceAvailable from './space-available.svelte';
  import VesselLink from './vessel-link.svelte';

  export let schedule: DailySchedule;
  export let upcoming: CurrentConditionsBeta['upcoming'] | undefined = undefined;
  export let arrivedUnderway: CurrentConditionsBeta['arrivedUnderway'] | undefined = undefined;

  type Enrichment = {
    vessel: { name: string; url: string };
    availableSpace?: number;
  };

  $: enrichment = buildEnrichment(upcoming, arrivedUnderway);

  function buildEnrichment(
    upcoming: CurrentConditionsBeta['upcoming'] | undefined,
    arrivedUnderway: CurrentConditionsBeta['arrivedUnderway'] | undefined,
  ): Map<string, Enrichment> {
    const map = new Map<string, Enrichment>();
    // arrivedUnderway first so upcoming wins if a sailing somehow appears in
    // both (shouldn't normally happen but cheap belt-and-suspenders).
    for (const a of arrivedUnderway ?? []) {
      map.set(a.scheduled, { vessel: a.vessel });
    }
    for (const u of upcoming ?? []) {
      map.set(u.scheduled, { vessel: u.vessel, availableSpace: u.availableSpace });
    }
    return map;
  }
</script>

{#if schedule.sailings.length > 0}
  <div class="flex flex-col gap-2">
    <h4 class="text-sm font-semibold">Today's schedule</h4>
    <ul class="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
      {#each schedule.sailings as sailing}
        {@const info = enrichment.get(sailing.depart)}
        <li
          class="grid grid-cols-[1fr,auto,1fr] items-baseline gap-2 rounded border border-transparent px-2 py-1 hover:border-muted-foreground/40"
        >
          <span class="justify-self-start font-mono">{sailing.depart}</span>
          <span class="min-w-0 justify-self-center truncate text-xs text-muted-foreground">
            {#if info?.vessel}
              <VesselLink name={info.vessel.name} url={info.vessel.url} />
            {/if}
          </span>
          <span class="justify-self-end font-mono text-xs">
            {#if info?.availableSpace !== undefined}
              <SpaceAvailable availableSpace={info.availableSpace} />
            {:else}
              <span class="text-muted-foreground">→ {sailing.arrive}</span>
            {/if}
          </span>
        </li>
      {/each}
    </ul>
  </div>
{/if}
