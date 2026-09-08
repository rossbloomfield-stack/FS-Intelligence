import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { EvidenceReference } from "@/lib/intelligence/evidence";
import { getKnowledgeGraphConfig } from "@/lib/intelligence/graph/config";
import type { GraphRelationshipContext } from "@/schemas/knowledge-graph";

type DatabaseClient = Awaited<ReturnType<typeof createClient>>;

type GraphRow = {
  relationship_id: string;
  source_entity_id: string;
  source_entity_name: string;
  source_entity_type: string;
  relationship_type: string;
  target_entity_id: string;
  target_entity_name: string;
  target_entity_type: string;
  relationship_basis: "explicit" | "inferred";
  confidence_score: number;
  status: string;
  valid_from: string | null;
  valid_to: string | null;
  first_observed_at: string;
  last_observed_at: string;
  evidence_count: number;
  independent_source_count: number;
  reasoning_summary: string | null;
  depth: number;
};

export async function retrieveKnowledgeGraph({
  db,
  organisationIds,
  references,
  asOfDate,
}: {
  db: DatabaseClient;
  organisationIds: string[];
  references: EvidenceReference[];
  asOfDate?: string;
}) {
  const startedAt = Date.now();
  const config = getKnowledgeGraphConfig();
  if (!config.enabled || !config.retrievalEnabled || !organisationIds.length) {
    return emptyGraphResult(Date.now() - startedAt);
  }
  const { data: entities, error: entityError } = await db.from("intelligence_entities")
    .select("id,organisation_id").in("organisation_id", organisationIds).eq("active", true);
  if (entityError) throw new Error(`Could not resolve graph entities: ${entityError.message}`);
  const entityIds = (entities ?? []).map((entity) => entity.id);
  if (!entityIds.length) return emptyGraphResult(Date.now() - startedAt);

  const { data, error } = await db.rpc("retrieve_intelligence_graph_neighbourhood", {
    requested_entity_ids: entityIds,
    requested_relationship_types: [],
    as_of_date: asOfDate ?? new Date().toISOString().slice(0, 10),
    maximum_depth: config.maxDepth,
    result_limit: config.maxRelationships,
  });
  if (error) throw new Error(`Knowledge-graph retrieval failed: ${error.message}`);
  const rows = (data ?? []) as GraphRow[];
  if (!rows.length) return { ...emptyGraphResult(Date.now() - startedAt), entityIds };

  const relationshipIds = rows.map((row) => row.relationship_id);
  const { data: lineage, error: lineageError } = await db.from("intelligence_relationship_observations")
    .select("relationship_id,intelligence_observations(source_id)")
    .in("relationship_id", relationshipIds);
  if (lineageError) throw new Error(`Could not load graph provenance: ${lineageError.message}`);
  const referenceBySource = new Map(references.map((reference) => [reference.sourceId, reference.id]));
  const referencesByRelationship = new Map<string, Set<string>>();
  for (const link of lineage ?? []) {
    const observation = Array.isArray(link.intelligence_observations)
      ? link.intelligence_observations[0]
      : link.intelligence_observations;
    const referenceId = observation?.source_id ? referenceBySource.get(observation.source_id) : null;
    if (!referenceId) continue;
    const current = referencesByRelationship.get(link.relationship_id) ?? new Set<string>();
    current.add(referenceId);
    referencesByRelationship.set(link.relationship_id, current);
  }
  const relationships: GraphRelationshipContext[] = rows
    .filter((row) => Number(row.confidence_score) >= config.minimumConfidence)
    .map((row) => ({
      id: row.relationship_id,
      sourceEntityId: row.source_entity_id,
      sourceEntityName: row.source_entity_name,
      sourceEntityType: row.source_entity_type,
      relationshipType: row.relationship_type,
      targetEntityId: row.target_entity_id,
      targetEntityName: row.target_entity_name,
      targetEntityType: row.target_entity_type,
      basis: row.relationship_basis,
      confidence: Number(row.confidence_score),
      status: row.status,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      firstObservedAt: row.first_observed_at,
      lastObservedAt: row.last_observed_at,
      evidenceCount: row.evidence_count,
      independentSourceCount: row.independent_source_count,
      reasoningSummary: row.reasoning_summary,
      depth: row.depth,
      referenceIds: [...(referencesByRelationship.get(row.relationship_id) ?? [])],
    }))
    .filter((relationship) => relationship.referenceIds.length > 0);
  return {
    entityIds,
    relationships,
    relationshipIds: relationships.map((item) => item.id),
    graphPaths: relationships.map((item) => ({
      depth: item.depth,
      source: item.sourceEntityName,
      relationship: item.relationshipType,
      target: item.targetEntityName,
      referenceIds: item.referenceIds,
    })),
    durationMs: Date.now() - startedAt,
  };
}
function emptyGraphResult(durationMs: number) {
  return {
    entityIds: [] as string[],
    relationships: [] as GraphRelationshipContext[],
    relationshipIds: [] as string[],
    graphPaths: [] as Array<Record<string, unknown>>,
    durationMs,
  };
}
