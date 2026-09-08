import { backfillApprovedEmbeddings } from "@/lib/intelligence/embedding-backfill";
import { queueR4SourceBackfill } from "@/lib/intelligence/graph/operations";
import { startQueuedSourceIngestion } from "@/lib/intelligence/ingestion/start-queued";
import { promoteTrustedPrimaryEvidence } from "@/lib/intelligence/ingestion/trusted-primary";

export const maxDuration = 60;

export async function GET(request: Request) {
  const startedAt = Date.now();
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log(JSON.stringify({
    level: "info",
    message: "Corpus processing cycle started",
    route: "/api/cron/corpus",
  }));

  const [trustedEvidence, embeddings, sourceBackfill] = await Promise.all([
    promoteTrustedPrimaryEvidence(100).catch((error) => ({
      requested: 100,
      promoted: [],
      error: error instanceof Error ? error.message : "Trusted evidence promotion unavailable",
    })),
    backfillApprovedEmbeddings(100).catch((error) => ({
      status: "failed" as const,
      processed: 0,
      remaining: null,
      error: error instanceof Error ? error.message : "Embedding backfill unavailable",
    })),
    queueR4SourceBackfill(200).catch((error) => ({
      queued: 0,
      runIds: [],
      error: error instanceof Error ? error.message : "Source backfill unavailable",
    })),
  ]);
  const ingestion = await startQueuedSourceIngestion(20).catch((error) => ({
    claimed: 0,
    started: [],
    failures: [{
      runId: "queue",
      error: error instanceof Error ? error.message : "Source ingestion unavailable",
    }],
  }));
  const result = {
    trustedEvidence,
    embeddings,
    sourceBackfill,
    ingestion,
    durationMs: Date.now() - startedAt,
  };

  console.log(JSON.stringify({
    level: "info",
    message: "Corpus processing cycle completed",
    route: "/api/cron/corpus",
    promoted: trustedEvidence.promoted.length,
    embedded: embeddings.processed,
    queued: sourceBackfill.queued,
    started: ingestion.started.length,
    durationMs: result.durationMs,
  }));

  return Response.json(result, {
    status: ingestion.started.length ? 202 : 200,
  });
}
