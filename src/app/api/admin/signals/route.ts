import { authenticateAdminRequest } from "@/lib/supabase/admin-api";
import { getSignalOperationsStatus, queueSignalBackfill } from "@/lib/intelligence/signals/operations";
import { signalBackfillSchema } from "@/schemas/signal-intelligence";
import { getSignalIntelligenceConfig } from "@/lib/intelligence/signals/config";

export async function GET() {
  if (!getSignalIntelligenceConfig().adminReviewEnabled) return Response.json({ error: "Not found" }, { status: 404 });
  const admin = await authenticateAdminRequest();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json(await getSignalOperationsStatus());
}

export async function POST(request: Request) {
  if (!getSignalIntelligenceConfig().adminReviewEnabled) return Response.json({ error: "Not found" }, { status: 404 });
  const admin = await authenticateAdminRequest();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const parsed = signalBackfillSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  return Response.json(await queueSignalBackfill(parsed.data.limit, parsed.data.sourceClass), { status: 202 });
}
