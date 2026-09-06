import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionPage } from "@/components/intelligence/section-page";
import { createClient } from "@/lib/supabase/server";
import { getSignalIntelligenceConfig } from "@/lib/intelligence/signals/config";

export const metadata: Metadata = { title: "Strategic Signals", description: "Evidence-grounded financial-services signals, movement, confidence and Irish relevance.", alternates: { canonical: "/intelligence/signals" } };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!getSignalIntelligenceConfig().signalDetailEnabled) notFound();
  const params = await searchParams;
  const movement = value(params.movement, "all");
  const kind = value(params.kind, "all");
  const timeframe = value(params.timeframe, "12 weeks");
  const confidence = value(params.confidence, "all");
  const supabase = await createClient();
  let query = supabase.from("intelligence_signals")
    .select("id,title,summary,signal_type,status,direction,event_date,last_observed_at,confidence_score,strategic_relevance,novelty,magnitude,momentum,signal_score,corroboration_count,independent_source_count,contradiction_count,themes,geographies,reasoning_summary,intelligence_signal_observations!inner(observation_id)")
    .eq("approved", true).in("status", ["emerging", "active", "confirmed", "mature", "contradicted"])
    .order("signal_score", { ascending: false }).limit(100);
  const start = timeframeStart(timeframe);
  if (start) query = query.gte("last_observed_at", start);
  if (kind !== "all") query = query.eq("signal_type", kind.toLowerCase().startsWith("hard") ? "hard" : "soft");
  if (movement !== "all") query = query.eq("direction", movementDirection(movement));
  if (confidence !== "all") query = query.gte("confidence_score", confidence === "Very high" ? 85 : confidence === "High" ? 70 : confidence === "Moderate" ? 50 : 0);
  const result = await query;
  const rows = result.data ?? [];
  return <SectionPage eyebrow="SIGNAL INTELLIGENCE" title="Signals strengthening now" description="Reusable market assessments built from traceable observations. Confidence reflects evidence quality; signal score prioritises attention rather than predicting outcomes.">
    <form className="flex flex-wrap gap-3 rounded-2xl border border-[var(--line)] bg-white p-4">
      <Filter name="movement" value={movement} options={["all", "New", "Increasing", "Expanding", "Stable", "Mixed"]} />
      <Filter name="kind" value={kind} options={["all", "Hard signal", "Soft signal"]} />
      <Filter name="confidence" value={confidence} options={["all", "Very high", "High", "Moderate"]} />
      <Filter name="timeframe" value={timeframe} options={["This week", "4 weeks", "12 weeks", "6 months", "All"]} />
      <button className="rounded-lg bg-[var(--purple)] px-4 py-2 text-sm font-semibold text-white">Apply filters</button>
    </form>
    {result.error ? <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">Signal intelligence is temporarily unavailable. Underlying evidence retrieval remains active.</p> : null}
    {!result.error && !rows.length ? <p className="mt-5 rounded-xl border border-[var(--line)] bg-white p-5 text-sm text-[var(--muted)]">No accepted signal matches these filters. Original evidence remains searchable in Ask Intelligence.</p> : null}
    <div className="mt-5 space-y-4">{rows.map((signal, index) => <article className="finding-card" key={signal.id}>
      <div className="flex flex-wrap gap-2"><span className={signal.signal_type === "hard" ? "signal-pill signal-hard" : "signal-pill signal-soft"}>{signal.signal_type === "hard" ? "Hard signal" : "Soft signal"}</span><span className="signal-pill">{directionLabel(signal.direction)}</span><span className="signal-pill">{confidenceLabel(Number(signal.confidence_score ?? 0))} confidence</span>{signal.status === "contradicted" || signal.contradiction_count > 0 ? <span className="signal-pill">Mixed evidence</span> : null}</div>
      <div className="mt-4 grid gap-5 lg:grid-cols-[2.5rem_1fr_.7fr]"><span className="finding-number">{index + 1}</span><div><h2 className="text-xl font-semibold"><Link href={`/intelligence/signals/${signal.id}`}>{signal.title}</Link></h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{signal.summary}</p><p className="mt-3 text-xs text-[var(--muted)]">{signal.themes?.map(humanise).join(" · ") || "Unclassified theme"} · last observed {formatDate(signal.last_observed_at ?? signal.event_date)}</p></div><div className="rounded-xl bg-[var(--paper)] p-4"><p className="label text-[var(--orange)]">EVIDENCE FOOTPRINT</p><p className="mt-2 text-sm leading-6">{Math.max(1, signal.corroboration_count + 1)} observations · {signal.independent_source_count} independent sources</p><p className="mt-2 text-sm">Signal score <strong>{Math.round(Number(signal.signal_score ?? 0))}/100</strong></p><p className="mt-3 text-xs text-[var(--muted)]">{signal.reasoning_summary ?? "Scoring explanation available in signal detail."}</p></div></div>
    </article>)}</div>
  </SectionPage>;
}

function Filter({ name, value, options }: { name: string; value: string; options: string[] }) { return <label className="text-xs font-semibold">{humanise(name)}<select className="ml-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2" name={name} defaultValue={value}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function value(input: string | string[] | undefined, fallback: string) { return typeof input === "string" ? input : fallback; }
function movementDirection(input: string) { return ({ New: "new", Increasing: "increasing", Expanding: "expanding", Stable: "stable", Mixed: "mixed" } as Record<string, string>)[input] ?? input.toLowerCase(); }
function directionLabel(input: string | null) { return ({ new: "NEW", increasing: "↑ INCREASING", expanding: "↑ EXPANDING", decreasing: "↓ DECREASING", contracting: "↓ CONTRACTING", stable: "→ STABLE", mixed: "↔ MIXED", up: "↑ STRENGTHENING", unchanged: "→ UNCHANGED", down: "↓ WEAKENING" } as Record<string, string>)[input ?? ""] ?? "DIRECTION UNKNOWN"; }
function confidenceLabel(input: number) { return input >= 85 ? "Very high" : input >= 70 ? "High" : input >= 50 ? "Moderate" : input >= 30 ? "Low" : "Very low"; }
function timeframeStart(input: string) { const days = ({ "This week": 7, "4 weeks": 28, "12 weeks": 84, "6 months": 183 } as Record<string, number>)[input]; return days ? new Date(Date.now() - days * 86_400_000).toISOString() : null; }
function formatDate(input: string | null) { return input ? new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(input)) : "date unavailable"; }
function humanise(input: string) { return input.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
