import { start } from "workflow/api";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  attachWorkflowRun,
  prepareWeeklyReport,
} from "@/lib/research/start-report";
import { reportWorkflow } from "@/workflows/report";

const inputSchema = z.object({ rerun: z.boolean().default(false) });

export async function POST(request: Request) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user || user.app_metadata.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const prepared = await prepareWeeklyReport(parsed.data);
  if (prepared.duplicate) {
    return Response.json(
      { duplicate: true, reportRunId: null },
      { status: 409 },
    );
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

