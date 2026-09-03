export type SourceDiscoveryContext = {
  runId: string;
  connectorId: number;
  discoveryDate: string;
  discoveryUrl: string;
  includePaths: string[];
  excludeTerms: string[];
  maxItems: number;
  parentSourceId: string;
  sourceKey: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceCanonicalDomain: string | null;
  sourceClass: string | null;
  categorisation: string | null;
  signalType: string | null;
  geography: string | null;
  priority: string | null;
  sourceWeight: number | null;
  accessLicensingNote: string | null;
  storagePolicy: string | null;
  primaryEndpointUrl: string;
  reportingArchiveUrl: string | null;
  candidateSitemapUrl: string | null;
};

export type SourceDiscoveryCandidate = {
  canonicalUrl: string;
  title: string;
  publicationDate: string | null;
  score: number;
};

export type SourceDiscoveryResult = {
  candidateCount: number;
  queuedCount: number;
  duplicateCount: number;
  bytesFetched: number;
};
