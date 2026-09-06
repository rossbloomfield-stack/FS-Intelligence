import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { SectionPage } from "@/components/intelligence/section-page";
import { createClient } from "@/lib/supabase/server";
import { getSignalIntelligenceConfig } from "@/lib/intelligence/signals/config";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!getSignalIntelligenceConfig().signalDetailEnabled) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const signalResult = await supabase.from("intelligence_signals").select("*,intelligence_signal_observations!inner(observation_id)").eq("id", id).eq("approved", true).maybeSingle();
  if (!signalResult.data) notFound();
  const signal = signalResult.data;
  const links = await supabase.from("intelligence_signal_observations")
    .select("relationship,support_strength,intelligence_observations(id,observation_text,evidence_text,evidence_section_label,evidence_page_number,event_date,published_at,observation_type,theme,source_authority,is_primary_source,source_id,evidence_chunk_id,source_items!intelligence_observations_document_id_fkey(title,canonical_url),source_chunks!intelligence_observations_evidence_chunk_id_fkey(section_label,page_number))")
    .eq("signal_id", id).order("added_at", { ascending: false });
  const observations = (links.data ?? []).map((link) => ({ ...link, observation: first(link.intelligence_observations) })).filter((item) => item.observation);
  return <SectionPage eyebrow="MARKET SIGNAL" title={signal.title} description={signal.summary}>
    <div className="grid gap-5 xl:grid-cols-[.7fr_1.3fr]"><aside className="rounded-2xl border border-[var(--line)] bg-white p-6"><h2 className="text-xl font-semibold">Assessment</h2><dl className="mt-4 divide-y divide-[var(--line)] text-sm"><Metric label="Confidence" value={`${confidenceLabel(Number(signal.confidence_score ?? 0))} · ${Math.round(Number(signal.confidence_score ?? 0))}/100`} /><Metric label="Strategic relevance" value={`${Math.round(Number(signal.strategic_relevance ?? 0) * 100)}/100`} /><Metric label="Novelty" value={`${Math.round(Number(signal.novelty ?? 0) * 100)}/100`} /><Metric label="Magnitude" value={humanise(signal.magnitude ?? "unknown")} /><Metric label="Momentum" value={`${Math.round(Number(signal.momentum ?? 0) * 100)}/100`} /><Metric label="Signal score" value={`${Math.round(Number(signal.signal_score ?? 0))}/100`} /></dl><h2 className="mt-7 text-xl font-semibold">Why this score</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{signal.reasoning_summary ?? "No scoring explanation has been recorded."}</p><p className="mt-4 text-xs text-[var(--muted)]">Signal score prioritises attention; it is not a prediction probability.</p></aside>
      <section className="rounded-2xl border border-[var(--line)] bg-white p-6"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold">Traceable evidence</h2><span className="signal-pill">{signal.independent_source_count} independent sources</span></div><div className="mt-5 space-y-4">{observations.map(({ relationship, observation }) => { if (!observation) return null; const item = first(observation.source_items); const chunk = first(observation.source_chunks); const sectionLabel = chunk?.section_label ?? observation.evidence_section_label; const pageNumber = chunk?.page_number ?? observation.evidence_page_number; return <article className={`rounded-xl border p-4 ${relationship === "contradictory" ? "border-red-200 bg-red-50/40" : "border-[var(--line)]"}`} key={observation.id}><div className="flex flex-wrap items-center justify-between gap-2"><span className="label text-[var(--purple)]">{humanise(relationship)} · {humanise(observation.observation_type)}</span><span className="text-xs text-[var(--muted)]">{formatDate(observation.event_date ?? observation.published_at)}</span></div><p className="mt-3 font-semibold leading-6">{observation.observation_text}</p><blockquote className="mt-3 border-l-2 border-purple-200 pl-4 text-sm leading-6 text-[var(--muted)]">“{observation.evidence_text}”</blockquote><div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]"><span>{observation.is_primary_source ? "Primary evidence" : "Secondary evidence"}</span>{sectionLabel ? <span>{sectionLabel}{pageNumber ? ` · page ${pageNumber}` : ""}</span> : null}{item?.canonical_url ? <a className="inline-flex items-center gap-1 font-semibold text-[var(--purple)]" href={item.canonical_url} target="_blank" rel="noreferrer">Open source <ExternalLink size={12} /></a> : null}</div></article>; })}</div>{!observations.length ? <p className="mt-5 text-sm text-[var(--muted)]">No accepted observation lineage is available.</p> : null}</section></div>
    <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold"><Link href="/intelligence/signals">← All signals</Link><Link href={`/intelligence?contextType=signal&contextId=${id}&contextLabel=${encodeURIComponent(signal.title)}&prompt=${encodeURIComponent(`What does this signal mean: ${signal.title}?`)}`}>Ask Intelligence about this →</Link></div>
  </SectionPage>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 py-3"><dt>{label}</dt><dd className="font-semibold text-[var(--purple)]">{value}</dd></div>; }
function first<T>(value: T | T[] | null | undefined): T | null { return Array.isArray(value) ? value[0] ?? null : value ?? null; }
function confidenceLabel(input: number) { return input >= 85 ? "Very high" : input >= 70 ? "High" : input >= 50 ? "Moderate" : input >= 30 ? "Low" : "Very low"; }
function humanise(input: string) { return input.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
function formatDate(input: string | null) { return input ? new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(input)) : "Date unavailable"; }
