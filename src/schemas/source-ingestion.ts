import { z } from "zod";

export const startSourceIngestionSchema = z.object({
  action: z.enum(["ingest", "discover"]).default("ingest"),
  limit: z.number().int().min(1).max(5).default(2),
});

export const reviewSourceItemSchema = z.object({
  itemId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(1_000).nullable().optional(),
  publicationDate: z.iso.date().nullable().optional(),
});

export type SourceIngestionContext = {
  runId: string;
  executionKey: string;
  connectorId: number;
  targetId: number;
  parentSourceId: string;
  sourceKey: string;
  sourceTitle: string;
  sourceClass: string | null;
  sourceCanonicalDomain: string | null;
  sourceUrl: string;
  targetReferenceKey: string;
  targetTitle: string;
  targetUrl: string;
  ingestionUrl: string;
  contentType: string;
  referenceYear: number | null;
  publicationDateRequired: boolean;
  discoveredPublicationDate: string | null;
  primaryEndpointUrl: string;
  reportingArchiveUrl: string | null;
};

export type ParsedSourceDocument = {
  canonicalUrl: string;
  title: string;
  contentType: "application/pdf" | "text/html";
  publicationDate: string | null;
  contentHash: string;
  bytesFetched: number;
  pageCount: number | null;
  pagesScanned: number | null;
  extractionTruncated: boolean;
  usedDiscoveryPage: boolean;
  passages: Array<{
    content: string;
    pageNumber: number | null;
    sectionLabel: string | null;
    contentHash: string;
    tokenCount: number;
    relevanceScore: number;
  }>;
};

export type PersistedSourceDocument = {
  sourceItemId: string;
  passageCount: number;
  alreadyApproved: boolean;
};

export type IngestionReviewItem = {
  id: string;
  title: string;
  canonical_url: string;
  content_type: string;
  publication_date: string | null;
  reference_targets: { reference_key: string; title: string } | null;
};

export type IngestionOperationsStatus = {
  statusCounts: Record<string, number>;
  approvedSourceItems: number;
  storedPassages: number;
  enabledTargets: number;
  discoveryEnabledConnectors: number;
  discoveredTargets: number;
  lastDiscoverySucceededAt: string | null;
  pendingItems: IngestionReviewItem[];
};
