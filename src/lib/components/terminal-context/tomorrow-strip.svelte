<script lang="ts">
  import type { CurrentConditionsBeta } from 'scrapemyferry';

  export let tomorrow: CurrentConditionsBeta['tomorrow'];

  $: entries = tomorrow.slice(0, 3);
</script>

{#if entries.length > 0}
  <div class="flex flex-col gap-2">
    <h4 class="text-sm font-semibold">Tomorrow's first sailings</h4>
    <ul class="flex flex-col gap-1 text-sm">
      {#each entries as t}
        <li class="grid grid-cols-[1fr,auto,1fr] items-baseline gap-2">
          <span class="justify-self-start font-mono">{t.scheduled}</span>
          <span class="justify-self-center text-xs text-muted-foreground">
            {t.vessel.name}
          </span>
          <span class="justify-self-end font-mono text-xs">
            {Math.round(t.availableSpace * 100)}% open
          </span>
        </li>
      {/each}
    </ul>
  </div>
{/if}
