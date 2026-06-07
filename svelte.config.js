import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    // explicit adapter-vercel + node 22 runtime: scrapemyferry pulls in
    // axios-cookiejar-support@7 which needs node >=22, and the bundled
    // adapter-vercel under adapter-auto@3.x doesn't recognize node 22 yet.
    adapter: adapter({
      runtime: 'nodejs22.x',
    }),
  },
};

export default config;
