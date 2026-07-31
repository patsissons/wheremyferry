<script lang="ts">
  import { onDestroy } from 'svelte';
  import { navigating } from '$app/stores';
  import { fade } from 'svelte/transition';
  import BounceLoader from './bounce-loader.svelte';

  // Warm-cache navigations resolve near-instantly; only surface the overlay
  // when the navigation outlives this delay so fast swaps don't flash.
  const showDelayMs = 150;
  // If a render error aborts the navigation, the navigating store never
  // resets and the overlay would sit on screen forever. Past this point the
  // stale page is more useful than a spinner, so bail out.
  const failsafeMs = 15_000;

  let show = false;
  let showTimer: ReturnType<typeof setTimeout> | undefined;
  let failsafeTimer: ReturnType<typeof setTimeout> | undefined;

  $: $navigating ? arm() : reset();

  function arm() {
    reset();
    showTimer = setTimeout(() => (show = true), showDelayMs);
    failsafeTimer = setTimeout(() => {
      console.warn('[navigation-loader] navigation never settled; hiding overlay');
      show = false;
    }, failsafeMs);
  }

  function reset() {
    clearTimeout(showTimer);
    clearTimeout(failsafeTimer);
    show = false;
  }

  onDestroy(reset);
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
