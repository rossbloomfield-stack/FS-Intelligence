import { createHash } from "node:crypto";
import { FatalError } from "workflow";
import { createAdminClient } from "@/lib/supabase/admin";
import { assessSignalEligibility } from "@/lib/intelligence/signals/eligibility";
import { getSignalIntelligenceConfig } from "@/lib/intelligence/signals/config";
import { extractObservations, OBSERVATION_PROMPT_VERSION, OBSERVATION_SCHEMA_VERSION } from "@/lib/intelligence/signals/observation-extractor";
import { resolveObservationEntity, type IntelligenceEntityCandidate } from "@/lib/intelligence/signals/entity-resolution";
import { areDirectionsContradictory, observationSimilarity, sourceFamilyKey, type ObservationFingerprint } from "@/lib/intelligence/signals/matching";
import { explainScore, lifecycleFor, scoreSignal } from "@/lib/intelligence/signals/scoring";

export async function processSignalEvidence(runId: string) {
  "use step";
  const startedAt = Date.now();
  const config = getSignalIntelligenceConfig();
  const db = createAdminClient();
  const runResult = await db.from("signal_processing_runs").select("id,source_item_id,document_version_id,status").eq("id", runId).single();
  if (runResult.error || !runResult.data?.source_item_id || !runResult.data.document_version_id) throw new FatalError("Signal-processing run is incomplete");
  const itemResult = await db.from("source_items")
    .select("id,title,canonical_url,publication_date,evidence_classification,approved,parent_source_id,evidence_source_id,source_chunks(id,content,section_label,page_number),sources!source_items_parent_source_id_fkey(title,source_class,source_weight,credibility_tier,primary_source)")
    .eq("id", runResult.data.source_item_id).single();
  if (itemResult.error || !itemResult.data) throw new FatalError(`Approved evidence unavailable: ${itemResult.error?.message ?? "not found"}`);
  const item = itemResult.data;
  if (!item.approved) throw new FatalError("Signal processing cannot use unapproved evidence");
  const parent = first(item.sources);
  const allPassages = (item.source_chunks ?? []).map((chunk) => ({ chunkId: chunk.id, content: chunk.content, sectionLabel: chunk.section_label, pageNumber: chunk.page_number }));
  const passages = boundPassages(allPassages, config.maximumEvidenceLength);
  const evidenceText = passages.map((passage) => passage.content).join("\n\n");
  const authority = sourceAuthority(parent?.credibility_tier, parent?.source_weight, parent?.primary_source);
  const eligibility = assessSignalEligibility({ title: item.title, sourceClass: parent?.source_class, publicationDate: item.publication_date, text: evidenceText, sourceAuthority: authority, changeClassification: "unknown" }, config.eligibilityThreshold);
  await db.from("signal_processing_runs").update({ stage: "signal_eligibility", eligibility_result: eligibility }).eq("id", runId).throwOnError();
  if (!eligibility.eligible) {
    await db.from("signal_processing_runs").update({ stage: "skipped", status: "skipped", duration_ms: Date.now() - startedAt, completed_at: new Date().toISOString() }).eq("id", runId).throwOnError();
    return { runId, status: "skipped" as const, reason: eligibility.reasons };
  }
  await db.from("signal_processing_runs").update({ stage: "observation_extracting" }).eq("id", runId).throwOnError();
  const extraction = await extractObservations({ title: item.title, publisher: parent?.title ?? "Publisher not recorded", publicationDate: item.publication_date, evidenceClassification: item.evidence_classification, passages });
  const entities = await loadEntities(db);
  let acceptedCount = 0;
  let rejectedCount = extraction.observations.rejected.length;
  let createdCount = 0;
  let updatedCount = 0;
  let duplicateCount = 0;
  let unresolvedCount = 0;
  let contradictionCount = 0;
  for (const extracted of extraction.observations.accepted) {
    const resolved = resolveObservationEntity(extracted.rawEntityText, entities, config.entityMatchThreshold);
    const reviewStatus = !extracted.signalWorthy || extracted.materiality < config.materialityThreshold
      ? "rejected"
      : resolved.ambiguous || (extracted.rawEntityText && !resolved.id) || extracted.extractionConfidence < 0.62
        ? "needs_review"
        : "accepted";
    if (reviewStatus === "rejected") rejectedCount += 1;
    if (reviewStatus === "accepted") acceptedCount += 1;
    if (resolved.ambiguous || (extracted.rawEntityText && !resolved.id)) unresolvedCount += 1;
    const stableKey = createHash("sha256").update(`${runResult.data.document_version_id}:${extracted.stableEvidenceHash}:${extracted.observationType}`).digest("hex");
    const observationWrite = await db.from("intelligence_observations").upsert({
      stable_key: stableKey,
      document_id: item.id,
      document_version_id: runResult.data.document_version_id,
      source_id: item.evidence_source_id ?? item.parent_source_id,
      evidence_chunk_id: extracted.chunkId,
      processing_run_id: runId,
      entity_id: resolved.id,
      raw_entity_text: extracted.rawEntityText,
      entity_resolution_confidence: resolved.confidence,
      observation_type: extracted.observationType,
      event_type: extracted.eventType,
      theme: normaliseKey(extracted.theme),
      capability: normaliseKey(extracted.capability),
      product: extracted.product,
      market: extracted.market,
      geography: extracted.geography,
      observation_text: extracted.observationText,
      evidence_text: extracted.evidenceText,
      evidence_section_label: extracted.sectionLabel,
      evidence_page_number: extracted.pageNumber,
      evidence_start: extracted.evidenceStart,
      evidence_end: extracted.evidenceEnd,
      metric_name: extracted.metricName,
      metric_value: extracted.metricValue,
      metric_unit: extracted.metricUnit,
      metric_currency: extracted.metricCurrency,
      metric_period: extracted.metricPeriod,
      metric_scope: extracted.metricScope,
      previous_value: extracted.previousValue,
      direction: extracted.direction,
      event_date: extracted.eventDate,
      published_at: item.publication_date,
      extraction_confidence: extracted.extractionConfidence,
      evidence_directness: extracted.evidenceDirectness,
      source_authority: authority,
      is_primary_source: Boolean(parent?.primary_source),
      is_independent_source: true,
      source_family_key: sourceFamilyKey({ canonicalUrl: item.canonical_url, publisher: parent?.title ?? "unknown", title: item.title }),
      model_version: extraction.model,
      prompt_version: OBSERVATION_PROMPT_VERSION,
      extraction_version: OBSERVATION_PROMPT_VERSION,
      schema_version: OBSERVATION_SCHEMA_VERSION,
      review_status: reviewStatus,
      rejection_reason: reviewStatus === "rejected" ? extracted.reviewReason ?? "Below R3 materiality threshold" : reviewStatus === "needs_review" ? extracted.reviewReason ?? "Entity or extraction confidence requires review" : null,
      materiality_score: extracted.materiality,
    }, { onConflict: "stable_key" }).select("id").single();
    if (observationWrite.error || !observationWrite.data) throw new Error(`Could not persist observation: ${observationWrite.error?.message ?? "unknown error"}`);
    if (resolved.id) await db.from("intelligence_observation_entities").upsert({ observation_id: observationWrite.data.id, entity_id: resolved.id, relationship: "primary", resolution_confidence: resolved.confidence }).throwOnError();
    if (reviewStatus !== "accepted" || !config.generationEnabled) continue;
    const outcome = await attachObservationToSignal(db, observationWrite.data.id, {
      entityId: resolved.id,
      observationType: extracted.observationType,
      eventType: extracted.eventType,
      theme: normaliseKey(extracted.theme),
      product: extracted.product,
      eventDate: extracted.eventDate,
      observationText: extracted.observationText,
      direction: extracted.direction,
      geography: extracted.geography,
      capability: normaliseKey(extracted.capability),
      materiality: extracted.materiality,
      publishedAt: item.publication_date,
      evidenceDirectness: extracted.evidenceDirectness,
      extractionConfidence: extracted.extractionConfidence,
      sourceAuthority: authority,
      entityConfidence: resolved.confidence,
    }, config.signalMatchThreshold, config.contradictionDetectionEnabled);
    if (outcome.created) createdCount += 1;
    else if (outcome.updated) updatedCount += 1;
    if (outcome.duplicate) duplicateCount += 1;
    if (outcome.contradiction) contradictionCount += 1;
  }
  await db.from("signal_processing_runs").update({
    stage: "complete", status: unresolvedCount ? "needs_review" : "completed",
    observations_extracted: acceptedCount, observations_rejected: rejectedCount,
    signals_created: createdCount, signals_updated: updatedCount,
    duplicates_suppressed: duplicateCount, unresolved_entities: unresolvedCount,
    contradiction_count: contradictionCount, model_calls: 1,
    input_tokens: extraction.usage.inputTokens, output_tokens: extraction.usage.outputTokens,
    duration_ms: Date.now() - startedAt, completed_at: new Date().toISOString(),
  }).eq("id", runId).throwOnError();
  return { runId, status: unresolvedCount ? "needs_review" as const : "completed" as const, observations: acceptedCount, rejected: rejectedCount, signalsCreated: createdCount, signalsUpdated: updatedCount, duplicatesSuppressed: duplicateCount, unresolvedEntities: unresolvedCount, contradictions: contradictionCount };
}

export async function failSignalProcessing(runId: string, message: string) {
  "use step";
  const db = createAdminClient();
  await db.from("signal_processing_runs").update({ stage: "failed", status: "failed", error_message: message.slice(0, 2_000), completed_at: new Date().toISOString() }).eq("id", runId);
}

async function attachObservationToSignal(db: ReturnType<typeof createAdminClient>, observationId: string, observation: ObservationFingerprint & { direction: string | null; geography: string | null; capability: string | null; materiality: number; publishedAt: string | null; evidenceDirectness: number; extractionConfidence: number; sourceAuthority: number; entityConfidence: number }, threshold: number, detectContradictions: boolean) {
  let query = db.from("intelligence_signals").select("id,canonical_key,title,summary,status,direction,event_date,publication_date,primary_entity_id,signal_family,themes,capabilities,geographies,products,first_observed_at,last_observed_at,confidence_score,confidence_components,source_authority_score,corroboration_count,independent_source_count,contradiction_count,strategic_relevance,relevance_components,novelty,magnitude,momentum,signal_score,reasoning_summary,approved,updated_at").in("status", ["emerging", "active", "confirmed", "mature", "contradicted"]);
  if (observation.entityId) query = query.eq("primary_entity_id", observation.entityId);
  const candidatesResult = await query.order("last_observed_at", { ascending: false }).limit(30);
  if (candidatesResult.error) throw new Error(`Could not match signals: ${candidatesResult.error.message}`);
  const ranked = (candidatesResult.data ?? []).map((signal) => ({ signal, similarity: observationSimilarity(observation, {
    entityId: signal.primary_entity_id,
    observationType: signal.signal_family ?? "",
    eventType: null,
    theme: signal.themes?.[0] ?? null,
    product: signal.products?.[0] ?? null,
    eventDate: signal.event_date,
    observationText: `${signal.title} ${signal.summary}`,
  }) })).sort((a, b) => b.similarity - a.similarity);
  const match = ranked[0]?.similarity >= threshold ? ranked[0].signal : null;
  if (!match) {
    const canonicalKey = `r3:${createHash("sha256").update(`${observation.entityId ?? "market"}:${observation.observationType}:${observation.theme ?? "general"}:${observation.eventDate ?? "undated"}:${observation.observationText}`).digest("hex").slice(0, 32)}`;
    const score = scoreSignal({
      evidenceDirectness: [observation.evidenceDirectness], sourceAuthority: [observation.sourceAuthority], extractionCertainty: [observation.extractionConfidence], entityCertainty: [observation.entityConfidence], independentSourceCount: 1, contradictionWeight: 0, temporalConsistency: observation.eventDate ? 1 : 0.55,
      competitiveProximity: observation.entityId ? 0.75 : 0.45, themeRelevance: observation.theme ? 0.8 : 0.45,
      customerImpact: observation.materiality, commercialImpact: observation.materiality, technologyImpact: /technology|ai|digital|platform/.test(observation.theme ?? observation.capability ?? "") ? 0.8 : 0.3,
      regulatoryImpact: /regulat/.test(observation.observationType) ? 0.9 : 0.2, timeHorizon: 0.75, novelty: 0.9, magnitude: magnitudeFromMateriality(observation.materiality), observationDates: [observation.eventDate], entityCount: observation.entityId ? 1 : 0,
    });
    const created = await db.from("intelligence_signals").insert({
      canonical_key: canonicalKey, title: observation.observationText.slice(0, 180), summary: observation.observationText,
      categorisation: observation.theme ?? observation.observationType, signal_type: hardSignalTypes.has(observation.observationType) ? "hard" : "soft",
      geography: observation.geography ?? "Not specified", organisation_id: null, primary_entity_id: observation.entityId,
      entity_ids: observation.entityId ? [observation.entityId] : [], themes: observation.theme ? [observation.theme] : [], capabilities: observation.capability ? [observation.capability] : [], markets: [], geographies: observation.geography ? [observation.geography] : [], products: observation.product ? [observation.product] : [],
      event_date: observation.eventDate, publication_date: observation.publishedAt ?? observation.eventDate ?? new Date().toISOString().slice(0, 10),
      materiality_score: Math.max(1, Math.min(5, Math.round(observation.materiality * 5))), confidence: confidenceEnum(score.confidence),
      status: lifecycleFor({ confidence: score.confidence, independentSourceCount: 1, observationCount: 1, contradictionWeight: 0 }), approved: score.confidence >= 50,
      signal_family: observation.observationType, direction: observation.direction, magnitude: score.magnitude,
      first_observed_at: new Date().toISOString(), last_observed_at: new Date().toISOString(), novelty: score.novelty,
      confidence_score: score.confidence, confidence_components: score.confidenceComponents, source_authority_score: score.confidenceComponents.sourceAuthority,
      corroboration_count: 0, independent_source_count: 1, contradiction_count: 0, strategic_relevance: score.strategicRelevance,
      relevance_components: score.relevanceComponents, momentum: score.momentum, signal_score: score.signalScore,
      reasoning_summary: explainScore(score), extraction_version: OBSERVATION_PROMPT_VERSION, lifecycle_status: "emerging",
      novelty_score: Math.max(1, Math.round(score.novelty * 5)), impact_score: Math.max(1, Math.round(score.strategicRelevance * 5)),
      authority_score: score.confidenceComponents.sourceAuthority, composite_score: score.signalScore / 20, scoring_version: score.scoringVersion,
    }).select("id").single();
    if (created.error || !created.data) throw new Error(`Could not create signal: ${created.error?.message ?? "unknown error"}`);
    await db.from("intelligence_signal_observations").insert({ signal_id: created.data.id, observation_id: observationId, relationship: "supporting", support_strength: 1 }).throwOnError();
    return { created: true, updated: false, duplicate: false, contradiction: false };
  }
  const existingLink = await db.from("intelligence_signal_observations").select("signal_id").eq("signal_id", match.id).eq("observation_id", observationId).maybeSingle();
  if (existingLink.data) return { created: false, updated: false, duplicate: true, contradiction: false };
  const contradiction = detectContradictions && areDirectionsContradictory(match.direction, observation.direction);
  await db.from("intelligence_signal_observations").insert({ signal_id: match.id, observation_id: observationId, relationship: contradiction ? "contradictory" : "corroborating", support_strength: 1 }).throwOnError();
  if (contradiction) await db.from("intelligence_signal_contradictions").upsert({ signal_id: match.id, observation_id: observationId, contradiction_type: "direct", weight: 0.7, rationale: "The new source-grounded observation has a direction opposite to the current signal." }, { onConflict: "signal_id,observation_id" }).throwOnError();
  await rescoreExistingSignal(db, match.id, contradiction ? "Contradictory observation added" : "Corroborating observation added");
  return { created: false, updated: true, duplicate: false, contradiction };
}

async function rescoreExistingSignal(db: ReturnType<typeof createAdminClient>, signalId: string, reason: string) {
  const signalResult = await db.from("intelligence_signals").select("*").eq("id", signalId).single();
  if (signalResult.error || !signalResult.data) throw new Error("Signal unavailable for rescoring");
  const signal = signalResult.data;
  const links = await db.from("intelligence_signal_observations").select("relationship,intelligence_observations(id,event_date,extraction_confidence,evidence_directness,source_authority,entity_resolution_confidence,source_family_key,entity_id,materiality_score)").eq("signal_id", signalId);
  if (links.error) throw new Error(`Could not load signal observations: ${links.error.message}`);
  const observations = (links.data ?? []).map((link) => first(link.intelligence_observations)).filter(nonNull);
  const supporting = (links.data ?? []).filter((link) => link.relationship !== "contradictory");
  const sourceFamilies = new Set(supporting.map((link) => first(link.intelligence_observations)?.source_family_key).filter(Boolean));
  const contradictionWeight = Math.min(1, (links.data ?? []).filter((link) => link.relationship === "contradictory").length * 0.35);
  const score = scoreSignal({
    evidenceDirectness: observations.map((item) => Number(item.evidence_directness)), sourceAuthority: observations.map((item) => Number(item.source_authority)), extractionCertainty: observations.map((item) => Number(item.extraction_confidence)), entityCertainty: observations.map((item) => Number(item.entity_resolution_confidence ?? 0.45)), independentSourceCount: sourceFamilies.size, contradictionWeight, temporalConsistency: 1,
    competitiveProximity: Number(signal.relevance_components?.competitiveProximity ?? 0.7), themeRelevance: Number(signal.relevance_components?.themeRelevance ?? 0.7), customerImpact: Number(signal.relevance_components?.customerImpact ?? average(observations.map((item) => Number(item.materiality_score ?? 0.5)))), commercialImpact: Number(signal.relevance_components?.commercialImpact ?? 0.6), technologyImpact: Number(signal.relevance_components?.technologyImpact ?? 0.4), regulatoryImpact: Number(signal.relevance_components?.regulatoryImpact ?? 0.3), timeHorizon: Number(signal.relevance_components?.timeHorizon ?? 0.7), novelty: observations.length > 1 ? Math.max(0.3, Number(signal.novelty ?? 0.8) - 0.08) : Number(signal.novelty ?? 0.8), magnitude: magnitudeFromMateriality(average(observations.map((item) => Number(item.materiality_score ?? 0.5)))), observationDates: observations.map((item) => item.event_date), entityCount: new Set(observations.map((item) => item.entity_id).filter(Boolean)).size,
  });
  const revisions = await db.from("intelligence_signal_revisions").select("revision_number").eq("signal_id", signalId).order("revision_number", { ascending: false }).limit(1).maybeSingle();
  await db.from("intelligence_signal_revisions").insert({ signal_id: signalId, revision_number: (revisions.data?.revision_number ?? 0) + 1, snapshot: signal, change_reason: reason }).throwOnError();
  const status = lifecycleFor({ confidence: score.confidence, independentSourceCount: sourceFamilies.size, observationCount: observations.length, contradictionWeight });
  await db.from("intelligence_signals").update({
    status, lifecycle_status: status, last_observed_at: new Date().toISOString(), confidence: confidenceEnum(score.confidence), confidence_score: score.confidence,
    confidence_components: score.confidenceComponents, source_authority_score: score.confidenceComponents.sourceAuthority,
    corroboration_count: Math.max(0, supporting.length - 1), independent_source_count: sourceFamilies.size,
    contradiction_count: (links.data ?? []).filter((link) => link.relationship === "contradictory").length,
    strategic_relevance: score.strategicRelevance, relevance_components: score.relevanceComponents,
    novelty: score.novelty, momentum: score.momentum, magnitude: score.magnitude, signal_score: score.signalScore,
    reasoning_summary: explainScore(score), scoring_version: score.scoringVersion, composite_score: score.signalScore / 20,
    approved: score.confidence >= 50,
  }).eq("id", signalId).throwOnError();
}

async function loadEntities(db: ReturnType<typeof createAdminClient>): Promise<IntelligenceEntityCandidate[]> {
  const [entities, aliases] = await Promise.all([
    db.from("intelligence_entities").select("id,canonical_name,geography").eq("active", true),
    db.from("intelligence_entity_aliases").select("entity_id,alias"),
  ]);
  if (entities.error || aliases.error) throw new Error("Could not load canonical entities");
  const aliasesByEntity = new Map<string, string[]>();
  for (const alias of aliases.data ?? []) aliasesByEntity.set(alias.entity_id, [...(aliasesByEntity.get(alias.entity_id) ?? []), alias.alias]);
  return (entities.data ?? []).map((entity) => ({ id: entity.id, canonicalName: entity.canonical_name, geography: entity.geography, aliases: aliasesByEntity.get(entity.id) ?? [] }));
}

const hardSignalTypes = new Set(["product_launch","product_change","product_withdrawal","pricing_change","technology_adoption","platform_change","ai_adoption","partnership","acquisition","disposal","merger","financial_performance","executive_appointment","executive_departure","regulation_finalised","regulatory_enforcement","implementation_deadline","app_update"]);
function sourceAuthority(tier: number | null | undefined, weight: number | null | undefined, primary: boolean | null | undefined) { const tierValue = ({ 1: 1, 2: 0.82, 3: 0.65, 4: 0.45 } as Record<number, number>)[tier ?? 4] ?? 0.45; return Math.max(tierValue, Number(weight ?? 0), primary ? 0.82 : 0); }
function confidenceEnum(score: number) { return score >= 70 ? "high" : score >= 50 ? "medium" : score >= 30 ? "low" : "insufficient"; }
function magnitudeFromMateriality(value: number): "minimal" | "low" | "moderate" | "high" | "transformational" { return value >= 0.9 ? "transformational" : value >= 0.72 ? "high" : value >= 0.5 ? "moderate" : value >= 0.3 ? "low" : "minimal"; }
function normaliseKey(value: string | null) { return value ? value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") : null; }
function first<T>(value: T | T[] | null | undefined): T | null { return Array.isArray(value) ? value[0] ?? null : value ?? null; }
function nonNull<T>(value: T | null): value is T { return value !== null; }
function average(values: number[]) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0.5; }
function boundPassages<T extends { content: string }>(passages: T[], maximum: number) {
  const selected: T[] = [];
  let used = 0;
  for (const passage of passages) {
    if (used >= maximum) break;
    const remaining = maximum - used;
    selected.push(remaining >= passage.content.length ? passage : { ...passage, content: passage.content.slice(0, remaining) });
    used += Math.min(remaining, passage.content.length);
  }
  return selected;
}
