<script>
  import { ModeWatcher } from 'mode-watcher';
  import '../app.css';
  import { Header, Footer } from '$lib/components/layout';
  import Meta from '$lib/components/layout/meta.svelte';
</script>

<ModeWatcher />

<Meta />

<div class="grid h-dvh min-w-[375px] grid-rows-[auto,1fr,auto]">
  <Header />
  <div class="overflow-y-auto">
    <slot />
  </div>
  <Footer />
</div>
