<script lang="ts">
  import { calcElapsed } from '$lib/utils';
  import PeriodicRefresh from '../periodic-refresh.svelte';

  export let time: Date;

  function formatRelative(value: number, unit: string): string {
    if (value === 0) return unit === 'just now' ? 'now' : unit;
    const abs = Math.abs(value);
    const u = unit ? unit.slice(0, 1) : '';
    return value < 0 ? `in ${abs}${u}` : `${abs}${u} ago`;
  }
</script>

<PeriodicRefresh>
  <svelte:fragment let:now>
    {@const elapsed = (now - time.getTime()) / 1000}
    {@const { value, unit } = calcElapsed(elapsed)}
    <span class="text-muted-foreground">({formatRelative(value, unit)})</span>
  </svelte:fragment>
</PeriodicRefresh>
