<script lang="ts">
  import type { Data, Region, Terminal } from '$lib/client';
  import TerminalItem from './terminal-item.svelte';

  export let data: Data;
  export let region: Region;
  export let selectedTerminal: Terminal | undefined;
  export let invalidTerminal: Terminal | undefined;

  $: regionTerminals = Array.from(region.terminals)
    .map((id) => data.terminals.get(id))
    .filter((terminal): terminal is Terminal => Boolean(terminal))
    .sort((a, b) => a.title.localeCompare(b.title));
</script>

<li class="flex flex-col gap-1">
  <h4 class="px-2 text-sm uppercase leading-none text-muted-foreground/60">{region.title}</h4>
  <ul class="divide-y divide-muted-foreground/30 overflow-clip rounded-lg bg-muted hover:shadow-sm">
    {#each regionTerminals as terminal (terminal.id)}
      {@const selected = selectedTerminal?.id === terminal.id}
      {@const disabled = invalidTerminal?.id === terminal.id}
      <TerminalItem {data} {terminal} {selected} {disabled} />
    {/each}
  </ul>
</li>
