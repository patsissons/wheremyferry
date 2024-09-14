<script lang="ts">
  import { Accordion as AccordionPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils.js';

  type $$Props = AccordionPrimitive.TriggerProps;

  let className: $$Props['class'] = undefined;
  export let level: AccordionPrimitive.HeaderProps['level'] = 3;
  export { className as class };
</script>

<AccordionPrimitive.Header {level} class="flex w-full">
  <AccordionPrimitive.Trigger
    class={cn('flex flex-1 items-center justify-between font-medium transition-all', className)}
    {...$$restProps}
    on:click
  >
    <slot />
  </AccordionPrimitive.Trigger>
</AccordionPrimitive.Header>
