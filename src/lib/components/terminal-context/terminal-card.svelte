<script lang="ts">
  import type { CurrentConditionsBeta } from 'scrapemyferry';

  export let terminal: CurrentConditionsBeta['terminal'];
  export let label: string | undefined = undefined;
</script>

<div class="flex flex-col gap-1 rounded-md border border-muted-foreground/40 bg-background/40 p-3">
  {#if label}
    <span class="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
  {/if}
  <h4 class="text-base font-semibold leading-tight">{terminal.name}</h4>
  {#if terminal.address}
    <p class="text-xs text-muted-foreground">{terminal.address}</p>
  {/if}
</div>
