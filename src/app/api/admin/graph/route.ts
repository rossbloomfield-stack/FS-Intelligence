import { z } from "zod";
import { authenticateAdminRequest } from "@/lib/supabase/admin-api";
import { backfillKnowledgeGraph, queueR4SourceBackfill, refreshGraphOperationalMetrics, reviewRelationship } from "@/lib/intelligence/graph/operations";
import { getGraphOperationsStatus } from "@/lib/intelligence/graph/coverage";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("backfill_graph"), limit: z.number().int().min(1).max(20).default(10) }),
  z.object({ action: z.literal("queue_sources"), limit: z.number().int().min(1).max(50).default(20) }),
  z.object({
    action: z.literal("review_relationship"), relationshipId: z.string().uuid(),
    decision: z.enum(["confirm", "reject", "expire", "restore"]), note: z.string().trim().max(500).optional(),
  }),
  z.object({ action: z.literal("refresh_metrics") }),
]);

export async function GET() {
  const auth = await authenticateAdminRequest();
  if (!auth) return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json(await getGraphOperationsStatus(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await authenticateAdminRequest();
  if (!auth) return Response.json({ error: "Forbidden" }, { status: 403 });
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid graph operation" }, { status: 400 });
  const result = parsed.data.action === "backfill_graph"
    ? await backfillKnowledgeGraph(parsed.data.limit)
    : parsed.data.action === "queue_sources"
      ? await queueR4SourceBackfill(parsed.data.limit)
      : parsed.data.action === "review_relationship"
        ? await reviewRelationship({
          relationshipId: parsed.data.relationshipId, action: parsed.data.decision,
          actorId: auth.user.id, note: parsed.data.note,
        })
        : await refreshGraphOperationalMetrics();
  return Response.json(result, { status: 202, headers: { "Cache-Control": "no-store" } });
}
