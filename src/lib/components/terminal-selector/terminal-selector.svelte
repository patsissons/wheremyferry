<script lang="ts">
  import { groupByRegion, type Data, type Region, type Terminal } from '$lib/client';
  import { setSelectedHandler } from './context';
  import TerminalRegionItem from './terminal-region-item.svelte';
  import type { SelectorMode } from './types';

  export let data: Data;
  export let mode: SelectorMode;
  export let selectedFrom: Terminal | undefined = undefined;
  export let selectedTo: Terminal | undefined = undefined;
  export let onSelected: (terminal: Terminal) => void;

  $: ({ title, description, regions, selectedTerminal, invalidTerminal } = layoutProps(
    data,
    mode,
    selectedFrom,
    selectedTo,
  ));

  function layoutProps(
    data: Data,
    mode: SelectorMode,
    selectedFrom?: Terminal,
    selectedTo?: Terminal,
  ) {
    const regions = sortRegions(data.departureRegions);
    switch (mode) {
      case 'from': {
        const title = 'Departure terminal';
        const description = 'Select a departure terminal:';

        // if both are selected or only from is selected then we can choose from
        // the full list
        if (!selectedTo || selectedFrom) {
          return {
            title,
            description,
            regions,
            selectedTerminal: selectedFrom,
            invalidTerminal: selectedTo,
          };
        }

        return {
          title,
          description,
          regions: sortRegions(
            groupByRegion(
              Array.from(data.terminals.values()).filter(({ id }) =>
                selectedTo.destinations.has(id),
              ),
            ),
          ),
          selectedTerminal: selectedFrom,
          invalidTerminal: selectedTo,
        };
      }
      case 'to': {
        if (!selectedFrom) {
          return {
            title: 'Arrival terminal',
            description: 'Select a arrival terminal:',
            regions: sortRegions(data.arrivalRegions),
            selectedTerminal: selectedTo,
            invalidTerminal: selectedFrom,
          };
        }

        return {
          title: 'Arrival terminal',
          description: 'Select a arrival terminal:',
          regions: Array.from(
            groupByRegion(
              Array.from(data.terminals.values()).filter(({ id }) =>
                selectedFrom.destinations.has(id),
              ),
            ).values(),
          ).sort((a, b) => (b.order ?? 0) - (a.order ?? 0)),
          selectedTerminal: selectedTo,
          invalidTerminal: selectedFrom,
        };
      }
    }
  }

  setSelectedHandler((terminal) => {
    onSelected(terminal);
  });

  function sortRegions(regions: Map<string, Region>) {
    return Array.from(regions.values()).sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
  }
</script>

<div class="grid h-full grid-rows-[auto,1fr] gap-4">
  <div class="flex flex-col gap-2">
    <h1 class="text-2xl font-bold leading-none text-highlight sm:text-4xl">{title}</h1>
    <p class="text-sm leading-none text-muted-foreground">{description}</p>
  </div>
  <div class="h-full overflow-y-auto">
    <ul class="my-3 space-y-6">
      {#each regions as region (region.title)}
        <TerminalRegionItem {data} {region} {selectedTerminal} {invalidTerminal} />
      {/each}
    </ul>
  </div>
</div>
