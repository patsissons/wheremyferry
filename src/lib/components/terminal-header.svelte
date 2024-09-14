<script lang="ts">
  import ChevronDownIcon from '~icons/ion/chevron-down';
  import SwapVerticalIcon from '~icons/ion/swap-vertical';
  import { goto } from '$app/navigation';
  import { TerminalSelector } from '$lib/components/terminal-selector';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Drawer from '$lib/components/ui/drawer';
  import type { Data, Route, Terminal } from '$lib/client';
  import { terminals } from '$lib/data/terminals';
  import { formatDuration, seasonalSailingsUrl } from '$lib/utils';
  import Link from './link.svelte';

  export let data: Data;
  export let selectedRoute: Route | undefined = undefined;

  type OpenMode = 'from' | 'to' | undefined;

  let selectedFrom: Terminal | undefined;
  let selectedTo: Terminal | undefined;
  let openMode: OpenMode;

  $: canSwap = canSwapTerminals(selectedFrom, selectedTo);
  $: updateUrl(selectedFrom, selectedTo);
  $: if (selectedRoute) {
    selectedFrom = data.terminals.get(selectedRoute.from);
    selectedTo = data.terminals.get(selectedRoute.to);
  }

  function updateUrl(selectedFrom?: Terminal, selectedTo?: Terminal) {
    if (selectedFrom && selectedTo) {
      goto(`/${selectedFrom.id}${selectedTo.id}`);
    } else {
      goto('/');
    }
  }

  function terminalRegions(selectedFrom?: Terminal, selectedTo?: Terminal) {
    const from = terminalRegion(selectedFrom);
    const to = terminalRegion(selectedTo);

    let fromText = from.region;
    let toText = to.region;

    if (from.region && to.region && from.region === to.region) {
      fromText = from.id ?? from.region;
      toText = to.id ?? to.region;
    }

    return `${fromText ?? '…'} → ${toText ?? '…'}`;

    function terminalRegion(terminal?: Terminal) {
      if (!terminal) return {};

      const staticTerminal = terminals[terminal.id];
      if (staticTerminal?.region) return { region: staticTerminal.region, id: terminal.id };

      return { region: terminal.title };
    }
  }

  function canSwapTerminals(selectedFrom?: Terminal, selectedTo?: Terminal) {
    if (selectedFrom && !selectedTo) return data.arrivals.has(selectedFrom.id);
    if (selectedTo) return data.departures.has(selectedTo.id);

    return false;
  }

  function swapTerminals() {
    const terminal = selectedFrom;
    selectedFrom = selectedTo;
    selectedTo = terminal;
  }

  function openFrom() {
    openMode = 'from';
  }

  function openTo() {
    openMode = 'to';
  }

  function closeDrawer(terminal: Terminal) {
    switch (openMode) {
      case 'from':
        {
          selectedFrom = terminal;
          if (selectedTo && !terminal.destinations.has(selectedTo.id)) {
            selectedTo = undefined;
          }
        }
        break;
      case 'to':
        {
          selectedTo = terminal;
          if (selectedFrom && !terminal.destinations.has(selectedFrom.id)) {
            selectedFrom = undefined;
          }
        }
        break;
    }
    openMode = undefined;
  }
</script>

<div class="my-1 flex flex-col items-center gap-2">
  <div class="flex flex-wrap items-center justify-center gap-2">
    <Drawer.Root open={openMode === 'from'}>
      <Drawer.Trigger asChild let:builder>
        <Button
          class="flex items-center gap-1 text-xl text-highlight hover:text-highlight sm:text-2xl"
          builders={[builder]}
          variant="ghost"
          on:click={openFrom}
        >
          <h2 class="font-bold leading-none">{selectedFrom?.title ?? 'Select departure'}</h2>
          <ChevronDownIcon />
        </Button>
      </Drawer.Trigger>
      <Drawer.Content>
        <div class="container mx-auto h-[calc(100dvh-theme(spacing.14)-theme(spacing.6))]">
          {#if openMode}
            <TerminalSelector
              {data}
              {selectedFrom}
              {selectedTo}
              mode={openMode}
              onSelected={closeDrawer}
            />
          {/if}
        </div>
      </Drawer.Content>
    </Drawer.Root>

    <span class="rounded-md bg-muted px-1.5 py-1 text-xs uppercase text-muted-foreground">
      to
    </span>

    <Drawer.Root open={openMode === 'to'}>
      <Drawer.Trigger asChild let:builder>
        <Button
          class="flex items-center gap-1 text-xl text-highlight hover:text-highlight sm:text-2xl"
          builders={[builder]}
          variant="ghost"
          on:click={openTo}
        >
          <h2 class="font-bold leading-none">{selectedTo?.title ?? 'Select destination'}</h2>
          <ChevronDownIcon />
        </Button>
      </Drawer.Trigger>
      <Drawer.Content>
        <div class="container mx-auto h-[calc(100dvh-theme(spacing.14)-theme(spacing.6))]">
          {#if openMode}
            <TerminalSelector
              {data}
              {selectedFrom}
              {selectedTo}
              mode={openMode}
              onSelected={closeDrawer}
            />
          {/if}
        </div>
      </Drawer.Content>
    </Drawer.Root>

    <Button
      class="aspect-square rounded-full p-1 text-highlight hover:text-highlight"
      variant="ghost"
      disabled={!canSwap}
      on:click={swapTerminals}
    >
      <SwapVerticalIcon class="rotate-90" />
    </Button>
  </div>

  {#if selectedFrom || selectedTo}
    {@const crossing = terminalRegions(selectedFrom, selectedTo)}
    <div class="px-4 text-highlight">
      {#if selectedFrom && selectedTo}
        <Link href={seasonalSailingsUrl(selectedFrom.id, selectedTo.id)}>
          {crossing}
        </Link>
      {:else}
        <span>
          {crossing}
        </span>
      {/if}
      {#if selectedRoute?.duration}
        <span class="text-highlight/70">— {formatDuration(selectedRoute.duration)}</span>
      {/if}
    </div>
  {/if}
</div>
