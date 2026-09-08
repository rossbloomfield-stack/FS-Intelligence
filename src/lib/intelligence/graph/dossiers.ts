import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getKnowledgeGraphConfig } from "@/lib/intelligence/graph/config";
import type { EntityDossier, GraphRelationshipContext } from "@/schemas/knowledge-graph";

type GraphRow = {
  relationship_id: string; source_entity_id: string; source_entity_name: string;
  source_entity_type: string; relationship_type: string; target_entity_id: string;
  target_entity_name: string; target_entity_type: string; relationship_basis: "explicit" | "inferred";
  confidence_score: number; status: string; valid_from: string | null; valid_to: string | null;
  first_observed_at: string; last_observed_at: string; evidence_count: number;
  independent_source_count: number; reasoning_summary: string | null; depth: number;
};

export async function getOrganisationDossier(slug: string): Promise<EntityDossier | null> {
  const config = getKnowledgeGraphConfig();
  if (!config.enabled || !config.dossiersEnabled) return null;
  const db = await createClient();
  const { data: organisation, error: organisationError } = await db.from("organisations")
    .select("id,name,legal_name,sector,jurisdiction,current_owner_id,metadata")
    .eq("slug", slug).eq("active", true).maybeSingle();
  if (organisationError) throw new Error(`Could not load organisation: ${organisationError.message}`);
  if (!organisation) return null;
  const { data: entity, error: entityError } = await db.from("intelligence_entities")
    .select("id,canonical_name,entity_type,description,primary_geography,geography,parent_entity_id,confidence_score,last_observed_at")
    .eq("organisation_id", organisation.id).eq("active", true).maybeSingle();
  if (entityError) throw new Error(`Could not load intelligence entity: ${entityError.message}`);
  if (!entity) return null;

  const [parentResult, signalResult, observationResult, graphResult] = await Promise.all([
    entity.parent_entity_id
      ? db.from("intelligence_entities").select("id,canonical_name").eq("id", entity.parent_entity_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    db.from("intelligence_signals")
      .select("id,title,summary,direction,status,confidence_score,strategic_relevance,event_date,themes,last_observed_at")
      .contains("entity_ids", [entity.id]).eq("approved", true)
      .in("status", ["emerging", "active", "confirmed", "mature", "contradicted"])
      .order("signal_score", { ascending: false }).limit(20),
    db.from("intelligence_observations")
      .select("id,observation_text,observation_type,theme,event_date,published_at,extraction_confidence,source_id")
      .eq("entity_id", entity.id).eq("review_status", "accepted")
      .order("event_date", { ascending: false, nullsFirst: false }).limit(30),
    db.rpc("retrieve_intelligence_graph_neighbourhood", {
      requested_entity_ids: [entity.id], requested_relationship_types: [],
      as_of_date: new Date().toISOString().slice(0, 10), maximum_depth: 1, result_limit: 50,
    }),
  ]);
  for (const result of [parentResult, signalResult, observationResult, graphResult]) {
    if (result.error) throw new Error(`Could not build organisation dossier: ${result.error.message}`);
  }
  const observationRows = observationResult.data ?? [];
  const sourceIds = [...new Set(observationRows.map((item) => item.source_id))];
  const { data: sources, error: sourceError } = sourceIds.length
    ? await db.from("sources").select("id,title,publisher,url,primary_source,evidence_classification").in("id", sourceIds)
    : { data: [], error: null };
  if (sourceError) throw new Error(`Could not load dossier evidence: ${sourceError.message}`);
  const sourceById = new Map((sources ?? []).map((source) => [source.id, source]));
  const relationships: GraphRelationshipContext[] = ((graphResult.data ?? []) as GraphRow[]).map((row) => ({
    id: row.relationship_id, sourceEntityId: row.source_entity_id, sourceEntityName: row.source_entity_name,
    sourceEntityType: row.source_entity_type, relationshipType: row.relationship_type,
    targetEntityId: row.target_entity_id, targetEntityName: row.target_entity_name,
    targetEntityType: row.target_entity_type, basis: row.relationship_basis,
    confidence: Number(row.confidence_score), status: row.status, validFrom: row.valid_from,
    validTo: row.valid_to, firstObservedAt: row.first_observed_at, lastObservedAt: row.last_observed_at,
    evidenceCount: row.evidence_count, independentSourceCount: row.independent_source_count,
    reasoningSummary: row.reasoning_summary, depth: row.depth, referenceIds: [],
  }));
  const capabilityRelationships = relationships.filter((relationship) =>
    relationship.targetEntityType === "capability" || relationship.targetEntityType === "strategic_theme",
  );
  const capabilities = [...new Set(capabilityRelationships.map((relationship) => relationship.targetEntityName))]
    .map((name) => {
      const related = capabilityRelationships.filter((item) => item.targetEntityName === name);
      const confidence = Math.max(...related.map((item) => item.confidence));
      const evidenceCount = related.reduce((sum, item) => sum + item.evidenceCount, 0);
      return {
        name,
        status: confidence >= 0.82 && evidenceCount >= 3 ? "advanced_evidence" as const : confidence >= 0.7 ? "established" as const : "emerging" as const,
        confidence, evidenceCount,
      };
    }).sort((a, b) => b.confidence - a.confidence);

  return {
    id: entity.id, canonicalName: entity.canonical_name, entityType: entity.entity_type,
    description: entity.description ?? organisation.legal_name ?? `${organisation.sector} organisation operating in ${organisation.jurisdiction ?? "the market"}.`,
    geography: entity.primary_geography ?? entity.geography ?? organisation.jurisdiction,
    parent: parentResult.data ? { id: parentResult.data.id, name: parentResult.data.canonical_name } : null,
    confidence: entity.confidence_score == null ? null : Number(entity.confidence_score), relationships,
    signals: (signalResult.data ?? []).map((signal) => ({
      id: signal.id, title: signal.title, summary: signal.summary, direction: signal.direction,
      status: signal.status, confidence: Number(signal.confidence_score ?? 0),
      relevance: Number(signal.strategic_relevance ?? 0), eventDate: signal.event_date, themes: signal.themes ?? [],
    })),
    recentObservations: observationRows.flatMap((observation) => {
      const source = sourceById.get(observation.source_id);
      return source?.url ? [{
        id: observation.id, text: observation.observation_text, type: observation.observation_type,
        theme: observation.theme, eventDate: observation.event_date ?? observation.published_at,
        confidence: Number(observation.extraction_confidence), sourceTitle: source.title ?? source.publisher ?? "Source", sourceUrl: source.url,
      }] : [];
    }),
    capabilities,
    lastUpdatedAt: [entity.last_observed_at, ...(signalResult.data ?? []).map((signal) => signal.last_observed_at), ...relationships.map((relationship) => relationship.lastObservedAt)]
      .filter((value): value is string => Boolean(value)).sort().at(-1) ?? null,
  };
}
