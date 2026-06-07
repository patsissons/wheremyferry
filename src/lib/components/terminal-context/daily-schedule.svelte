<script lang="ts">
  import type { DailySchedule } from 'scrapemyferry';

  export let schedule: DailySchedule;

  $: sailings = schedule.sailings;
</script>

{#if sailings.length > 0}
  <div class="flex flex-col gap-2">
    <h4 class="text-sm font-semibold">Today's schedule</h4>
    <ul class="grid grid-cols-1 gap-1 font-mono text-sm sm:grid-cols-2">
      {#each sailings as sailing}
        <li
          class="flex items-baseline justify-between gap-2 rounded border border-transparent px-2 py-1 hover:border-muted-foreground/40"
        >
          <span>{sailing.depart}</span>
          <span class="text-muted-foreground">→</span>
          <span>{sailing.arrive}</span>
          {#if sailing.type && sailing.type !== 'Non-stop'}
            <span class="text-xs text-muted-foreground">{sailing.type}</span>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}
