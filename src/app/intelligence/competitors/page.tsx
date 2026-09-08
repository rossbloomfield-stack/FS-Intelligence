import type { Metadata } from "next";
import Link from "next/link";
import { SectionPage } from "@/components/intelligence/section-page";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Competitor Intelligence",
  description: "Entity-first strategic intelligence on material financial-services competitors across Ireland and comparator markets.",
  alternates: { canonical: "/intelligence/competitors" },
};

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.toLowerCase() : "";
  const sector = typeof params.sector === "string" ? params.sector : "all";
  const market = typeof params.market === "string" ? params.market : "all";
  const trend = typeof params.trend === "string" ? params.trend : "all";
  const db = await createClient();
  const [organisationsResult, entitiesResult, signalsResult] = await Promise.all([
    db.from("organisations").select("id,slug,name,sector,jurisdiction,organisation_type,is_irish").eq("active", true).order("name"),
    db.from("intelligence_entities").select("id,organisation_id,canonical_name,primary_geography").eq("entity_type", "organisation").eq("active", true),
    db.from("intelligence_signals").select("id,title,summary,direction,status,confidence_score,signal_score,strategic_relevance,last_observed_at,entity_ids,themes")
      .eq("approved", true).in("status", ["emerging", "active", "confirmed", "mature", "contradicted"])
      .order("signal_score", { ascending: false }).limit(250),
  ]);
  if (organisationsResult.error || entitiesResult.error || signalsResult.error) throw new Error("Could not load competitor intelligence.");
  const entityByOrganisation = new Map((entitiesResult.data ?? []).flatMap((entity) => entity.organisation_id ? [[entity.organisation_id, entity] as const] : []));
  const rows = (organisationsResult.data ?? []).map((organisation) => {
    const entity = entityByOrganisation.get(organisation.id);
    const signals = entity ? (signalsResult.data ?? []).filter((signal) => signal.entity_ids?.includes(entity.id)) : [];
    return { ...organisation, entity, signals, topSignal: signals[0] ?? null };
  }).filter((item) =>
    (!query || `${item.name} ${item.topSignal?.title ?? ""} ${item.topSignal?.summary ?? ""}`.toLowerCase().includes(query)) &&
    (sector === "all" || item.sector === sector) &&
    (market === "all" || item.jurisdiction === market) &&
    (trend === "all" || item.topSignal?.direction === trend),
  ).sort((a, b) => Number(b.topSignal?.signal_score ?? 0) - Number(a.topSignal?.signal_score ?? 0) || a.name.localeCompare(b.name));
  const sectors = [...new Set((organisationsResult.data ?? []).map((item) => item.sector))].sort();
  const markets = [...new Set((organisationsResult.data ?? []).map((item) => item.jurisdiction).filter((value): value is string => Boolean(value)))].sort();
  const trends = [...new Set((signalsResult.data ?? []).map((item) => item.direction).filter((value): value is string => Boolean(value)))].sort();
  return (
    <SectionPage eyebrow="COMPETITOR INTELLIGENCE" title="Where competitive pressure is building" description="Living company dossiers derived from accepted observations, scored signals and evidence-backed relationships.">
      <form className="grid gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 md:grid-cols-4" role="search">
        <input aria-label="Search organisations" className="min-h-11 rounded-lg border border-[var(--line)] px-3 py-2" name="q" defaultValue={query} placeholder="Search organisations" />
        <Select name="sector" label="Sector" value={sector} options={["all", ...sectors]} />
        <Select name="market" label="Market" value={market} options={["all", ...markets]} />
        <div className="flex gap-2"><Select name="trend" label="Movement" value={trend} options={["all", ...trends]} /><button className="min-h-11 rounded-lg bg-[var(--purple)] px-4 py-2 text-sm font-semibold text-white">Apply</button></div>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">{rows.length} organisations · sorted by strongest current signal</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {rows.map((item) => (
          <article className="rounded-2xl border border-[var(--line)] bg-white p-5" key={item.id}>
            <div className="flex items-start justify-between gap-4">
              <div><p className="label text-[var(--orange)]">{item.sector} · {item.jurisdiction ?? "Market not classified"}</p><h2 className="mt-2 text-xl font-semibold"><Link className="text-[var(--purple)]" href={`/intelligence/organisations/${item.slug}`}>{item.name}</Link></h2></div>
              <span className="rounded-full bg-purple-50 px-3 py-2 text-xs font-bold text-[var(--purple)]">{item.signals.length} signal{item.signals.length === 1 ? "" : "s"}</span>
            </div>
            {item.topSignal ? <>
              <p className="mt-4 font-semibold leading-6">{item.topSignal.title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.topSignal.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2"><span className="signal-pill">{humanise(item.topSignal.direction ?? item.topSignal.status)}</span><span className="signal-pill">{confidenceLabel(Number(item.topSignal.confidence_score ?? 0))} confidence</span></div>
              <p className="mt-3 text-xs text-[var(--muted)]">Last observed {formatDate(item.topSignal.last_observed_at)}</p>
            </> : <p className="mt-4 text-sm leading-6 text-[var(--muted)]">No material verified development identified in the accepted intelligence base. Open the dossier to inspect coverage.</p>}
            <Link className="mt-4 inline-flex text-sm font-semibold text-[var(--purple)]" href={`/intelligence/organisations/${item.slug}`}>Open company intelligence →</Link>
          </article>
        ))}
      </div>
    </SectionPage>
  );
}

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: string[] }) {
  return <label className="text-xs font-semibold text-[var(--muted)]">{label}<select className="mt-1 min-h-11 w-full rounded-lg border border-[var(--line)] bg-white px-3 text-sm text-[var(--ink)]" name={name} defaultValue={value}>{options.map((option) => <option key={option} value={option}>{option === "all" ? `All ${label.toLowerCase()}` : humanise(option)}</option>)}</select></label>;
}
function humanise(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase()); }
function confidenceLabel(value: number) { return value >= 85 ? "Very high" : value >= 70 ? "High" : value >= 50 ? "Moderate" : value >= 30 ? "Low" : "Very low"; }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("en-IE", { dateStyle: "medium" }).format(new Date(value)) : "not established"; }
