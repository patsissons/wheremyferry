<script lang="ts">
  import type { CurrentConditionsBeta } from 'scrapemyferry';

  export let terminal: CurrentConditionsBeta['terminal'];
  export let label: string | undefined = undefined;

  // Google Maps "search" URL just drops a pin and centers the map — no
  // directions panel. Falls back to the terminal name if there's no address.
  $: mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    terminal.address || terminal.name,
  )}`;
</script>

<a
  href={mapUrl}
  target="_blank"
  rel="noopener noreferrer"
  class="flex flex-col gap-1 rounded-md border border-muted-foreground/40 bg-background/40 p-3 transition-colors hover:border-link hover:bg-background/60"
>
  {#if label}
    <span class="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
  {/if}
  <h4 class="text-base font-semibold leading-tight">{terminal.name}</h4>
  {#if terminal.address}
    <p class="text-xs text-muted-foreground">{terminal.address}</p>
  {/if}
</a>
