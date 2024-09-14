export interface StaticRegionData {
  order?: number;
}

export const regions: Partial<Record<string, StaticRegionData>> = {
  Vancouver: { order: 10 },
  Victoria: { order: 9 },
  Nanaimo: { order: 8 },
  'Sunshine Coast': { order: 7 },
  'Bowen Island': { order: 6 },
  'Salt Spring Island': { order: 5 },
  Other: { order: -1 },
};
