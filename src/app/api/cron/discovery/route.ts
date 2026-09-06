import { startDueSourceDiscovery } from "@/lib/intelligence/ingestion/start-discovery";
import { backfillApprovedEmbeddings } from "@/lib/intelligence/embedding-backfill";
import { isDublinEight } from "@/lib/research/reporting-period";
import { queueSignalBackfill } from "@/lib/intelligence/signals/operations";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("force") === "1";
  const signalBackfill = await queueSignalBackfill(3).catch((error) => ({
    requested: 3,
    queued: 0,
    error: error instanceof Error ? error.message : "Signal backfill unavailable",
  }));
  if (!force && !isDublinEight()) {
    return Response.json({
      skipped: true,
      reason: "Outside the 08:00 Europe/Dublin schedule window",
      signalBackfill,
    });
  }

  const [discovery, embeddings] = await Promise.all([
    startDueSourceDiscovery(4),
    backfillApprovedEmbeddings(50),
  ]);
  return Response.json(
    { skipped: false, forced: force, discovery, embeddings, signalBackfill },
    { status: discovery.started.length ? 202 : 200 },
  );
}
