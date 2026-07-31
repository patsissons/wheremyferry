<script lang="ts">
  import { onDestroy } from 'svelte';
  import { navigating } from '$app/stores';
  import { fade } from 'svelte/transition';
  import BounceLoader from './bounce-loader.svelte';

  // Warm-cache navigations resolve near-instantly; only surface the overlay
  // when the navigation outlives this delay so fast swaps don't flash.
  const showDelayMs = 150;

  let show = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  $: if ($navigating) {
    timer ??= setTimeout(() => (show = true), showDelayMs);
  } else {
    clearTimeout(timer);
    timer = undefined;
    show = false;
  }

  onDestroy(() => clearTimeout(timer));
</script>

{#if show}
  <div
    transition:fade={{ duration: 150 }}
    class="fixed inset-0 z-50 grid place-content-center bg-background/50 text-primary backdrop-blur-sm"
    aria-busy="true"
  >
    <BounceLoader />
  </div>
{/if}
