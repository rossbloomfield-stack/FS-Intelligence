import { authenticateAdminRequest } from "@/lib/supabase/admin-api";
import { startQueuedSourceIngestion } from "@/lib/intelligence/ingestion/start-queued";
import { getIngestionOperationsStatus } from "@/lib/intelligence/ingestion/operations";
import { startSourceIngestionSchema } from "@/schemas/source-ingestion";

export async function GET() {
  const admin = await authenticateAdminRequest();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json(await getIngestionOperationsStatus());
}

export async function POST(request: Request) {
  const admin = await authenticateAdminRequest();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const parsed = startSourceIngestionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const result = await startQueuedSourceIngestion(parsed.data.limit);
  return Response.json(result, { status: result.started.length ? 202 : 200 });
}
