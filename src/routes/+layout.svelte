<script>
  import { ModeWatcher } from 'mode-watcher';
  import '../app.css';
  import { Header, Footer } from '$lib/components/layout';
</script>

<ModeWatcher />

<div class="grid h-dvh min-w-[375px] grid-rows-[auto,1fr,auto]">
  <Header />
  <div class="overflow-y-auto">
    <slot />
  </div>
  <Footer />
</div>
