<script lang="ts">
  import { calcSince } from '$lib/utils';
  import PeriodicRefresh from '../periodic-refresh.svelte';

  export let timestamp: string | Date | undefined;
</script>

{#if timestamp instanceof Date}
  <PeriodicRefresh>
    {@const elapsed = calcSince(timestamp)}
    {#if elapsed.value < 0}
      in
    {/if}
    {#if elapsed.value}
      {Math.abs(elapsed.value)}
    {/if}
    {#if elapsed.unit}
      {elapsed.value ? elapsed.unit.slice(0, 1) : elapsed.unit}
    {/if}
    {#if elapsed.value > 0}
      ago
    {/if}
    <slot />
  </PeriodicRefresh>
{/if}
