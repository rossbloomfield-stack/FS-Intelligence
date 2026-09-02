import "server-only";
import { start } from "workflow/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { sourceIngestionWorkflow } from "@/workflows/source-ingestion";

export async function startQueuedSourceIngestion(limit: number) {
  const db = createAdminClient();
  const { data: claimed, error } = await db.rpc("claim_source_ingestion_runs", {
    p_limit: Math.max(1, Math.min(limit, 5)),
  });
  if (error) throw new Error(`Could not claim ingestion queue: ${error.message}`);

  const started: Array<{ runId: string; workflowRunId: string }> = [];
  const failures: Array<{ runId: string; error: string }> = [];
  for (const row of claimed ?? []) {
    try {
      const run = await start(sourceIngestionWorkflow, [row.id]);
      await db
        .from("source_ingestion_runs")
        .update({
          workflow_run_id: run.runId,
        })
        .eq("id", row.id)
        .throwOnError();
      started.push({ runId: row.id, workflowRunId: run.runId });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not start source-ingestion workflow";
      await db
        .from("source_ingestion_runs")
        .update({ status: "failed", completed_at: new Date().toISOString(), error_summary: message.slice(0, 1_000) })
        .eq("id", row.id);
      failures.push({ runId: row.id, error: message });
    }
  }
  return { claimed: (claimed ?? []).length, started, failures };
}
