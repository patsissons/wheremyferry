<script lang="ts">
  export let href: string;
  export let external = false;

  $: externalProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
</script>

<a
  class="text-blue-500 decoration-dotted transition-colors hover:text-blue-700 hover:underline"
  {href}
  {...externalProps}
>
  <slot />
</a>
