import type { PageServerLoad } from './$types';
import { loadStaticContext } from '$lib/server/scrapemyferry';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
  setHeaders({ 'cache-control': 's-maxage=120, stale-while-revalidate=600' });
  return await loadStaticContext(params.slug);
};
