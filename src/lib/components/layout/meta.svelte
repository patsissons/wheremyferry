<script lang="ts">
  import { isDev } from '$lib/env';

  const host = isDev ? 'http://localhost:3000' : 'https://wheremyferry.com';
</script>

<svelte:head>
  <!-- Facebook Meta Tags -->
  <meta property="og:url" content={host} />
  <meta property="og:image" content="{host}/og/cover.png" />

  <!-- Twitter Meta Tags -->
  <meta property="twitter:url" content={host} />
  <meta name="twitter:image" content="{host}/og/cover.png" />
</svelte:head>
