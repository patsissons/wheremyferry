import type { PageServerLoad } from './$types';
import { loadStaticContext } from '$lib/server/scrapemyferry';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
  setHeaders({ 'cache-control': 's-maxage=120, stale-while-revalidate=600' });
  // return the slug alongside the data so the page sees both change in the
  // same update ($page.params lags a flush behind data during navigation)
  return { slug: params.slug, ...(await loadStaticContext(params.slug)) };
};
