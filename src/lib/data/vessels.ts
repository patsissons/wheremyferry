export interface StaticVesselData {
  /**
   * will be defined if we have a frozen record for the vessel
   */
  id: number;
}

export const vessels: Partial<Record<string, StaticVesselData>> = {
  'Queen of Oak Bay': {
    id: 7902283,
  },
  'Queen of Surrey': {
    id: 7902221,
  },
  'Queen of Cowichan': {
    id: 7411143,
  },
  'Queen of Alberni': {
    id: 7414080,
  },
  'Queen of Cumberland': {
    id: 9009360,
  },
  'Queen of Capilano': {
    id: 9008354,
  },
  'Coastal Renaissance': {
    id: 9332755,
  },
  'Coastal Inspiration': {
    id: 9332767,
  },
  'Coastal Celebration': {
    id: 9332779,
  },
  'Spirit of Vancouver Island': {
    id: 9030682,
  },
  'Spirit of British Columbia': {
    id: 9015668,
  },
  'Salish Raven': {
    id: 9750294,
  },
  'Salish Eagle': {
    id: 9750282,
  },
  'Skeena Queen': {
    id: 9137090,
  },
};
