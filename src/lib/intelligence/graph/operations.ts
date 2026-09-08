import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  RELATIONSHIP_EXTRACTION_VERSION,
  RELATIONSHIP_SCHEMA_VERSION,
} from "@/lib/intelligence/graph/config";
import {
  deriveRelationshipCandidates,
  entityCanonicalKey,
  explainRelationshipScore,
  relationshipStableKey,
  relationshipStatus,
  scoreRelationship,
} from "@/lib/intelligence/graph/relationship-construction";

type ObservationRow = {
  id: string;
  entity_id: string | null;
  observation_type: string;
  observation_text: string;
  theme: string | null;
  capability: string | null;
  product: string | null;
  market: string | null;
  direction: string | null;
  event_date: string | null;
  published_at: string | null;
  extraction_confidence: number;
  evidence_directness: number;
  source_authority: number;
  entity_resolution_confidence: number | null;
  source_family_key: string | null;
  review_status: string;
};

type RelationshipSnapshot = {
  id: string;
  confidence_score: number;
  confidence_components: Record<string, unknown>;
  status: string;
  evidence_count: number;
  independent_source_count: number;
  reasoning_summary: string | null;
  updated_at: string;
};

export async function processObservationRelationships(observationId: string) {
  const startedAt = Date.now();
  const db = createAdminClient();
  const executionKey = `${RELATIONSHIP_EXTRACTION_VERSION}:${observationId}`;
  const { data: run, error: runError } = await db
    .from("relationship_processing_runs")
    .upsert(
      {
        execution_key: executionKey,
        observation_id: observationId,
        status: "running",
        stage: "extracting",
        started_at: new Date().toISOString(),
        completed_at: null,
        error_message: null,
        metadata: { release: "R4", deterministic: true },
      },
      { onConflict: "execution_key" },
    )
    .select("id")
    .single();
  if (runError || !run) throw new Error(`Could not start relationship processing: ${runError?.message ?? "unknown error"}`);

  try {
    const { data, error } = await db
      .from("intelligence_observations")
      .select("id,entity_id,observation_type,observation_text,theme,capability,product,market,direction,event_date,published_at,extraction_confidence,evidence_directness,source_authority,entity_resolution_confidence,source_family_key,review_status")
      .eq("id", observationId)
      .single();
    if (error || !data) throw new Error(`Observation unavailable: ${error?.message ?? "not found"}`);
    const observation = data as ObservationRow;
    if (observation.review_status !== "accepted" || !observation.entity_id) {
      await db.from("relationship_processing_runs").update({
        status: observation.entity_id ? "skipped" : "needs_review",
        stage: observation.entity_id ? "skipped" : "complete",
        unresolved_entities: observation.entity_id ? 0 : 1,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
      }).eq("id", run.id).throwOnError();
      return { created: 0, updated: 0, duplicates: 0, skipped: true };
    }

    const candidates = deriveRelationshipCandidates({
      observationType: observation.observation_type,
      observationText: observation.observation_text,
      theme: observation.theme,
      capability: observation.capability,
      product: observation.product,
      market: observation.market,
      direction: observation.direction,
      eventDate: observation.event_date,
    });
    await db.from("relationship_processing_runs").update({
      stage: "resolving",
      candidates_extracted: candidates.length,
    }).eq("id", run.id).throwOnError();
    if (!candidates.length) {
      await db.from("relationship_processing_runs").update({
        status: "skipped",
        stage: "skipped",
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt,
      }).eq("id", run.id).throwOnError();
      return { created: 0, updated: 0, duplicates: 0, skipped: true };
    }

    let created = 0;
    let updated = 0;
    let duplicates = 0;
    for (const candidate of candidates) {
      const targetKey = entityCanonicalKey(candidate.targetEntityType, candidate.targetEntityName);
      const { data: target, error: targetError } = await db.from("intelligence_entities").upsert({
        entity_type: candidate.targetEntityType,
        canonical_name: candidate.targetEntityName,
        canonical_key: targetKey,
        primary_geography: null,
        geography: null,
        status: "current",
        active: true,
        first_observed_at: observation.event_date ?? observation.published_at ?? new Date().toISOString(),
        last_observed_at: observation.event_date ?? observation.published_at ?? new Date().toISOString(),
        confidence_score: candidate.basis === "explicit" ? 0.9 : 0.68,
        metadata: { createdBy: RELATIONSHIP_EXTRACTION_VERSION },
      }, { onConflict: "canonical_key" }).select("id").single();
      if (targetError || !target) throw new Error(`Could not resolve relationship target: ${targetError?.message ?? "unknown error"}`);
      if (target.id === observation.entity_id) continue;

      const stableKey = relationshipStableKey(observation.entity_id, candidate.relationshipType, target.id);
      const { data: existing } = await db.from("intelligence_relationships")
        .select("id,confidence_score,confidence_components,status,evidence_count,independent_source_count,reasoning_summary,updated_at")
        .eq("stable_key", stableKey).maybeSingle();
      const initialScore = scoreRelationship({
        evidenceDirectness: Number(observation.evidence_directness),
        sourceAuthority: Number(observation.source_authority),
        extractionConfidence: Number(observation.extraction_confidence),
        entityConfidence: Number(observation.entity_resolution_confidence ?? 0.65),
        independentSourceCount: 1,
        contradictionCount: 0,
        basis: candidate.basis,
      });
      const now = new Date().toISOString();
      const { data: relationship, error: relationshipError } = await db.from("intelligence_relationships").upsert({
        stable_key: stableKey,
        source_entity_id: observation.entity_id,
        relationship_type: candidate.relationshipType,
        target_entity_id: target.id,
        relationship_basis: candidate.basis,
        confidence_score: initialScore.confidence,
        confidence_components: initialScore.components,
        first_observed_at: observation.event_date ?? observation.published_at ?? now,
        last_observed_at: observation.event_date ?? observation.published_at ?? now,
        valid_from: candidate.validFrom,
        valid_to: candidate.validTo,
        status: relationshipStatus(candidate.basis, initialScore.confidence),
        extraction_model: "deterministic-r4",
        prompt_version: "not-applicable",
        schema_version: RELATIONSHIP_SCHEMA_VERSION,
        extraction_version: RELATIONSHIP_EXTRACTION_VERSION,
        reasoning_summary: explainRelationshipScore(initialScore, candidate.basis),
        metadata: { rationale: candidate.rationale },
      }, { onConflict: "stable_key" }).select("id").single();
      if (relationshipError || !relationship) throw new Error(`Could not persist relationship: ${relationshipError?.message ?? "unknown error"}`);

      const { data: priorLink } = await db.from("intelligence_relationship_observations")
        .select("relationship_id").eq("relationship_id", relationship.id)
        .eq("observation_id", observation.id).maybeSingle();
      if (priorLink) duplicates += 1;
      await db.from("intelligence_relationship_observations").upsert({
        relationship_id: relationship.id,
        observation_id: observation.id,
        evidence_role: "supporting",
        support_strength: observation.evidence_directness,
      }, { onConflict: "relationship_id,observation_id" }).throwOnError();

      const { data: signalLinks, error: signalError } = await db.from("intelligence_signal_observations")
        .select("signal_id").eq("observation_id", observation.id);
      if (signalError) throw new Error(`Could not align relationship signals: ${signalError.message}`);
      if (signalLinks?.length) {
        await db.from("intelligence_relationship_signals").upsert(
          signalLinks.map((link) => ({ relationship_id: relationship.id, signal_id: link.signal_id })),
          { onConflict: "relationship_id,signal_id", ignoreDuplicates: true },
        ).throwOnError();
      }
      await rescoreRelationship(relationship.id, candidate.basis);
      if (existing) {
        updated += 1;
        await recordRevision(relationship.id, existing as RelationshipSnapshot, "Supporting observation added");
      } else created += 1;
    }

    await db.from("relationship_processing_runs").update({
      status: "completed",
      stage: "complete",
      relationships_created: created,
      relationships_updated: updated,
      duplicates_suppressed: duplicates,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
    }).eq("id", run.id).throwOnError();
    return { created, updated, duplicates, skipped: false };
  } catch (error) {
    await db.from("relationship_processing_runs").update({
      status: "failed",
      stage: "failed",
      error_message: error instanceof Error ? error.message.slice(0, 2_000) : "Unknown relationship-processing error",
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
    }).eq("id", run.id);
    throw error;
  }
}

async function rescoreRelationship(relationshipId: string, basis: "explicit" | "inferred") {
  const db = createAdminClient();
  const { data: links, error } = await db.from("intelligence_relationship_observations")
    .select("evidence_role,intelligence_observations(evidence_directness,source_authority,extraction_confidence,entity_resolution_confidence,source_family_key,event_date,published_at)")
    .eq("relationship_id", relationshipId);
  if (error) throw new Error(`Could not load relationship lineage: ${error.message}`);
  const observations = (links ?? []).flatMap((link) => {
    const row = Array.isArray(link.intelligence_observations)
      ? link.intelligence_observations[0]
      : link.intelligence_observations;
    return row ? [{ ...row, evidenceRole: link.evidence_role }] : [];
  });
  const supporting = observations.filter((item) => item.evidenceRole !== "contradictory");
  const independentSourceCount = new Set(supporting.map((item) => item.source_family_key).filter(Boolean)).size;
  const contradictionCount = observations.length - supporting.length;
  const score = scoreRelationship({
    evidenceDirectness: average(supporting.map((item) => Number(item.evidence_directness))),
    sourceAuthority: average(supporting.map((item) => Number(item.source_authority))),
    extractionConfidence: average(supporting.map((item) => Number(item.extraction_confidence))),
    entityConfidence: average(supporting.map((item) => Number(item.entity_resolution_confidence ?? 0.65))),
    independentSourceCount,
    contradictionCount,
    basis,
  });
  const dates = supporting
    .map((item) => item.event_date ?? item.published_at)
    .filter((value): value is string => Boolean(value))
    .sort();
  await db.from("intelligence_relationships").update({
    confidence_score: score.confidence,
    confidence_components: score.components,
    status: relationshipStatus(basis, score.confidence),
    evidence_count: supporting.length,
    independent_source_count: independentSourceCount,
    first_observed_at: dates[0] ?? new Date().toISOString(),
    last_observed_at: dates.at(-1) ?? new Date().toISOString(),
    reasoning_summary: explainRelationshipScore(score, basis),
    updated_at: new Date().toISOString(),
  }).eq("id", relationshipId).throwOnError();
}

async function recordRevision(relationshipId: string, snapshot: RelationshipSnapshot, reason: string) {
  const db = createAdminClient();
  const { data: latest } = await db.from("intelligence_relationship_revisions")
    .select("revision_number").eq("relationship_id", relationshipId)
    .order("revision_number", { ascending: false }).limit(1).maybeSingle();
  await db.from("intelligence_relationship_revisions").insert({
    relationship_id: relationshipId,
    revision_number: Number(latest?.revision_number ?? 0) + 1,
    snapshot,
    change_reason: reason,
  }).throwOnError();
}

export async function backfillKnowledgeGraph(limit: number) {
  const db = createAdminClient();
  const boundedLimit = Math.max(1, Math.min(limit, 20));
  const { data: observations, error } = await db.from("intelligence_observations")
    .select("id").eq("review_status", "accepted").order("event_date", { ascending: false, nullsFirst: false }).limit(100);
  if (error) throw new Error(`Could not load graph backfill candidates: ${error.message}`);
  const candidates: string[] = [];
  for (const observation of observations ?? []) {
    const executionKey = `${RELATIONSHIP_EXTRACTION_VERSION}:${observation.id}`;
    const { data: current } = await db.from("relationship_processing_runs")
      .select("status").eq("execution_key", executionKey).in("status", ["completed", "running", "needs_review"]).maybeSingle();
    if (!current) candidates.push(observation.id);
    if (candidates.length >= boundedLimit) break;
  }
  const outcomes = [];
  for (const observationId of candidates) outcomes.push(await processObservationRelationships(observationId));
  return { requested: boundedLimit, processed: outcomes.length, outcomes };
}

export async function queueR4SourceBackfill(limit: number) {
  const db = createAdminClient();
  const { data, error } = await db.rpc("queue_r4_source_backfill", {
    p_limit: Math.max(1, Math.min(limit, 50)),
  });
  if (error) throw new Error(`Could not queue R4 source expansion: ${error.message}`);
  return { queued: data?.length ?? 0, runIds: (data ?? []).map((row: { id: string }) => row.id) };
}

export async function refreshGraphOperationalMetrics() {
  const db = createAdminClient();
  const { data, error } = await db.rpc("refresh_r4_operational_metrics");
  if (error) throw new Error(`Could not refresh R4 operational metrics: ${error.message}`);
  return data;
}

export async function reviewRelationship(input: {
  relationshipId: string;
  action: "confirm" | "reject" | "expire" | "restore";
  actorId: string;
  note?: string;
}) {
  const db = createAdminClient();
  const { data: relationship, error } = await db.from("intelligence_relationships")
    .select("id,confidence_score,confidence_components,status,evidence_count,independent_source_count,reasoning_summary,updated_at")
    .eq("id", input.relationshipId).single();
  if (error || !relationship) throw new Error(`Relationship unavailable: ${error?.message ?? "not found"}`);
  const nextStatus = input.action === "confirm"
    ? "current"
    : input.action === "reject"
      ? "rejected"
      : input.action === "expire"
        ? "historical"
        : Number(relationship.confidence_score) >= 0.72 ? "current" : "emerging";
  const nextValue = { status: nextStatus, reviewedAt: new Date().toISOString() };
  await recordRevision(input.relationshipId, relationship as RelationshipSnapshot, `Admin review: ${input.action}`);
  await db.from("intelligence_relationships").update({
    status: nextStatus,
    updated_at: new Date().toISOString(),
    metadata: { lastReviewAction: input.action, lastReviewNote: input.note ?? null },
  }).eq("id", input.relationshipId).throwOnError();
  await db.from("intelligence_relationship_review_events").insert({
    relationship_id: input.relationshipId,
    actor_id: input.actorId,
    action: input.action,
    previous_value: relationship,
    next_value: nextValue,
    note: input.note ?? null,
  }).throwOnError();
  return { relationshipId: input.relationshipId, status: nextStatus };
}

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}
