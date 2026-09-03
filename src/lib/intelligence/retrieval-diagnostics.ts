import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { IntelligenceAnalysis } from "@/lib/intelligence/evidence";
import type { IntelligenceQueryPlan } from "@/lib/intelligence/query-planner";
import type { RetrievalSubquery } from "@/lib/intelligence/query-decomposition";
import type { RetrievalConfig } from "@/lib/intelligence/retrieval-config";
import type { RetrievalResult } from "@/lib/intelligence/retriever";
import type { SemanticStatus } from "@/lib/intelligence/retrieval-orchestrator";

export async function persistRetrievalDiagnostic({
  id,
  userId,
  conversationId,
  question,
  plan,
  subqueries,
  retrieval,
  retrievalDurationMs,
  semanticStatus,
  config,
}: {
  id: string;
  userId: string;
  conversationId: string;
  question: string;
  plan: IntelligenceQueryPlan;
  subqueries: RetrievalSubquery[];
  retrieval: RetrievalResult;
  retrievalDurationMs: number;
  semanticStatus: SemanticStatus;
  config: RetrievalConfig;
}) {
  const db = createAdminClient();
  const { error } = await db.from("retrieval_diagnostics").insert({
    id,
    user_id: userId,
    conversation_id: conversationId,
    query_hash: createHash("sha256").update(question).digest("hex"),
    original_query: question,
    parsed_intent: plan.intent,
    query_plan: plan,
    decomposed_queries: subqueries,
    semantic_candidate_count: retrieval.metrics.semanticCandidateCount,
    lexical_candidate_count: retrieval.metrics.lexicalCandidateCount,
    merged_candidate_count: retrieval.metrics.mergedCandidateCount,
    duplicates_removed: retrieval.metrics.duplicatesRemoved,
    reranked_candidate_count: retrieval.metrics.rerankedCandidateCount,
    selected_evidence_count: retrieval.metrics.selectedEvidenceCount,
    unique_document_count: retrieval.metrics.uniqueDocumentCount,
    unique_domain_count: retrieval.metrics.uniqueDomainCount,
    max_document_concentration: retrieval.metrics.maxDocumentConcentration,
    median_evidence_age_days: retrieval.metrics.medianEvidenceAgeDays,
    retrieval_duration_ms: retrievalDurationMs,
    embedding_model: semanticStatus === "available" ? config.embeddingModel : null,
    semantic_status: semanticStatus,
    evidence_coverage: retrieval.metrics.coverage,
    selected_evidence: retrieval.references.map((reference) => ({
      sourceId: reference.sourceId,
      rank: reference.rank,
      passageIds: reference.passages?.map((passage) => passage.id) ?? [],
      publisher: reference.publisher,
      publicationDate: reference.publicationDate,
    })),
    reranking_scores: retrieval.diagnostics,
    retrieval_config: config,
  });
  if (error) throw new Error(`Could not persist retrieval diagnostics: ${error.message}`);
}

export async function completeRetrievalDiagnostic({
  id,
  analysis,
  retrieval,
  generationDurationMs,
}: {
  id: string;
  analysis: IntelligenceAnalysis;
  retrieval: RetrievalResult;
  generationDurationMs: number;
}) {
  const usedReferenceIds = new Set(
    analysis.evidenceFindings.flatMap((finding) => finding.referenceIds),
  );
  const usedSources = retrieval.references
    .filter((reference) => usedReferenceIds.has(reference.id))
    .map((reference) => reference.sourceId);
  const citationUtilisation = retrieval.references.length
    ? usedSources.length / retrieval.references.length
    : 0;
  const db = createAdminClient();
  const { error } = await db
    .from("retrieval_diagnostics")
    .update({
      generation_duration_ms: Math.max(0, generationDurationMs),
      citation_utilisation: citationUtilisation,
      final_citations: usedSources,
    })
    .eq("id", id);
  if (error) throw new Error(`Could not complete retrieval diagnostics: ${error.message}`);
}
