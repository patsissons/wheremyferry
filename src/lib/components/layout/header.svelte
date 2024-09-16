<script lang="ts">
  import { toggleMode } from 'mode-watcher';
  import MoonIcon from '~icons/ion/moon';
  import SunnyIcon from '~icons/ion/sunny';
  import LogoGithubIcon from '~icons/ion/logo-github';
  import { Button } from '$lib/components/ui/button/index.js';
</script>

<header class="h-14">
  <div class="grid grid-cols-[1fr,auto,1fr] items-center gap-2 py-2">
    <div class="justify-self-start pl-2">
      <Button
        class="aspect-square bg-gradient-to-br from-highlight/10 via-highlight/15 to-highlight/10 p-0 text-highlight transition-all hover:text-highlight"
        variant="outline"
        href="https://github.com/patsissons/wheremyferry"
        target="_blank"
        rel="noopener noreferrer"
      >
        <LogoGithubIcon class="size-6" />
      </Button>
    </div>
    <div class="container mx-auto place-self-center">
      <h1 class="animated-header text-2xl font-bold text-primary sm:text-4xl">Where my ferry?</h1>
    </div>
    <div class="justify-self-end pr-2">
      <Button
        on:click={toggleMode}
        variant="outline"
        size="icon"
        class="bg-gradient-to-br from-sky-500/10 via-sky-500/15 to-sky-500/10 transition-all"
      >
        <SunnyIcon
          class="rotate-0 scale-100 text-warning transition-all duration-1000 dark:-rotate-90 dark:scale-0"
        />
        <MoonIcon
          class="absolute rotate-90 scale-0 text-sky-500 transition-all duration-1000 dark:rotate-0 dark:scale-100"
        />
        <span class="sr-only">Toggle theme</span>
      </Button>
    </div>
  </div>
</header>

<style>
  .animated-header {
    color: transparent;
    background-clip: text;
    background-repeat: repeat-x;
    background-position-y: 20%;
    background-image: url('/img/waves.png');
    animation: animate 1s linear infinite;
  }
  @keyframes animate {
    0% {
      background-position: 0 0;
    }
    60% {
      background-position: 80px -10px;
    }
    100% {
      background-position: 160px 0;
    }
  }
</style>
