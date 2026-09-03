import "server-only";
import { start } from "workflow/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { sourceDiscoveryWorkflow } from "@/workflows/source-discovery";

export async function startDueSourceDiscovery(limit: number, now = new Date()) {
  const db = createAdminClient();
  const discoveryDate = dublinDate(now);
  const { data: claimed, error } = await db.rpc("claim_source_discovery_runs", {
    p_limit: Math.max(1, Math.min(limit, 8)),
    p_discovery_date: discoveryDate,
  });
  if (error)
    throw new Error(`Could not claim source discovery: ${error.message}`);
  const started: Array<{
    runId: string;
    connectorId: number;
    workflowRunId: string;
  }> = [];
  const failures: Array<{ runId: string; error: string }> = [];
  for (const row of claimed ?? []) {
    try {
      const run = await start(sourceDiscoveryWorkflow, [row.id]);
      await db
        .from("source_ingestion_runs")
        .update({ workflow_run_id: run.runId })
        .eq("id", row.id)
        .throwOnError();
      started.push({
        runId: row.id,
        connectorId: row.connector_id,
        workflowRunId: run.runId,
      });
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Could not start source-discovery workflow";
      await db
        .from("source_ingestion_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_summary: message.slice(0, 1_000),
        })
        .eq("id", row.id);
      failures.push({ runId: row.id, error: message });
    }
  }
  return { discoveryDate, claimed: (claimed ?? []).length, started, failures };
}

function dublinDate(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Dublin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
