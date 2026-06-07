<script lang="ts">
  import { vessels } from '$lib/data/vessels';
  import { vesselFinderUrl } from '$lib/utils';
  import Link from '../link.svelte';

  export let name: string;
  export let url: string | undefined = undefined;

  // Prefer the static IMO -> vesselfinder map for consistency with the main
  // sailing list. Fall back to BC Ferries' ship-info page (provided by
  // scrapemyferry) when we don't have a frozen IMO yet.
  $: imo = vessels[name]?.id;
  $: href = imo ? vesselFinderUrl(imo) : url || undefined;
</script>

{#if href}
  <Link {href} external>{name}</Link>
{:else}
  {name}
{/if}
