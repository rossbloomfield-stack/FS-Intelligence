import { startDueSourceDiscovery } from "@/lib/intelligence/ingestion/start-discovery";
import { backfillApprovedEmbeddings } from "@/lib/intelligence/embedding-backfill";
import { isDublinEight } from "@/lib/research/reporting-period";
import { queueSignalBackfill } from "@/lib/intelligence/signals/operations";
import { backfillKnowledgeGraph, queueR4SourceBackfill, refreshGraphOperationalMetrics } from "@/lib/intelligence/graph/operations";
import { startQueuedSourceIngestion } from "@/lib/intelligence/ingestion/start-queued";
import { promoteTrustedPrimaryEvidence } from "@/lib/intelligence/ingestion/trusted-primary";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("force") === "1";
  const trustedEvidence = await promoteTrustedPrimaryEvidence(50).catch((error) => ({
    requested: 50,
    promoted: [],
    error: error instanceof Error ? error.message : "Trusted evidence promotion unavailable",
  }));
  const signalBackfill = await queueSignalBackfill(10).catch((error) => ({
    requested: 10,
    queued: 0,
    error: error instanceof Error ? error.message : "Signal backfill unavailable",
  }));
  const graphBackfill = await backfillKnowledgeGraph(10).catch((error) => ({
    requested: 10,
    processed: 0,
    error: error instanceof Error ? error.message : "Graph backfill unavailable",
  }));
  if (!force && !isDublinEight()) {
    return Response.json({
      skipped: true,
      reason: "Outside the 08:00 Europe/Dublin schedule window",
      signalBackfill,
      graphBackfill,
      trustedEvidence,
    });
  }

  const [discovery, embeddings, sourceBackfill] = await Promise.all([
    startDueSourceDiscovery(4),
    backfillApprovedEmbeddings(50),
    queueR4SourceBackfill(50),
  ]);
  const ingestion = await startQueuedSourceIngestion(10);
  const graphMetrics = await refreshGraphOperationalMetrics().catch((error) => ({
    error: error instanceof Error ? error.message : "Graph metrics unavailable",
  }));
  return Response.json(
    { skipped: false, forced: force, discovery, embeddings, trustedEvidence, signalBackfill, graphBackfill, sourceBackfill, ingestion, graphMetrics },
    { status: discovery.started.length || ingestion.started.length ? 202 : 200 },
  );
}
