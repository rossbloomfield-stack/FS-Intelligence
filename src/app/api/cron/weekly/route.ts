import { start } from "workflow/api";
import { isDublinEight } from "@/lib/research/reporting-period";
import {
  attachWorkflowRun,
  prepareWeeklyReport,
} from "@/lib/research/start-report";
import { reportWorkflow } from "@/workflows/report";
import { startQueuedSourceIngestion } from "@/lib/intelligence/ingestion/start-queued";
import { startDueSourceDiscovery } from "@/lib/intelligence/ingestion/start-discovery";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ingestion = await startQueuedSourceIngestion(2);
  if (!isDublinEight()) {
    return Response.json({
      skipped: true,
      reason: "Outside the 08:00 Europe/Dublin schedule window",
      ingestion,
      discovery: null,
    });
  }

  const discovery = await startDueSourceDiscovery(4);
  const prepared = await prepareWeeklyReport({ autoPublish: true });
  if (prepared.duplicate) {
    return Response.json({
      duplicate: true,
      reportRunId: null,
      ingestion,
      discovery,
    });
  }

  const run = await start(reportWorkflow, [prepared.input]);
  await attachWorkflowRun(prepared.reportRunId, run.runId);
  return Response.json(
    {
      duplicate: false,
      reportRunId: prepared.reportRunId,
      workflowRunId: run.runId,
      ingestion,
      discovery,
    },
    { status: 202 },
  );
}
