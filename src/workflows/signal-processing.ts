import { failSignalProcessing, processSignalEvidence } from "@/workflows/signal-processing-steps";

export async function signalProcessingWorkflow(runId: string) {
  "use workflow";
  try {
    return await processSignalEvidence(runId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown signal-processing failure";
    await failSignalProcessing(runId, message);
    return { runId, status: "failed" as const, error: message };
  }
}
