import { z } from "zod";

export const knowledgeEntityTypes = [
  "organisation", "brand", "business_unit", "product", "proposition",
  "executive", "technology", "vendor", "partner", "regulation",
  "regulatory_body", "market", "geography", "strategic_theme",
  "capability", "distribution_channel",
] as const;

export const relationshipTypes = [
  "OWNS", "OWNED_BY", "SUBSIDIARY_OF", "BRAND_OF", "ACQUIRED",
  "MERGED_WITH", "OFFERS", "OFFERED_BY", "PROVIDES", "PROVIDED_BY",
  "WITHDREW", "TARGETS_SEGMENT", "AVAILABLE_IN", "USES_TECHNOLOGY",
  "USED_BY", "SUPPLIED_BY", "SUPPLIES", "IMPLEMENTED_BY",
  "IMPLEMENTS_FOR", "PARTNERED_WITH", "INTEGRATES_WITH", "WORKS_FOR",
  "EMPLOYS", "LEADS", "LED_BY", "APPOINTED_AS", "LEFT",
  "INVESTING_IN", "PRIORITISES", "BUILDING_CAPABILITY", "EXPANDING_IN",
  "REDUCING_IN", "REGULATED_BY", "REGULATES", "AFFECTED_BY",
  "SUBJECT_TO", "HAS_CAPABILITY", "DEVELOPING_CAPABILITY",
  "LAUNCHED_CAPABILITY", "DISTRIBUTES_THROUGH", "PARTNERS_WITH",
  "OPERATES_IN", "ENTERED_MARKET", "EXITED_MARKET",
] as const;

export const knowledgeEntityTypeSchema = z.enum(knowledgeEntityTypes);
export const relationshipTypeSchema = z.enum(relationshipTypes);
export const relationshipBasisSchema = z.enum(["explicit", "inferred"]);
export const relationshipStatusSchema = z.enum([
  "current", "historical", "emerging", "uncertain", "superseded", "rejected",
]);

export const relationshipCandidateSchema = z.object({
  relationshipType: relationshipTypeSchema,
  targetEntityType: knowledgeEntityTypeSchema,
  targetEntityName: z.string().trim().min(2).max(200),
  basis: relationshipBasisSchema,
  validFrom: z.iso.date().nullable(),
  validTo: z.iso.date().nullable(),
  rationale: z.string().trim().min(8).max(600),
});
export type RelationshipCandidate = z.infer<typeof relationshipCandidateSchema>;

export type RelationshipScoreInput = {
  evidenceDirectness: number;
  sourceAuthority: number;
  extractionConfidence: number;
  entityConfidence: number;
  independentSourceCount: number;
  contradictionCount: number;
  basis: "explicit" | "inferred";
};

export type RelationshipScore = {
  confidence: number;
  components: {
    evidenceDirectness: number;
    sourceAuthority: number;
    extractionConfidence: number;
    entityConfidence: number;
    corroboration: number;
    basisStrength: number;
    contradictionPenalty: number;
  };
};

export type GraphRelationshipContext = {
  id: string;
  sourceEntityId: string;
  sourceEntityName: string;
  sourceEntityType: string;
  relationshipType: string;
  targetEntityId: string;
  targetEntityName: string;
  targetEntityType: string;
  basis: "explicit" | "inferred";
  confidence: number;
  status: string;
  validFrom: string | null;
  validTo: string | null;
  firstObservedAt: string;
  lastObservedAt: string;
  evidenceCount: number;
  independentSourceCount: number;
  reasoningSummary: string | null;
  depth: number;
  referenceIds: string[];
};

export type EntityDossier = {
  id: string;
  canonicalName: string;
  entityType: string;
  description: string | null;
  geography: string | null;
  parent: { id: string; name: string } | null;
  confidence: number | null;
  relationships: GraphRelationshipContext[];
  signals: Array<{
    id: string;
    title: string;
    summary: string;
    direction: string | null;
    status: string;
    confidence: number;
    relevance: number;
    eventDate: string | null;
    themes: string[];
  }>;
  recentObservations: Array<{
    id: string;
    text: string;
    type: string;
    theme: string | null;
    eventDate: string | null;
    confidence: number;
    sourceTitle: string;
    sourceUrl: string;
  }>;
  capabilities: Array<{
    name: string;
    status: "emerging" | "established" | "advanced_evidence";
    confidence: number;
    evidenceCount: number;
  }>;
  lastUpdatedAt: string | null;
};

export const graphFeatureConfigSchema = z.object({
  enabled: z.boolean(),
  relationshipExtractionEnabled: z.boolean(),
  retrievalEnabled: z.boolean(),
  dossiersEnabled: z.boolean(),
  maxDepth: z.number().int().min(1).max(2),
  maxRelationships: z.number().int().min(1).max(100),
  minimumConfidence: z.number().min(0).max(1),
  backfillBatchSize: z.number().int().min(1).max(50),
});
