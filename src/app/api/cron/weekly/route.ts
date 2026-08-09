import { start } from "workflow/api";
import { isDublinThursdayEight } from "@/lib/research/reporting-period";
import {
  attachWorkflowRun,
  prepareWeeklyReport,
} from "@/lib/research/start-report";
import { reportWorkflow } from "@/workflows/report";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    request.headers.get("authorization") !== `Bearer ${secret}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDublinThursdayEight()) {
    return Response.json({
      skipped: true,
      reason: "Outside Europe/Dublin schedule window",
    });
  }

  const prepared = await prepareWeeklyReport();
  if (prepared.duplicate) {
    return Response.json({ duplicate: true, reportRunId: null });
  }

  const run = await start(reportWorkflow, [prepared.input]);
  await attachWorkflowRun(prepared.reportRunId, run.runId);
  return Response.json(
    {
      duplicate: false,
      reportRunId: prepared.reportRunId,
      workflowRunId: run.runId,
    },
    { status: 202 },
  );
}
