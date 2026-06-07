<script lang="ts">
  // availableSpace is the inverse of fill (0 = totally full, 1 = empty), so
  // the thresholds mirror SailingFill: red when nearly full, orange when
  // filling up, green when plenty of space.
  export let availableSpace: number | null | undefined;

  $: percent =
    typeof availableSpace === 'number' && Number.isFinite(availableSpace)
      ? Math.round(availableSpace * 100)
      : undefined;
</script>

{#if percent === undefined}
  <span class="text-muted-foreground">&ndash;</span>
{:else}
  <span
    class:text-failure={percent <= 25}
    class:text-warning={percent > 25 && percent <= 50}
    class:text-success={percent > 50}
  >
    {percent}% open
  </span>
{/if}
