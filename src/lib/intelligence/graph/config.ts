import "server-only";
import { graphFeatureConfigSchema } from "@/schemas/knowledge-graph";

const truthy = (value: string | undefined, fallback: boolean) =>
  value === undefined ? fallback : value === "true";

const integer = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const decimal = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function getKnowledgeGraphConfig() {
  return graphFeatureConfigSchema.parse({
    enabled: truthy(process.env.INTELLIGENCE_GRAPH_ENABLED, true),
    relationshipExtractionEnabled: truthy(
      process.env.INTELLIGENCE_RELATIONSHIP_EXTRACTION_ENABLED,
      true,
    ),
    retrievalEnabled: truthy(process.env.INTELLIGENCE_GRAPH_RETRIEVAL_ENABLED, true),
    dossiersEnabled: truthy(process.env.INTELLIGENCE_DOSSIERS_ENABLED, true),
    maxDepth: integer(process.env.INTELLIGENCE_GRAPH_MAX_DEPTH, 2),
    maxRelationships: integer(process.env.INTELLIGENCE_GRAPH_MAX_RELATIONSHIPS, 40),
    minimumConfidence: decimal(process.env.INTELLIGENCE_GRAPH_MIN_CONFIDENCE, 0.5),
    backfillBatchSize: integer(process.env.INTELLIGENCE_GRAPH_BACKFILL_BATCH_SIZE, 20),
  });
}

export const RELATIONSHIP_EXTRACTION_VERSION = "r4.relationships.v1";
export const RELATIONSHIP_SCHEMA_VERSION = "r4.relationship-schema.v1";
