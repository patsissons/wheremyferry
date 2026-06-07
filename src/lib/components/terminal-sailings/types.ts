import type { CurrentConditionsBeta } from 'scrapemyferry';

export type UpcomingEntry = CurrentConditionsBeta['upcoming'][number];

export type SailingEnrichment = {
  checkinOpensAt?: string;
  spaceReleasedAt?: string;
  availableSpace?: number;
};

export type SailingLinks = {
  booking?: string;
  schedule?: string;
  conditions?: string;
};

export type EnrichmentMap = Map<string, SailingEnrichment>;
