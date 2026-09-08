import { start } from "workflow/api";
import { isDublinEight } from "@/lib/research/reporting-period";
import {
  attachWorkflowRun,
  prepareWeeklyReport,
} from "@/lib/research/start-report";
import { reportWorkflow } from "@/workflows/report";
import { startQueuedSourceIngestion } from "@/lib/intelligence/ingestion/start-queued";
import { promoteTrustedPrimaryEvidence } from "@/lib/intelligence/ingestion/trusted-primary";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const trustedEvidence = await promoteTrustedPrimaryEvidence(25).catch((error) => ({
    requested: 25,
    promoted: [],
    error: error instanceof Error ? error.message : "Trusted evidence promotion unavailable",
  }));
  const ingestion = await startQueuedSourceIngestion(5);
  if (!isDublinEight()) {
    return Response.json({
      skipped: true,
      reason: "Outside the 08:00 Europe/Dublin schedule window",
      ingestion,
      trustedEvidence,
    });
  }

  const prepared = await prepareWeeklyReport({ autoPublish: true });
  if (prepared.duplicate) {
    return Response.json({ duplicate: true, reportRunId: null, ingestion, trustedEvidence });
  }

  const run = await start(reportWorkflow, [prepared.input]);
  await attachWorkflowRun(prepared.reportRunId, run.runId);
  return Response.json(
    {
      duplicate: false,
      reportRunId: prepared.reportRunId,
      workflowRunId: run.runId,
      ingestion,
      trustedEvidence,
    },
    { status: 202 },
  );
}
