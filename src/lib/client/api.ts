import ky from 'ky';
import { isDev } from '$lib/env';

import { transformRoutes } from './transform';
import type { Data, RouteData } from './types';
import capacityJson from './__mock__/capacity.json';
import noncapacityJson from './__mock__/noncapacity.json';

const mocks: Record<EndpointType, ResponseData> = {
  capacity: capacityJson,
  noncapacity: noncapacityJson,
};

type EndpointType = 'capacity' | 'noncapacity';
type EndpointVersion = 'v2';
interface FetchEndpointOptions {
  version?: EndpointVersion;
}

const baseUrl = 'https://www.bcferriesapi.ca';
const defaultVersion: EndpointVersion = 'v2';

export class FetchError extends Error {
  constructor(
    public url: string,
    public status: number,
    message = `Failed to fetch ${url}`,
  ) {
    super(message);
  }
}

interface ResponseData {
  routes: RouteData[];
}

async function fetchEndpoint(
  type: EndpointType,
  { version = defaultVersion }: FetchEndpointOptions = {},
) {
  const path = [version, type].join('/');
  const url = new URL(path + '/', baseUrl);

  try {
    if (isDev) return mocks[type];
    if (isDev) console.log(`Fetching ${url.href}`);

    const res = await ky.get(url);

    if (!res.ok) {
      throw new FetchError(url.href, res.status);
    }

    const data = await res.json<ResponseData>();

    return data;
  } catch (err) {
    if (isDev) console.error(err);
    if (err instanceof FetchError) throw err;

    const message = err instanceof Error ? err.message : 'Unknown error';
    throw new FetchError(url.href, 500, message);
  }
}

export function fetchCapacity() {
  return fetchEndpoint('capacity');
}

export function fetchNonCapacity() {
  return fetchEndpoint('noncapacity');
}

const pollIntervals: Partial<Record<EndpointType, number>> = {
  // 1-minute intervals
  capacity: 1000 * 60,
  // 1-hour intervals
  noncapacity: 1000 * 60 * 60,
};

interface EndpointState {
  timestamp: number;
  hash: string;
  data: ResponseData;
}

export function poll(updated: (data: Data) => void) {
  const capacity = pollEndpoint('capacity');
  const noncapacity = pollEndpoint('noncapacity');

  const refresh = () => {
    if (isDev) console.log('Refreshing endpoints');
    capacity.refresh();
    noncapacity.refresh();
  };
  const dispose = () => {
    if (isDev) console.log('Disposing signals');
    capacity.dispose();
    noncapacity.dispose();
  };

  refresh();

  return dispose;

  function pollEndpoint(type: EndpointType) {
    const interval = pollIntervals[type];
    const state: Partial<EndpointState> = {};
    const refresh = () => {
      fetchEndpoint(type)
        .then((data) => {
          return crypto.subtle
            .digest('SHA-1', new TextEncoder().encode(JSON.stringify(data)))
            .then((buf) => {
              return {
                data,
                hash: Array.from(new Uint8Array(buf))
                  .map((byte) => byte.toString(16).padStart(2, '0'))
                  .join(''),
              };
            });
        })
        .then(({ data, hash }) => {
          if (!state.data) {
            notifyState(hash, data);
            return;
          }

          if (hash === state.hash) return;

          notifyState(hash, data);
        })
        .catch((err) => {
          // log errors but keep the interval moving
          console.error(err);
        });
    };
    const timeout = setInterval(refresh, interval);
    const dispose = () => {
      clearInterval(timeout);
    };

    return { type, interval, state, refresh, dispose };

    function notifyState(hash: string, data: ResponseData) {
      state.timestamp = Date.now();
      state.hash = hash;
      state.data = data;

      notify(state as EndpointState);
    }
  }

  function notify(state: EndpointState) {
    const capacityRoutes = capacity.state.data?.routes ?? [];
    const capacityRouteCodes = new Set(capacityRoutes.map(({ routeCode }) => routeCode));
    const noncapacityRoutes = noncapacity.state.data?.routes ?? [];
    const routes = [
      ...capacityRoutes,
      ...noncapacityRoutes.filter(({ routeCode }) => !capacityRouteCodes.has(routeCode)),
    ];

    if (isDev) console.log('updated', { state, routes });

    updated(transformRoutes(routes, state.timestamp));
  }
}
