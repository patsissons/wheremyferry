<script lang="ts">
  import CheckCircleFill16Icon from '~icons/octicon/check-circle-fill-16';
  import type { Data, Terminal } from '$lib/client';
  import { getSelectedHandler } from './context';

  export let data: Data;
  export let terminal: Terminal;
  export let selected = false;
  export let disabled = false;

  $: destinations = Array.from(terminal.destinations)
    .map((id) => (id === terminal.id ? undefined : data.terminals.get(id)?.title))
    .filter(Boolean)
    .join(', ');

  const selectedHandler = getSelectedHandler();

  const handleClick = () => {
    selectedHandler(terminal);
  };
</script>

<li
  class="outline-link outline-2 -outline-offset-2 first-of-type:rounded-t-lg last-of-type:rounded-b-lg focus-within:outline"
>
  <button
    class="w-full p-2 text-left outline-none transition-all enabled:hover:bg-muted-foreground/30"
    type="button"
    {disabled}
    on:click={handleClick}
  >
    <div class="flex flex-col gap-1">
      <div class="grid grid-cols-[1fr,auto] items-center gap-2">
        <h3 class="text-lg font-semibold leading-none" class:text-disabled={disabled}>
          {terminal.title}
        </h3>
        {#if selected}
          <CheckCircleFill16Icon class="text-success" />
        {/if}
      </div>
      <span class="text-sm leading-none {disabled ? 'text-disabled' : 'text-highlight'}"
        >to {destinations}</span
      >
    </div>
  </button>
</li>
