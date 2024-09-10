export interface StaticTerminalData {
  title: string;
  destinationTitle: string;
  region: string;
}

export const terminals: Partial<Record<string, StaticTerminalData>> = {
  BOW: {
    title: 'Snug Cove',
    destinationTitle: 'Bowen Island',
    region: 'Bowen Island',
  },
  DUK: {
    title: 'Duke Point',
    destinationTitle: 'Nanaimo (Duke Point)',
    region: 'Nanaimo',
  },
  FUL: {
    title: 'Fulford Harbour',
    destinationTitle: 'Salt Spring',
    region: 'Salt Spring Island',
  },
  HSB: {
    title: 'Horseshoe Bay',
    destinationTitle: 'West Vancouver (Horseshoe Bay)',
    region: 'Vancouver',
  },
  LNG: {
    title: 'Langdale',
    destinationTitle: 'Sunshine Coast',
    region: 'Sunshine Coast',
  },
  NAN: {
    title: 'Departure Bay',
    destinationTitle: 'Nanaimo (Departure Bay)',
    region: 'Nanaimo',
  },
  SGI: {
    title: 'Southern Gulf Islands',
    destinationTitle: 'Southern Gulf Islands',
    region: 'Southern Gulf Islands',
  },
  SWB: {
    title: 'Swartz Bay',
    destinationTitle: 'Victoria',
    region: 'Victoria',
  },
  TSA: {
    title: 'Tsawwassen',
    destinationTitle: 'Vancouver (Tsawwassen)',
    region: 'Vancouver',
  },
};
