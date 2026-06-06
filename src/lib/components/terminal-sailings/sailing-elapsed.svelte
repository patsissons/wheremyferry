<script lang="ts">
  import { calcSince } from '$lib/utils';
  import PeriodicRefresh from '../periodic-refresh.svelte';

  export let timestamp: string | Date | undefined;

  function formatElapsed({ value, unit }: ReturnType<typeof calcSince>) {
    const parts: string[] = [];

    if (value < 0) {
      parts.push('in ');
    }

    if (value) {
      parts.push(Math.abs(value).toString());
    }

    if (unit) {
      parts.push(value ? unit.slice(0, 1) : unit);
    }

    if (value > 0) {
      parts.push(' ago');
    }

    return parts.join('');
  }
</script>

{#if timestamp instanceof Date}
  <PeriodicRefresh>
    {@const elapsed = calcSince(timestamp)}
    <span class="whitespace-nowrap">
      {formatElapsed(elapsed)}
    </span>
    <slot />
  </PeriodicRefresh>
{/if}
