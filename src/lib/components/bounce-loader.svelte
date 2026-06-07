<script lang="ts">
  // Faithful Svelte port of react-spinners' BounceLoader: two overlapping
  // circles, both scaling 0 → 1 → 0 over 2.1s, with the second offset by
  // half a cycle so one is always emerging while the other is dissolving.
  export let size: number = 60;
  export let color: string = 'currentColor';
</script>

<div class="loader" style:width="{size}px" style:height="{size}px" role="status" aria-label="Loading">
  <div class="ball" style:background-color={color}></div>
  <div class="ball delayed" style:background-color={color}></div>
</div>

<style>
  .loader {
    position: relative;
    display: inline-block;
  }
  .ball {
    position: absolute;
    inset: 0;
    border-radius: 100%;
    opacity: 0.6;
    animation: bounce 2.1s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
  }
  .ball.delayed {
    animation-delay: -1.05s;
  }
  @keyframes bounce {
    0%,
    100% {
      transform: scale(0);
    }
    50% {
      transform: scale(1);
    }
  }
</style>
