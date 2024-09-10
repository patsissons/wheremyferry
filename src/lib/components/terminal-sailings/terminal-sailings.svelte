<script lang="ts">
  import type { AnySailing } from '$lib/client';
  import TerminalSailingItem from './terminal-sailing-item.svelte';

  export let sailings: AnySailing[];
  export let duration: number;
  export let timestamp: Date;
</script>

{#if sailings.length > 0}
  <div class="flex h-full flex-col items-center overflow-y-auto">
    <ul class="my-0.5 w-full max-w-md space-y-3">
      {#each sailings as sailing (sailing.depart)}
        <TerminalSailingItem {sailing} {duration} {timestamp} />
      {/each}
    </ul>
  </div>
{:else}
  <div class="grid h-full place-content-center">
    <p class="text-failure animate-pulse text-xl font-bold">No sailings available.</p>
  </div>
{/if}
