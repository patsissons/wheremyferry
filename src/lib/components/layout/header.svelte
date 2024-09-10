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
        class="text-highlight hover:text-highlight"
        variant="ghost"
        href="https://github.com/patsissons/wheremyferry"
        target="_blank"
        rel="noopener noreferrer"
      >
        <LogoGithubIcon />
      </Button>
    </div>
    <div class="container mx-auto place-self-center">
      <h1
        class="to-highlight via-highlight bg-gradient-to-r from-primary from-40% via-70% bg-clip-text text-2xl font-bold text-transparent sm:text-4xl"
      >
        Where my ferry?
      </h1>
    </div>
    <div class="justify-self-end pr-2">
      <Button on:click={toggleMode} variant="outline" size="icon">
        <SunnyIcon
          class="text-warning rotate-0 scale-100 transition-all duration-1000 dark:-rotate-90 dark:scale-0"
        />
        <MoonIcon
          class="absolute rotate-90 scale-0 text-sky-500 transition-all duration-1000 dark:rotate-0 dark:scale-100"
        />
        <span class="sr-only">Toggle theme</span>
      </Button>
    </div>
  </div>
</header>
