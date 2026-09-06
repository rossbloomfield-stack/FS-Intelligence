import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { queueSignalProcessing } from "@/lib/intelligence/signals/queue";

export async function getSignalOperationsStatus() {
  const db = createAdminClient();
  const [signals, observations, runs, unresolved] = await Promise.all([
    db.from("intelligence_signals").select("id,title,status,confidence_score,important,primary_entity_id,signal_score", { count: "exact" }).order("signal_score", { ascending: false }).limit(100),
    db.from("intelligence_observations").select("id,review_status,is_primary_source,entity_id", { count: "exact" }).limit(2_000),
    db.from("signal_processing_runs").select("id,status,stage,observations_extracted,observations_rejected,signals_created,signals_updated,duplicates_suppressed,unresolved_entities,contradiction_count,duration_ms,estimated_cost_usd,created_at").order("created_at", { ascending: false }).limit(100),
    db.from("intelligence_observations").select("id", { count: "exact", head: true }).eq("review_status", "needs_review"),
  ]);
  if (signals.error || observations.error || runs.error || unresolved.error) throw new Error("Could not load R3 signal diagnostics");
  const signalRows = signals.data ?? [];
  const observationRows = observations.data ?? [];
  const runRows = runs.data ?? [];
  return {
    totals: { signals: signals.count ?? signalRows.length, observations: observations.count ?? observationRows.length, reviewBacklog: unresolved.count ?? 0 },
    signalStatus: countBy(signalRows, (row) => row.status),
    confidence: { veryHigh: signalRows.filter((row) => Number(row.confidence_score ?? 0) >= 85).length, high: signalRows.filter((row) => Number(row.confidence_score ?? 0) >= 70 && Number(row.confidence_score ?? 0) < 85).length, moderate: signalRows.filter((row) => Number(row.confidence_score ?? 0) >= 50 && Number(row.confidence_score ?? 0) < 70).length, low: signalRows.filter((row) => Number(row.confidence_score ?? 0) < 50).length },
    quality: { primaryEvidenceObservations: observationRows.filter((row) => row.is_primary_source).length, unresolvedEntities: observationRows.filter((row) => !row.entity_id).length, acceptedObservations: observationRows.filter((row) => row.review_status === "accepted").length },
    processing: { runs: runRows.length, completed: runRows.filter((row) => row.status === "completed").length, failed: runRows.filter((row) => row.status === "failed").length, duplicatesSuppressed: sum(runRows, "duplicates_suppressed"), signalsCreated: sum(runRows, "signals_created"), signalsUpdated: sum(runRows, "signals_updated"), contradictions: sum(runRows, "contradiction_count"), averageDurationMs: average(runRows.map((row) => Number(row.duration_ms ?? 0)).filter(Boolean)) },
    topSignals: signalRows.slice(0, 20),
    recentRuns: runRows.slice(0, 20),
  };
}

export async function queueSignalBackfill(limit: number, sourceClass?: string) {
  const db = createAdminClient();
  const items = await db.from("source_items").select("id,sources!source_items_parent_source_id_fkey(source_class)").eq("approved", true).order("publication_date", { ascending: false }).limit(50);
  if (items.error) throw new Error(`Could not load approved evidence: ${items.error.message}`);
  const candidates = [];
  for (const item of items.data ?? []) {
    const source = first(item.sources);
    if (sourceClass && source?.source_class !== sourceClass) continue;
    const current = await db.from("signal_processing_runs").select("id,status").eq("source_item_id", item.id).in("status", ["queued", "running", "completed", "needs_review"]).limit(1).maybeSingle();
    if (!current.data) candidates.push(item.id);
    if (candidates.length >= limit) break;
  }
  const results = [];
  for (const itemId of candidates) results.push(await queueSignalProcessing(itemId, "controlled_backfill"));
  return { requested: limit, queued: results.length, results };
}

function countBy<T>(rows: T[], getKey: (row: T) => string) { return rows.reduce<Record<string, number>>((result, row) => { const key = getKey(row); result[key] = (result[key] ?? 0) + 1; return result; }, {}); }
function sum<T extends Record<string, unknown>>(rows: T[], key: keyof T) { return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0); }
function average(values: number[]) { return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0; }
function first<T>(value: T | T[] | null | undefined): T | null { return Array.isArray(value) ? value[0] ?? null : value ?? null; }
