import {
  completeSourceIngestionRun,
  failSourceIngestionRun,
  fetchAndParseSource,
  loadSourceIngestionContext,
  persistParsedSource,
} from "@/workflows/source-ingestion-steps";

export async function sourceIngestionWorkflow(runId: string) {
  "use workflow";

  try {
    const context = await loadSourceIngestionContext(runId);
    const document = await fetchAndParseSource(context);
    const persisted = await persistParsedSource(context, document);
    await completeSourceIngestionRun(context, document, persisted);
    return {
      runId,
      sourceItemId: persisted.sourceItemId,
      passageCount: persisted.passageCount,
      status: "awaiting_review" as const,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown source-ingestion failure";
    await failSourceIngestionRun(runId, message);
    return { runId, status: "failed" as const, error: message };
  }
}
