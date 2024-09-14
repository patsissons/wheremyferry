export interface StaticTerminalData {
  title: string;
  destinationTitle?: string;
  region?: string;
}

export const terminals: Partial<Record<string, StaticTerminalData>> = {
  BOW: {
    title: 'Snug Cove',
    destinationTitle: 'Bowen Island',
    region: 'Sunshine Coast',
  },
  DUK: {
    title: 'Duke Point',
    destinationTitle: 'Nanaimo (Duke Point)',
    region: 'Nanaimo',
  },
  FUL: {
    title: 'Fulford Harbour',
    destinationTitle: 'Salt Spring (Fulford Harbour)',
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

  // new
  PSB: {
    title: 'Sturdies Bay',
    destinationTitle: 'Galiano (Sturdies Bay)',
    region: 'Southern Gulf Islands',
  },
  PVB: {
    title: 'Village Bay',
    destinationTitle: 'Mayne (Village Bay)',
    region: 'Southern Gulf Islands',
  },
  POB: {
    title: 'Otter Bay',
    destinationTitle: 'Pender (Otter Bay)',
    region: 'Southern Gulf Islands',
  },
  PLH: {
    title: 'Long Harbour',
    destinationTitle: 'Salt Spring (Long Harbour)',
    region: 'Salt Spring Island',
  },
  PST: {
    title: 'Lyall Harbour',
    destinationTitle: 'Saturna (Lyall Harbour)',
    region: 'Southern Gulf Islands',
  },
  NAH: {
    title: 'Nanaimo Harbour',
    region: 'Nanaimo',
  },
  GAB: {
    title: 'Descanso Bay',
    destinationTitle: 'Gabriola (Descanso Bay)',
    region: 'Nanaimo',
  },
  CMX: {
    title: 'Little River',
    destinationTitle: 'Comox (Little River)',
    region: 'Comox',
  },
  PWR: {
    title: 'Westview',
    destinationTitle: 'Powell River (Westview)',
    region: 'Sunshine Coast',
  },
  TEX: {
    title: 'Blubber Bay',
    destinationTitle: 'Texada (Blubber Bay)',
    region: 'Sunshine Coast',
  },
  SLT: {
    title: 'Saltery Bay',
    destinationTitle: 'Powell River (Saltery Bay)',
    region: 'Sunshine Coast',
  },
  ERL: {
    title: 'Earls Cove',
    region: 'Sunshine Coast',
  },
  CHM: {
    title: 'Chemainus',
    region: 'Nanaimo',
  },
  THT: {
    title: 'Preedy Harbour',
    destinationTitle: 'Thetis (Preedy Harbour)',
    region: 'Southern Gulf Islands',
  },
  PEN: {
    title: 'Telegraph Harbour',
    destinationTitle: 'Penelakut (Telegraph Harbour)',
    region: 'Southern Gulf Islands',
  },
  CFT: {
    title: 'Crofton',
    region: 'Nanaimo',
  },
  VES: {
    title: 'Vesuvius Bay',
    destinationTitle: 'Salt Spring (Vesuvius Bay)',
    region: 'Salt Spring Island',
  },
  PPR: {
    title: 'Prince Rupert',
    region: 'Northern Coast',
  },
  PSK: {
    title: 'Skidegate',
    destinationTitle: 'Graham Island (Skidegate)',
    region: 'Northern Coast',
  },
  KLE: {
    title: 'Klemtu',
    region: 'Central Coast',
  },
  PPH: {
    title: 'Bear Cove',
    destinationTitle: 'Port Hardy (Bear Cove)',
    region: 'Central Coast',
  },
  PBB: {
    title: 'McLoughlin Bay',
    destinationTitle: 'Bella Bella (McLoughlin Bay)',
    region: 'Central Coast',
  },
  DNE: {
    title: 'Gravelly Bay',
    destinationTitle: 'Denman (Gravelly Bay)',
    region: 'Northern Gulf Islands',
  },
  HRN: {
    title: 'Shingle Spit',
    destinationTitle: 'Hornby Island (Shingle Spit)',
    region: 'Northern Gulf Islands',
  },
  DNM: {
    title: 'Denman Island West',
    region: 'Northern Gulf Islands',
  },
  BKY: {
    title: 'Buckley Bay',
    region: 'Northern Gulf Islands',
  },
  CAM: {
    title: 'Campbell River',
    region: 'Northern Gulf Islands',
  },
  QDR: {
    title: 'Quathiaski Cove',
    destinationTitle: 'Quadra Island (Quathiaski Cove)',
    region: 'Northern Gulf Islands',
  },
  COR: {
    title: 'Whaletown',
    destinationTitle: 'Cortes Island (Whaletown)',
    region: 'Northern Gulf Islands',
  },
  HRB: {
    title: 'Heriot Bay',
    destinationTitle: 'Quadra Island (Heriot Bay)',
    region: 'Northern Gulf Islands',
  },
  MCN: {
    title: 'Port McNeill',
    region: 'Northern Gulf Islands',
  },
  SOI: {
    title: 'Sointula',
    destinationTitle: 'Malcolm Island (Sointula)',
    region: 'Northern Gulf Islands',
  },
  ALR: {
    title: 'Alert Bay',
    destinationTitle: 'Cormorant Island (Alert Bay)',
    region: 'Northern Gulf Islands',
  },
  BTW: {
    title: 'Brentwood Bay',
    region: 'Victoria',
  },
  MIL: {
    title: 'Mill Bay',
    region: 'Victoria',
  },
  BEC: {
    title: 'Bella Coola',
    region: 'Central Coast',
  },
  POF: {
    title: 'Ocean Falls',
    region: 'Central Coast',
  },
  SHW: {
    title: 'Shearwater',
    region: 'Central Coast',
  },
  ALF: {
    title: 'Alliford Bay',
    destinationTitle: 'Moresby Island (Alliford Bay)',
    region: 'Northern Coast',
  },
};
