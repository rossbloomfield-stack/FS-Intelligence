import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { IngestionOperationsStatus } from "@/schemas/source-ingestion";

export async function getIngestionOperationsStatus(): Promise<IngestionOperationsStatus> {
  const db = createAdminClient();
  const [
    runsResult,
    itemsResult,
    approvedResult,
    passagesResult,
    targetsResult,
    discoveryConnectorsResult,
    discoveredTargetsResult,
    lastDiscoveryResult,
  ] = await Promise.all([
    db.from("source_ingestion_runs").select("status").limit(5_000),
    db
      .from("source_items")
      .select(
        "id,title,canonical_url,content_type,publication_date,reference_targets(reference_key,title)",
      )
      .eq("approved", false)
      .eq("fetch_status", "parsed")
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("source_items")
      .select("id", { count: "exact", head: true })
      .eq("approved", true),
    db.from("source_chunks").select("id", { count: "exact", head: true }),
    db
      .from("reference_targets")
      .select("id", { count: "exact", head: true })
      .eq("enabled", true),
    db
      .from("source_connectors")
      .select("id", { count: "exact", head: true })
      .eq("discovery_enabled", true),
    db
      .from("reference_targets")
      .select("id", { count: "exact", head: true })
      .like("reference_key", "DISC-%"),
    db
      .from("source_connectors")
      .select("discovery_last_succeeded_at")
      .not("discovery_last_succeeded_at", "is", null)
      .order("discovery_last_succeeded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (runsResult.error || itemsResult.error) {
    throw new Error(
      `Could not load ingestion operations: ${runsResult.error?.message ?? itemsResult.error?.message}`,
    );
  }
  const statusCounts = Object.fromEntries(
    ["queued", "running", "completed", "partial", "failed", "blocked"].map(
      (status) => [
        status,
        (runsResult.data ?? []).filter((run) => run.status === status).length,
      ],
    ),
  );
  return {
    statusCounts,
    approvedSourceItems: approvedResult.count ?? 0,
    storedPassages: passagesResult.count ?? 0,
    enabledTargets: targetsResult.count ?? 0,
    discoveryEnabledConnectors: discoveryConnectorsResult.count ?? 0,
    discoveredTargets: discoveredTargetsResult.count ?? 0,
    lastDiscoverySucceededAt:
      lastDiscoveryResult.data?.discovery_last_succeeded_at ?? null,
    pendingItems: (itemsResult.data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      canonical_url: item.canonical_url,
      content_type: item.content_type,
      publication_date: item.publication_date,
      reference_targets: Array.isArray(item.reference_targets)
        ? (item.reference_targets[0] ?? null)
        : item.reference_targets,
    })),
  };
}
