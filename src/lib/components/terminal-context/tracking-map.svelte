<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  export let url: string;

  const REFRESH_INTERVAL_MS = 60_000;
  const MAX_ATTEMPTS = 4;
  const RETRY_DELAY_MAX_MS = 1000;

  let bust = Date.now();
  let attempt = 0;
  let refreshTimer: ReturnType<typeof setInterval> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  // url is reactive (prop) — reset retry state when it changes so a new map
  // url doesn't inherit the failure count from the previous one.
  $: if (url) refresh();

  function clearRetry() {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = undefined;
    }
  }

  function refresh() {
    clearRetry();
    attempt = 0;
    bust = Date.now();
  }

  function handleError() {
    if (attempt >= MAX_ATTEMPTS - 1) return;
    attempt += 1;
    clearRetry();
    // Random backoff (0-1s) avoids hammering the CDN if many tabs are
    // retrying at once when it has a brief blip.
    const delay = Math.floor(Math.random() * RETRY_DELAY_MAX_MS);
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      bust = Date.now();
    }, delay);
  }

  function handleLoad() {
    // Successful load — reset so the next 60s tick gets a fresh budget of
    // retries if it fails too.
    attempt = 0;
    clearRetry();
  }

  onMount(() => {
    refreshTimer = setInterval(refresh, REFRESH_INTERVAL_MS);
  });

  onDestroy(() => {
    if (refreshTimer) clearInterval(refreshTimer);
    clearRetry();
  });
</script>

<div class="flex flex-col gap-2">
  <h4 class="text-sm font-semibold">Vessel tracking map</h4>
  <img
    src={`${url}?t=${bust}`}
    alt="Vessel tracking map"
    loading="lazy"
    class="w-full rounded-md border border-muted-foreground/40"
    on:error={handleError}
    on:load={handleLoad}
  />
</div>
