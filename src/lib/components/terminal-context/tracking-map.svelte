<script lang="ts">
  import PeriodicRefresh from '../periodic-refresh.svelte';

  export let url: string;
</script>

<div class="flex flex-col gap-2">
  <h4 class="text-sm font-semibold">Vessel tracking map</h4>
  <PeriodicRefresh interval={60_000}>
    <svelte:fragment let:now>
      <img
        src={`${url}?t=${now}`}
        alt="Vessel tracking map"
        loading="lazy"
        class="w-full rounded-md border border-muted-foreground/40"
      />
    </svelte:fragment>
  </PeriodicRefresh>
</div>
