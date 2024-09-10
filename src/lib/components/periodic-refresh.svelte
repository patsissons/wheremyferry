<script lang="ts">
  import { onMount } from 'svelte';

  export let interval = 1000;

  let now = Date.now();

  onMount(() => {
    const timeout = setInterval(() => {
      now = Date.now();
    }, interval);

    return () => clearInterval(timeout);
  });
</script>

{#key now}
  <slot {now} />
{/key}
