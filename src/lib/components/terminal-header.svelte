<script lang="ts">
  import ChevronDownIcon from '~icons/ion/chevron-down';
  import SwapVerticalIcon from '~icons/ion/swap-vertical';
  import { TerminalSelector } from '$lib/components/terminal-selector';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Drawer from '$lib/components/ui/drawer';
  import type { Data, Route, Terminal } from '$lib/client';
  import { terminals } from '$lib/data/terminals';
  import { formatDuration } from '$lib/utils';

  export let data: Data;
  export let selectedRoute: Route | undefined = undefined;

  type OpenMode = 'from' | 'to' | undefined;

  let selectedFrom: Terminal | undefined;
  let selectedTo: Terminal | undefined;
  let openMode: OpenMode;

  $: canSwap = canSwapTerminals(selectedFrom, selectedTo);
  $: if (selectedFrom && selectedTo) {
    const id = [selectedFrom.id, selectedTo.id].join('');
    selectedRoute = data.routes.get(id);
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
        selectedFrom = terminal;
        break;
      case 'to':
        selectedTo = terminal;
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
          class="text-highlight hover:text-highlight flex items-center gap-1 text-xl sm:text-2xl"
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
          class="text-highlight hover:text-highlight flex items-center gap-1 text-xl sm:text-2xl"
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
      class="text-highlight hover:text-highlight aspect-square rounded-full p-1"
      variant="ghost"
      disabled={!canSwap}
      on:click={swapTerminals}
    >
      <SwapVerticalIcon class="rotate-90" />
    </Button>
  </div>

  {#if selectedFrom || selectedTo}
    {@const fromRegion = selectedFrom && terminals[selectedFrom.id]?.region}
    {@const toRegion = selectedTo && terminals[selectedTo?.id]?.region}
    <div class="text-highlight px-4">
      <span>
        {fromRegion ?? selectedFrom?.title ?? '…'} → {toRegion ?? selectedTo?.title ?? '…'}
      </span>
      {#if selectedRoute}
        <span class="text-highlight/70">({formatDuration(selectedRoute.duration)})</span>
      {/if}
    </div>
  {/if}
</div>
