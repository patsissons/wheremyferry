<script lang="ts">
  import { onMount } from 'svelte';
  import { poll, type Route, type Data } from '$lib/client';
  import TerminalHeader from '$lib/components/terminal-header.svelte';
  import TerminalSailings from '$lib/components/terminal-sailings/terminal-sailings.svelte';
  import PeriodicRefresh from '$lib/components/periodic-refresh.svelte';
  import { formatElapsed, formatTimestamp } from '$lib/utils';
  import { isDev } from '$lib/env';

  let data: Data | undefined;
  let selectedRoute: Route;

  onMount(() => {
    return poll(updated);
  });

  function updated(update: Data) {
    data = update;
    if (isDev) console.log('Data updated:', data);
  }
</script>

<main class="container mx-auto grid h-full grid-rows-[auto,1fr,auto] gap-4">
  {#if data}
    <TerminalHeader {data} bind:selectedRoute />
    {#if selectedRoute}
      <TerminalSailings
        sailings={selectedRoute.sailings}
        duration={selectedRoute.duration}
        timestamp={data.timestamp}
      />
      {#if data.timestamp}
        <div class="grid place-content-center">
          <p
            class="rounded-md bg-muted px-2 py-1 text-xs italic leading-none text-muted-foreground"
          >
            <PeriodicRefresh>
              <svelte:fragment let:now>
                {@const elapsed = formatElapsed((now - data.timestamp.getTime()) / 1000)}
                Last updated <code class="font-medium">{elapsed.value}</code>
                {#if elapsed.unit}
                  {elapsed.unit} ago
                {/if}
                ({formatTimestamp(data.timestamp)})
              </svelte:fragment>
            </PeriodicRefresh>
          </p>
        </div>
      {/if}
    {/if}
  {/if}
</main>
