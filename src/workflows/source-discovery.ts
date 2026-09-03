import {
  discoverSourceCandidates,
  failSourceDiscoveryRun,
  loadSourceDiscoveryContext,
  persistDiscoveredSources,
  startDiscoveredSourceIngestion,
} from "@/workflows/source-discovery-steps";

export async function sourceDiscoveryWorkflow(runId: string) {
  "use workflow";
  try {
    const context = await loadSourceDiscoveryContext(runId);
    const discovery = await discoverSourceCandidates(context);
    const result = await persistDiscoveredSources(
      context,
      discovery.candidates,
      discovery.bytesFetched,
    );
    const ingestion = await startDiscoveredSourceIngestion(2);
    return { runId, status: "completed" as const, ...result, ingestion };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : error &&
            typeof error === "object" &&
            "message" in error &&
            typeof error.message === "string"
          ? error.message
          : "Unknown source-discovery failure";
    await failSourceDiscoveryRun(runId, message);
    return { runId, status: "failed" as const, error: message };
  }
}
