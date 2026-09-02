import { authenticateAdminRequest } from "@/lib/supabase/admin-api";
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
  return Response.json(data?.[0] ?? { review_status: parsed.data.decision });
}
