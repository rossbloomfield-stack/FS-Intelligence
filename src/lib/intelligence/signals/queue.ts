import "server-only";
import { createHash } from "node:crypto";
import { start } from "workflow/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { signalProcessingWorkflow } from "@/workflows/signal-processing";
import { OBSERVATION_SCHEMA_VERSION, OBSERVATION_PROMPT_VERSION } from "@/lib/intelligence/signals/observation-extractor";
import { getSignalIntelligenceConfig } from "@/lib/intelligence/signals/config";

export async function queueSignalProcessing(sourceItemId: string, trigger = "source_approval") {
  const config = getSignalIntelligenceConfig();
  if (!config.extractionEnabled) return { status: "disabled" as const, runId: null, workflowRunId: null };
  const db = createAdminClient();
  const { data: item, error } = await db.from("source_items")
    .select("id,item_key,content_hash,canonical_url,title,publication_date,effective_date,announcement_date,approved,metadata")
    .eq("id", sourceItemId).single();
  if (error || !item) throw new Error(`Source item is unavailable for signal processing: ${error?.message ?? "not found"}`);
  if (!item.approved) throw new Error("Signal processing requires an approved source item");
  const contentHash = item.content_hash || createHash("sha256").update(item.item_key).digest("hex");
  let { data: version } = await db.from("source_item_versions").select("id,version_number")
    .eq("source_item_id", sourceItemId).eq("content_hash", contentHash).maybeSingle();
  if (!version) {
    const { data: latest } = await db.from("source_item_versions").select("id,version_number")
      .eq("source_item_id", sourceItemId).order("version_number", { ascending: false }).limit(1).maybeSingle();
    const created = await db.from("source_item_versions").insert({
      source_item_id: sourceItemId,
      version_number: (latest?.version_number ?? 0) + 1,
      content_hash: contentHash,
      canonical_url: item.canonical_url,
      title: item.title,
      publication_date: item.publication_date,
      effective_date: item.effective_date,
      announcement_date: item.announcement_date,
      change_classification: asChangeClassification(item.metadata),
      previous_version_id: latest?.id ?? null,
      metadata: { trigger },
    }).select("id,version_number").single();
    if (created.error || !created.data) throw new Error(`Could not version source item: ${created.error?.message ?? "unknown error"}`);
    version = created.data;
  }
  const executionKey = `r3:${sourceItemId}:${contentHash}:${OBSERVATION_PROMPT_VERSION}`;
  const created = await db.from("signal_processing_runs").upsert({
    execution_key: executionKey,
    source_item_id: sourceItemId,
    document_version_id: version.id,
    stage: "evidence_ready",
    status: "queued",
    extraction_model: config.extractionModel,
    extraction_version: OBSERVATION_PROMPT_VERSION,
    schema_version: OBSERVATION_SCHEMA_VERSION,
    metadata: { trigger, versionNumber: version.version_number },
  }, { onConflict: "execution_key", ignoreDuplicates: true }).select("id,status").maybeSingle();
  if (created.error) throw new Error(`Could not queue signal processing: ${created.error.message}`);
  let run = created.data;
  if (!run) {
    const existing = await db.from("signal_processing_runs").select("id,status").eq("execution_key", executionKey).single();
    if (existing.error || !existing.data) throw new Error("Could not load existing signal-processing run");
    run = existing.data;
  }
  if (run.status === "completed" || run.status === "running") return { status: run.status, runId: run.id, workflowRunId: null };
  await db.from("signal_processing_runs").update({ status: "running", stage: "signal_eligibility", started_at: new Date().toISOString(), error_message: null }).eq("id", run.id).throwOnError();
  const workflow = await start(signalProcessingWorkflow, [run.id]);
  await db.from("signal_processing_runs").update({ metadata: { trigger, workflowRunId: workflow.runId, versionNumber: version.version_number } }).eq("id", run.id).throwOnError();
  return { status: "running" as const, runId: run.id, workflowRunId: workflow.runId };
}

function asChangeClassification(metadata: unknown): "none" | "cosmetic" | "minor" | "material" | "unknown" {
  const value = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? (metadata as Record<string, unknown>).changeClassification : null;
  return value === "none" || value === "cosmetic" || value === "minor" || value === "material" ? value : "unknown";
}
