<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';

  export let href: string;
  export let external = false;

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
  }
</script>

<Button
  class="h-auto px-0 leading-none text-link"
  size="sm"
  variant="link"
  {href}
  {...external ? { target: '_blank', rel: 'noopener noreferrer' } : {}}
  on:click={handleClick}
>
  <slot />
</Button>
