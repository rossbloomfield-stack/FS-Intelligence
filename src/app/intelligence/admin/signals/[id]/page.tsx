import { notFound } from "next/navigation";
import { SectionPage } from "@/components/intelligence/section-page";
import { SignalReviewActions } from "@/components/intelligence/admin/signal-review-actions";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getSignalIntelligenceConfig } from "@/lib/intelligence/signals/config";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!getSignalIntelligenceConfig().adminReviewEnabled) notFound();
  const { id } = await params;
  await requireAdmin();
  const db = await createClient();
  const signalResult = await db.from("intelligence_signals").select("*").eq("id", id).maybeSingle();
  if (!signalResult.data) notFound();
  const signal = signalResult.data;
  const links = await db.from("intelligence_signal_observations").select("relationship,intelligence_observations(id,observation_text,evidence_text,review_status,raw_entity_text,entity_resolution_confidence,observation_type,event_date)").eq("signal_id", id);
  return <SectionPage eyebrow="ADMIN · SIGNAL REVIEW" title={signal.title} description={signal.summary}><div className="grid gap-5 xl:grid-cols-[.7fr_1.3fr]"><aside className="rounded-xl border border-[var(--line)] bg-white p-5"><p className="label text-[var(--purple)]">Assessment</p><p className="mt-3 text-sm leading-6">Confidence {Math.round(Number(signal.confidence_score ?? 0))}/100<br />Signal score {Math.round(Number(signal.signal_score ?? 0))}/100<br />Status {signal.status}<br />Independent sources {signal.independent_source_count}<br />Contradictions {signal.contradiction_count}</p><p className="mt-4 text-sm leading-6 text-[var(--muted)]">{signal.reasoning_summary}</p><div className="mt-5"><SignalReviewActions signalId={id} important={signal.important} dismissed={signal.status === "dismissed"} /></div></aside><section className="rounded-xl border border-[var(--line)] bg-white p-5"><h2 className="text-lg font-semibold">Observations</h2><div className="mt-3 space-y-3">{(links.data ?? []).map((link) => { const observation = first(link.intelligence_observations); return observation ? <article className="rounded-lg border border-[var(--line)] p-4" key={observation.id}><div className="flex flex-wrap justify-between gap-2 text-xs font-semibold text-[var(--purple)]"><span>{humanise(link.relationship)} · {humanise(observation.observation_type)}</span><span>{observation.review_status}</span></div><p className="mt-2 text-sm font-semibold">{observation.observation_text}</p><blockquote className="mt-2 border-l-2 border-purple-200 pl-3 text-sm text-[var(--muted)]">“{observation.evidence_text}”</blockquote><p className="mt-2 text-xs text-[var(--muted)]">Entity: {observation.raw_entity_text ?? "not stated"} · resolution {Math.round(Number(observation.entity_resolution_confidence ?? 0) * 100)}%</p></article> : null; })}</div></section></div></SectionPage>;
}

function first<T>(value: T | T[] | null | undefined): T | null { return Array.isArray(value) ? value[0] ?? null : value ?? null; }
function humanise(value: string) { return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
