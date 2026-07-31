<script>
  import { ModeWatcher } from 'mode-watcher';
  import '../app.css';
  import { Header, Footer } from '$lib/components/layout';
  import Meta from '$lib/components/layout/meta.svelte';
  import NavigationLoader from '$lib/components/navigation-loader.svelte';
</script>

<ModeWatcher />

<Meta />

<NavigationLoader />

<div class="grid h-dvh min-w-[375px] grid-rows-[auto,1fr,auto]">
  <Header />
  <div class="overflow-y-auto">
    <slot />
  </div>
  <Footer />
</div>
