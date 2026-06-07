import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';

// Chrome devtools probes this special URL on every navigation in dev,
// generating a noisy SvelteKitError 404 in the terminal. Short-circuit
// it with a 204 so the dev log stays clean. Production never sees the
// probe; gating on `dev` makes the intent explicit.
const SUPPRESSED_DEV_PATHS = new Set(['/.well-known/appspecific/com.chrome.devtools.json']);

export const handle: Handle = async ({ event, resolve }) => {
  if (dev && SUPPRESSED_DEV_PATHS.has(event.url.pathname)) {
    return new Response(null, { status: 204 });
  }
  return resolve(event);
};
