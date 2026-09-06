import { authenticateAdminRequest } from "@/lib/supabase/admin-api";
import { queueSignalProcessing } from "@/lib/intelligence/signals/queue";
import { signalReviewActionSchema } from "@/schemas/signal-intelligence";
import { getSignalIntelligenceConfig } from "@/lib/intelligence/signals/config";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!getSignalIntelligenceConfig().adminReviewEnabled) return Response.json({ error: "Not found" }, { status: 404 });
  const admin = await authenticateAdminRequest();
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const parsed = signalReviewActionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const { action, targetSignalId, observationId, entityId, note } = parsed.data;
  const before = await admin.db.from("intelligence_signals").select("*").eq("id", id).single();
  if (before.error || !before.data) return Response.json({ error: "Signal not found" }, { status: 404 });
  if (action === "mark_important" || action === "unmark_important") {
    await admin.db.from("intelligence_signals").update({ important: action === "mark_important" }).eq("id", id).throwOnError();
  } else if (action === "dismiss" || action === "restore") {
    await admin.db.from("intelligence_signals").update({ status: action === "dismiss" ? "dismissed" : "active", approved: action !== "dismiss" }).eq("id", id).throwOnError();
  } else if (action === "correct_entity") {
    if (!entityId) return Response.json({ error: "entityId is required" }, { status: 400 });
    await admin.db.from("intelligence_signals").update({ primary_entity_id: entityId, entity_ids: [entityId] }).eq("id", id).throwOnError();
  } else if (action === "reject_observation" || action === "detach_observation") {
    if (!observationId) return Response.json({ error: "observationId is required" }, { status: 400 });
    if (action === "reject_observation") await admin.db.from("intelligence_observations").update({ review_status: "rejected", rejection_reason: note ?? "Rejected by analyst" }).eq("id", observationId).throwOnError();
    await admin.db.from("intelligence_signal_observations").delete().eq("signal_id", id).eq("observation_id", observationId).throwOnError();
  } else if (action === "merge_signal") {
    if (!targetSignalId || targetSignalId === id) return Response.json({ error: "A different targetSignalId is required" }, { status: 400 });
    const links = await admin.db.from("intelligence_signal_observations").select("observation_id,relationship,support_strength").eq("signal_id", id);
    await admin.db.from("intelligence_signal_observations").upsert((links.data ?? []).map((link) => ({ ...link, signal_id: targetSignalId })), { onConflict: "signal_id,observation_id" }).throwOnError();
    await admin.db.from("intelligence_signals").update({ status: "superseded", approved: false, supersedes_signal_id: targetSignalId }).eq("id", id).throwOnError();
  } else if (action === "rerun_extraction") {
    const links = await admin.db.from("intelligence_signal_observations").select("intelligence_observations(document_id)").eq("signal_id", id).limit(1);
    const documentId = first(first(links.data)?.intelligence_observations)?.document_id;
    if (!documentId) return Response.json({ error: "No source document is linked" }, { status: 409 });
    const rerun = await queueSignalProcessing(documentId, "analyst_rerun");
    return Response.json({ action, rerun });
  }
  const after = await admin.db.from("intelligence_signals").select("*").eq("id", id).single();
  await admin.db.from("intelligence_signal_review_events").insert({ signal_id: id, observation_id: observationId ?? null, actor_id: admin.user.id, action, previous_value: before.data, next_value: after.data ?? null }).throwOnError();
  return Response.json({ action, signal: after.data });
}

function first<T>(value: T | T[] | null | undefined): T | null { return Array.isArray(value) ? value[0] ?? null : value ?? null; }
