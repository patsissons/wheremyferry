<script>
  import Link from '$lib/link.svelte';
</script>

<main class="grid min-h-screen place-content-center">
  <div class="flex max-w-xl flex-col gap-4 rounded-xl bg-slate-900/10 p-6 shadow-xl">
    <h1 class="text-center text-xl font-bold">Welcome to SvelteKit + Tailwind CSS starter kit</h1>
    <section class="flex flex-col gap-2">
      <p>
        This is a starter template for building a <Link href="https://kit.svelte.dev/" external
          >SvelteKit</Link
        > app with <Link href="https://tailwindcss.com/" external>Tailwind CSS</Link>.
      </p>
      <p>Run the following commands to set it up:</p>
      <code class="overflow-x-auto overflow-y-hidden rounded-md bg-slate-900 p-2 text-slate-200">
        <pre class="whitespace-pre">pnpm create svelte@latest sveltekit-tailwindcss-starter
cd sveltekit-tailwindcss-starter
git init
pnpx svelte-add@latest tailwindcss --tailwindcss-typography
pnpm upgrade --latest</pre>
      </code>
      <p>
        Then edit your <code class="mx-1 rounded-sm bg-slate-900 px-1 py-0.5 text-slate-200"
          >.prettierrc</code
        >
        to your liking and run
        <code class="mx-1 rounded-sm bg-slate-900 px-1 py-0.5 text-slate-200">pnpm format</code>
      </p>
    </section>
  </div>
</main>
