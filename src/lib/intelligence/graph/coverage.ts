import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type GraphOperationsStatus = Awaited<ReturnType<typeof getGraphOperationsStatus>>;

export async function getGraphOperationsStatus() {
  const db = createAdminClient();
  const [sources, targets, evidence, passages, entities, relationships, observations, signals, runs, pending, gaps] = await Promise.all([
    db.from("sources").select("id,registry_active,approved_public,geography,source_class,credibility_tier", { count: "exact" }).neq("registry_kind", "document").limit(5_000),
    db.from("reference_targets").select("id,enabled,approved_for_fetch,readiness_grade,geography", { count: "exact" }).limit(5_000),
    db.from("source_items").select("id,approved,publication_date,parent_source_id", { count: "exact" }).limit(5_000),
    db.from("source_chunks").select("id", { count: "exact", head: true }),
    db.from("intelligence_entities").select("id,entity_type,status,primary_geography", { count: "exact" }).limit(5_000),
    db.from("intelligence_relationships").select("id,relationship_type,relationship_basis,status,confidence_score,evidence_count,independent_source_count,source_entity_id,target_entity_id,updated_at", { count: "exact" }).order("updated_at", { ascending: false }).limit(5_000),
    db.from("intelligence_observations").select("id,review_status", { count: "exact" }).limit(5_000),
    db.from("intelligence_signals").select("id,status,approved", { count: "exact" }).limit(5_000),
    db.from("relationship_processing_runs").select("id,status,relationships_created,relationships_updated,duplicates_suppressed,duration_ms,created_at").order("created_at", { ascending: false }).limit(50),
    db.from("source_items").select("id", { count: "exact", head: true }).eq("fetch_status", "parsed").eq("approved", false),
    db.from("intelligence_coverage_gaps").select("id,gap_type,severity,summary,entity_id,detected_at").is("resolved_at", null).order("detected_at", { ascending: false }).limit(50),
  ]);
  const results = [sources, targets, evidence, passages, entities, relationships, observations, signals, runs, pending, gaps];
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(`Could not load R4 diagnostics: ${failed.error.message}`);
  const sourceRows = sources.data ?? [];
  const targetRows = targets.data ?? [];
  const evidenceRows = evidence.data ?? [];
  const entityRows = entities.data ?? [];
  const relationshipRows = relationships.data ?? [];
  const observationRows = observations.data ?? [];
  const signalRows = signals.data ?? [];
  const runRows = runs.data ?? [];
  const relationshipEntityIds = [...new Set(relationshipRows.slice(0, 20).flatMap((row) => [row.source_entity_id, row.target_entity_id]))];
  const { data: relationshipEntities, error: relationshipEntityError } = relationshipEntityIds.length
    ? await db.from("intelligence_entities").select("id,canonical_name").in("id", relationshipEntityIds)
    : { data: [], error: null };
  if (relationshipEntityError) throw new Error(`Could not load relationship names: ${relationshipEntityError.message}`);
  const entityNameById = new Map((relationshipEntities ?? []).map((entity) => [entity.id, entity.canonical_name]));
  return {
    corpus: {
      registeredSources: sources.count ?? sourceRows.length,
      activeSources: sourceRows.filter((row) => row.registry_active).length,
      approvedSources: sourceRows.filter((row) => row.approved_public).length,
      registeredTargets: targets.count ?? targetRows.length,
      enabledTargets: targetRows.filter((row) => row.enabled && row.approved_for_fetch).length,
      gradeATargets: targetRows.filter((row) => row.readiness_grade === "A").length,
      evidenceItems: evidence.count ?? evidenceRows.length,
      approvedEvidence: evidenceRows.filter((row) => row.approved).length,
      passages: passages.count ?? 0,
      awaitingReview: pending.count ?? 0,
    },
    intelligence: {
      entities: entities.count ?? entityRows.length,
      observations: observations.count ?? observationRows.length,
      acceptedObservations: observationRows.filter((row) => row.review_status === "accepted").length,
      signals: signals.count ?? signalRows.length,
      approvedSignals: signalRows.filter((row) => row.approved).length,
      relationships: relationships.count ?? relationshipRows.length,
      explicitRelationships: relationshipRows.filter((row) => row.relationship_basis === "explicit").length,
      inferredRelationships: relationshipRows.filter((row) => row.relationship_basis === "inferred").length,
      evidencedRelationships: relationshipRows.filter((row) => row.evidence_count > 0).length,
    },
    coverage: {
      geography: countBy(sourceRows, (row) => row.geography ?? "Not classified"),
      sourceClass: countBy(sourceRows, (row) => row.source_class ?? "Not classified"),
      entityType: countBy(entityRows, (row) => row.entity_type),
      relationshipType: countBy(relationshipRows, (row) => row.relationship_type),
    },
    processing: {
      completed: runRows.filter((row) => row.status === "completed").length,
      failed: runRows.filter((row) => row.status === "failed").length,
      created: sum(runRows, "relationships_created"),
      updated: sum(runRows, "relationships_updated"),
      duplicatesSuppressed: sum(runRows, "duplicates_suppressed"),
      averageDurationMs: average(runRows.map((row) => Number(row.duration_ms ?? 0)).filter(Boolean)),
    },
    gaps: gaps.data ?? [],
    recentRelationships: relationshipRows.slice(0, 20).map((relationship) => ({
      id: relationship.id,
      sourceName: entityNameById.get(relationship.source_entity_id) ?? "Unknown entity",
      targetName: entityNameById.get(relationship.target_entity_id) ?? "Unknown entity",
      type: relationship.relationship_type,
      basis: relationship.relationship_basis,
      status: relationship.status,
      confidence: Number(relationship.confidence_score),
      evidenceCount: relationship.evidence_count,
    })),
    recentRuns: runRows.slice(0, 15),
  };
}

function countBy<T>(rows: T[], key: (row: T) => string) {
  return rows.reduce<Record<string, number>>((result, row) => {
    const value = key(row);
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
}

function sum<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : 0;
}
