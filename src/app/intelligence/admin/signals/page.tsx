import { SectionPage } from "@/components/intelligence/section-page";
import { SignalOperations } from "@/components/intelligence/admin/signal-operations";
import { fixtureMode } from "@/config/env";
import { requireAdmin } from "@/lib/supabase/auth";
import { getSignalOperationsStatus } from "@/lib/intelligence/signals/operations";
import { getSignalIntelligenceConfig } from "@/lib/intelligence/signals/config";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!getSignalIntelligenceConfig().adminReviewEnabled) notFound();
  if (!fixtureMode) await requireAdmin();
  const status = await getSignalOperationsStatus();
  return <SectionPage eyebrow="ADMIN · R3" title="Signal intelligence diagnostics" description="Operational quality, controlled backfill and the evidence-to-observation-to-signal audit trail."><SignalOperations initialStatus={status} /><section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5"><h2 className="text-lg font-semibold">Review policy</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Low-confidence extraction, ambiguous entities and missing anchors enter review rather than active intelligence. Accepted signals remain linked to exact source passages and retain revisions when assessments change.</p></section></SectionPage>;
}
