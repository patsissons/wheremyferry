<script lang="ts">
  import type { CurrentConditionsBeta } from 'scrapemyferry';
  import PeriodicRefresh from '../periodic-refresh.svelte';

  export let cameras: CurrentConditionsBeta['cameras'];

  $: webcams = cameras.webcams.filter((w) => w.url);
</script>

{#if webcams.length > 0}
  <div class="flex flex-col gap-2">
    <div class="flex items-baseline justify-between">
      <h4 class="text-sm font-semibold">Webcams</h4>
      <span class="text-xs italic text-muted-foreground">
        updated {cameras.lastUpdated}
      </span>
    </div>
    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <PeriodicRefresh interval={30_000}>
        <svelte:fragment let:now>
          {#each webcams as cam}
            <figure class="flex flex-col gap-1">
              <img
                src={`${cam.url}?t=${now}`}
                alt={cam.label}
                loading="lazy"
                class="aspect-video w-full rounded-md border border-muted-foreground/40 object-cover"
              />
              <figcaption class="text-center text-xs text-muted-foreground">
                {cam.label}
              </figcaption>
            </figure>
          {/each}
        </svelte:fragment>
      </PeriodicRefresh>
    </div>
  </div>
{/if}
