import type { CurrentConditionsBeta } from 'scrapemyferry';

export type UpcomingEntry = CurrentConditionsBeta['upcoming'][number];

export type SailingEnrichment = {
  checkinOpensAt?: string;
  spaceReleasedAt?: string;
  availableSpace?: number;
};

export type EnrichmentMap = Map<string, SailingEnrichment>;
