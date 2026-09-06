import type { createClient } from "@/lib/supabase/server";
import type { EvidenceReference } from "@/lib/intelligence/evidence";
import type { IntelligenceQueryPlan } from "@/lib/intelligence/query-planner";
import type { RetrievedMarketSignal } from "@/schemas/signal-intelligence";
import { getSignalIntelligenceConfig } from "@/lib/intelligence/signals/config";

type DatabaseClient = Awaited<ReturnType<typeof createClient>>;

type SignalRow = {
  signal_id: string; title: string; summary: string; signal_type: string; status: string;
  direction: string | null; event_date: string | null; first_observed_at: string | null; last_observed_at: string | null;
  confidence_score: number | string | null; strategic_relevance: number | string | null; novelty: number | string | null;
  magnitude: string | null; momentum: number | string | null; signal_score: number | string | null;
  themes: string[] | null; capabilities: string[] | null; geographies: string[] | null;
  corroboration_count: number; independent_source_count: number; contradiction_count: number;
  reasoning_summary: string | null; relevance: number | string | null;
};

export type RetrievedSignalContext = RetrievedMarketSignal & { referenceIds: string[]; evidenceObservationCount: number };

export async function retrieveIntelligenceSignals({ db, question, plan, references, now = new Date() }: {
  db: DatabaseClient; question: string; plan: IntelligenceQueryPlan; references: EvidenceReference[]; now?: Date;
}): Promise<RetrievedSignalContext[]> {
  const config = getSignalIntelligenceConfig();
  if (!config.retrievalEnabled) return [];
  const publishedAfter = rollingStart(plan, now);
  const result = await db.rpc("search_approved_intelligence_signals", {
    search_query: buildSignalQuery(question, plan),
    requested_entity_ids: [],
    requested_themes: plan.themes.map(normaliseKey),
    requested_geographies: [],
    minimum_confidence: plan.intent === "evidence_request" ? 30 : 50,
    minimum_relevance: 0,
    published_after: publishedAfter,
    result_limit: config.signalRetrievalCount,
  });
  if (result.error) {
    console.warn(JSON.stringify({ level: "warning", message: "R3 signal retrieval unavailable; R1 evidence retained", error: result.error.message }));
    return [];
  }
  const rows = (result.data ?? []) as SignalRow[];
  if (!rows.length) return [];
  const links = await db.from("intelligence_signal_observations")
    .select("signal_id,intelligence_observations(id,source_id,review_status)")
    .in("signal_id", rows.map((row) => row.signal_id));
  if (links.error) return [];
  const referenceBySource = new Map(references.map((reference) => [reference.sourceId, reference.id]));
  const lineage = new Map<string, { references: Set<string>; observationIds: Set<string> }>();
  for (const link of links.data ?? []) {
    const observation = first(link.intelligence_observations);
    if (!observation || observation.review_status !== "accepted") continue;
    const entry = lineage.get(link.signal_id) ?? { references: new Set<string>(), observationIds: new Set<string>() };
    entry.observationIds.add(observation.id);
    const referenceId = referenceBySource.get(observation.source_id);
    if (referenceId) entry.references.add(referenceId);
    lineage.set(link.signal_id, entry);
  }
  return rows.map((row) => {
    const trace = lineage.get(row.signal_id) ?? { references: new Set<string>(), observationIds: new Set<string>() };
    return {
      id: row.signal_id, title: row.title, summary: row.summary, signalType: row.signal_type, status: row.status,
      direction: row.direction, eventDate: row.event_date, firstObservedAt: row.first_observed_at, lastObservedAt: row.last_observed_at,
      confidenceScore: number(row.confidence_score), strategicRelevance: number(row.strategic_relevance), novelty: number(row.novelty),
      magnitude: row.magnitude, momentum: number(row.momentum), signalScore: number(row.signal_score), themes: row.themes ?? [],
      capabilities: row.capabilities ?? [], geographies: row.geographies ?? [], corroborationCount: row.corroboration_count,
      independentSourceCount: row.independent_source_count, contradictionCount: row.contradiction_count,
      reasoningSummary: row.reasoning_summary, relevance: number(row.relevance), referenceIds: [...trace.references],
      evidenceObservationCount: trace.observationIds.size,
    };
  }).filter((signal) => signal.referenceIds.length > 0).sort((a, b) => b.relevance - a.relevance || b.signalScore - a.signalScore);
}

function buildSignalQuery(question: string, plan: IntelligenceQueryPlan) {
  const plannedTerms = [...plan.organisations.map((item) => item.name), ...plan.themes, ...plan.products, ...plan.strategicQuestionTypes];
  const questionTerms = question.toLowerCase().match(/[a-z0-9][a-z0-9'-]{2,}/g)?.filter((term) => !signalSearchStopWords.has(term)) ?? [];
  const terms = [...new Set([...plannedTerms, ...questionTerms].map((term) => term.trim()).filter(Boolean))].slice(0, 18);
  // websearch_to_tsquery treats whitespace as AND. Explicit OR terms keep broad
  // strategic questions from eliminating otherwise relevant structured signals.
  return terms.map((term) => `"${term.replaceAll('"', "")}"`).join(" OR ").slice(0, 1_000);
}
function rollingStart(plan: IntelligenceQueryPlan, now: Date) {
  const months = plan.timeframe.rollingMonths ?? ({ today: 1 / 30, this_week: 0.25, this_month: 1, this_quarter: 3, six_months: 6, last_year: 12 } as Record<string, number>)[plan.timeframe.label];
  if (!months) return null;
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - Math.max(1, Math.round(months * 30.4375)));
  return date.toISOString().slice(0, 10);
}
function normaliseKey(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); }
function number(value: number | string | null) { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0; }
function first<T>(value: T | T[] | null | undefined): T | null { return Array.isArray(value) ? value[0] ?? null : value ?? null; }
const signalSearchStopWords = new Set(["what", "which", "where", "when", "whose", "why", "how", "have", "does", "did", "with", "from", "into", "about", "that", "this", "these", "those", "their", "there", "been", "being", "could", "would", "should", "most", "more", "less", "than", "really", "appear", "appears", "suggest", "suggests", "signal", "signals", "evidence", "market", "financial", "services"]);
