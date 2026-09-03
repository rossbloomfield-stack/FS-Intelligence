import { authenticateAdminRequest } from "@/lib/supabase/admin-api";
import { backfillApprovedEmbeddings } from "@/lib/intelligence/embedding-backfill";
import { reviewSourceItemSchema } from "@/schemas/source-ingestion";

export async function POST(request: Request) {
  const admin = await authenticateAdminRequest();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const parsed = reviewSourceItemSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const { data, error } = await admin.db.rpc("review_source_item", {
    p_item_id: parsed.data.itemId,
    p_decision: parsed.data.decision,
    p_reason: parsed.data.reason ?? null,
    p_publication_date: parsed.data.publicationDate ?? null,
  });
  if (error) return Response.json({ error: error.message }, { status: 409 });
  const review = data?.[0] ?? { review_status: parsed.data.decision };
  const embeddings =
    parsed.data.decision === "approve"
      ? await backfillApprovedEmbeddings(20).catch((error) => ({
          status: "failed" as const,
          processed: 0,
          error: error instanceof Error ? error.message : String(error),
        }))
      : null;
  return Response.json({ ...review, embeddings });
}
