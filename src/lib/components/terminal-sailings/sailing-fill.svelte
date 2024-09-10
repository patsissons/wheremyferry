<script lang="ts">
  export let fill: number;
</script>

<span
  class="text-2xl font-bold leading-none"
  class:text-success={fill < 50}
  class:text-warning={fill >= 50 && fill < 75}
  class:text-failure={fill >= 75}>{fill}%</span
>
