import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ReportWorkflowInput } from "@/schemas/workflow";
import { previousSevenCompleteDays } from "./reporting-period";

type StartOptions = { rerun?: boolean; now?: Date };

export async function prepareWeeklyReport(options: StartOptions = {}) {
  const period = previousSevenCompleteDays(options.now);
  const db = createAdminClient();
  let version = 1;

  if (options.rerun) {
    const { data } = await db
      .from("report_runs")
      .select("version")
      .eq("period_start", period.periodStart)
      .eq("period_end", period.periodEnd)
      .order("version", { ascending: false })
      .limit(1);
    version = (data?.[0]?.version ?? 0) + 1;
  }

  const { data: row, error } = await db
    .from("report_runs")
    .insert({
      period_start: period.periodStart,
      period_end: period.periodEnd,
      report_date: period.reportDate,
      timezone: period.timezone,
      version,
      is_rerun: Boolean(options.rerun),
      status: "queued",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { duplicate: true as const, reportRunId: null, input: null };
    }
    throw error;
  }

  const input: ReportWorkflowInput = {
    reportRunId: row.id,
    ...period,
    researchModel: process.env.OPENAI_RESEARCH_MODEL ?? "gpt-5.6-terra",
    analysisModel: process.env.OPENAI_ANALYSIS_MODEL ?? "gpt-5.6-sol",
    synthesisModel: process.env.OPENAI_SYNTHESIS_MODEL ?? "gpt-5.6-sol",
    autoPublish: process.env.AUTO_PUBLISH_REPORTS === "true",
  };

  return { duplicate: false as const, reportRunId: row.id, input };
}

export async function attachWorkflowRun(reportRunId: string, workflowRunId: string) {
  await createAdminClient()
    .from("report_runs")
    .update({ workflow_run_id: workflowRunId })
    .eq("id", reportRunId)
    .throwOnError();
}

