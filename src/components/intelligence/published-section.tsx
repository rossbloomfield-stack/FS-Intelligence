import Link from "next/link";
import { ArrowUpRight, Clock3, Gauge, Radar, Scale, ShieldAlert, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { competitorFocus, findings, reportMeta, type MarketFinding } from "@/lib/market-report";
import { SectionPage } from "./section-page";

type View = "competitors" | "ai" | "regulation" | "customer" | "actions" | "sources" | "signals";

const copy: Record<View, { eyebrow: string; title: string; description: string }> = {
  competitors: { eyebrow: "COMPETITIVE LANDSCAPE", title: "Where the market is moving", description: "The current publicly stated focus of major financial-services firms in Ireland and the UK, with explicit Irish read-across." },
  ai: { eyebrow: "AI & TRANSFORMATION", title: "From pilots to production value", description: "Hard evidence, emerging signals and the operating-model choices shaping applied AI and modernisation." },
  regulation: { eyebrow: "REGULATORY RADAR", title: "From policy to proof", description: "The regulatory movements that change customer outcomes, operating models and board accountability." },
  customer: { eyebrow: "CUSTOMER SIGNALS", title: "Expectations are moving faster than products", description: "Observed and emerging changes in customer behaviour, trust, affordability, service and advice demand." },
  actions: { eyebrow: "STRATEGIC ACTIONS", title: "What an integrated Irish group should do next", description: "Prioritised actions tied directly to current market evidence and a practical first move." },
  sources: { eyebrow: "EVIDENCE LIBRARY", title: "Evidence behind the assessment", description: "Official and primary materials supporting this report, with interpretation kept separate from fact." },
  signals: { eyebrow: "SIGNALS & INDICATORS", title: "Hard evidence. Early indicators. Direction of travel.", description: "A consolidated view of signal strength, maturity and momentum across the latest report." },
};

async function latestReport() {
  try { const supabase = await createClient(); const { data } = await supabase.from("reports").select("slug,title,executive_headline,overall_assessment,published_at").eq("is_published", true).order("published_at", { ascending: false }).limit(1).maybeSingle(); return data; } catch { return null; }
}

function FindingCard({ item, index }: { item: MarketFinding; index: number }) {
  return <article className="finding-card">
    <div className="flex flex-wrap items-center gap-2">
      <span className={item.signalKind === "Hard signal" ? "signal-pill signal-hard" : "signal-pill signal-soft"}>{item.signalKind}</span>
      <span className="signal-pill">{item.strength} confidence</span><span className="signal-pill">{item.direction}</span>
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[42px_1fr_1fr]">
      <span className="finding-number">{String(index + 1).padStart(2, "0")}</span>
      <div><h2 className="text-xl font-semibold leading-snug">{item.title}</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.interpretation}</p></div>
      <div className="rounded-xl bg-[var(--paper)] p-4"><p className="label">STRATEGIC IMPLICATION</p><p className="mt-2 text-sm leading-6">{item.implication}</p><Link className="source-link" href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceLabel}<ArrowUpRight size={14}/></Link></div>
    </div>
  </article>;
}

function Competitors() {
  return <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric value={String(competitorFocus.length)} label="major firms mapped" icon={<Radar size={18}/>}/>
      <Metric value={String(competitorFocus.filter(x => x.market.includes("Ireland")).length)} label="active in Ireland" icon={<ShieldCheck size={18}/>}/>
      <Metric value={String(competitorFocus.filter(x => x.maturity === "Scaling").length)} label="scaling their focus" icon={<Gauge size={18}/>}/>
      <Metric value="4" label="market sectors" icon={<Radar size={18}/>}/>
    </div>
    <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
      <div className="overflow-x-auto"><table className="competitor-table"><thead><tr><th>Organisation</th><th>Market / sector</th><th>Current focus</th><th>Evidence assessment</th><th>Irish read-across</th></tr></thead><tbody>{competitorFocus.map(item => <tr key={item.organisation}><td><Link href={item.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-[var(--purple)]">{item.organisation}<ArrowUpRight className="ml-1 inline" size={13}/></Link><span className={`mt-2 block w-fit signal-pill ${item.maturity === "Scaling" ? "signal-hard" : ""}`}>{item.maturity}</span></td><td><span className="font-medium">{item.market}</span><span className="mt-1 block text-xs text-[var(--muted)]">{item.sector}</span></td><td className="min-w-72 font-medium">{item.focus}</td><td className="min-w-72 text-[var(--muted)]">{item.evidence}</td><td className="min-w-72">{item.irishReadAcross}</td></tr>)}</tbody></table></div>
    </div>
    <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Focus statements are analyst synthesis of linked official corporate materials, reviewed 9 August 2026. They describe strategic emphasis, not proof that every initiative has been completed. The map covers major institutions and challengers material to Irish market analysis; it is not a legal-entity census.</p>
  </>;
}

const regulatoryMetadata = [
  { title:"Operational resilience has entered the evidence phase", relevance:96, urgency:94, horizon:"Immediate", status:"In force · supervisory evidence", affected:"All regulated financial firms", response:"Validate important-business-service tolerances, third-party dependencies and board evidence." },
  { title:"Consumer protection is becoming an outcomes discipline", relevance:92, urgency:86, horizon:"Within three months", status:"Implementation · outcomes focus", affected:"Retail banks, insurers, investment and advice firms", response:"Prove fair value, understanding and support outcomes by product, segment and channel." },
  { title:"AI accountability will extend into model supply chains", relevance:86, urgency:72, horizon:"Within 12 months", status:"Emerging · prepare", affected:"Firms deploying or procuring automated decision systems", response:"Build one accountable inventory connecting models, vendors, data, decisions and redress." },
] as const;

function RegulationRadar() {
  const trends = regulatoryMetadata.map(meta => {
    const finding = findings.regulation.find(item => item.title === meta.title)!;
    return { ...meta, finding, priority:Math.round((meta.relevance * .6) + (meta.urgency * .4)) };
  }).sort((a,b) => b.priority-a.priority);
  return <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric value={String(trends.length)} label="material regulatory trends" icon={<Scale size={18}/>}/>
      <Metric value={String(trends.filter(item => item.urgency >= 85).length)} label="urgent executive responses" icon={<Clock3 size={18}/>}/>
      <Metric value={`${trends[0].priority}/100`} label="highest combined priority" icon={<ShieldAlert size={18}/>}/>
      <Metric value="100%" label="linked to official evidence" icon={<ShieldCheck size={18}/>}/>
    </div>
    <div className="mt-6 space-y-4">{trends.map((item,index) => <article className={`regulatory-trend ${index===0 ? "regulatory-trend-primary" : ""}`} key={item.title}>
      <div className="regulatory-priority"><span>PRIORITY</span><strong>{item.priority}</strong><small>combined score</small></div>
      <div><div className="flex flex-wrap items-center gap-2"><span className="theme-pill">{item.finding.direction}</span><span className="signal-pill signal-hard">{item.status}</span><span className="signal-pill">{item.horizon}</span></div><h2 className="mt-3 text-xl font-semibold leading-snug">{item.title}</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.finding.interpretation}</p><p className="mt-3 text-xs text-[var(--muted)]"><strong className="text-[var(--ink)]">Affected:</strong> {item.affected}</p></div>
      <div><div className="grid grid-cols-2 gap-3"><ScoreGauge label="Relevance" score={item.relevance}/><ScoreGauge label="Urgency" score={item.urgency}/></div><div className="mt-3 rounded-xl bg-[var(--paper)] p-4"><p className="label text-[var(--orange)]">REQUIRED RESPONSE</p><p className="mt-2 text-sm leading-6">{item.response}</p><Link className="source-link" href={item.finding.sourceUrl} target="_blank" rel="noreferrer">{item.finding.sourceLabel}<ArrowUpRight size={14}/></Link></div></div>
    </article>)}</div>
    <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Combined priority = 60% strategic relevance + 40% urgency. Relevance reflects likely customer, operating-model, commercial and board-accountability impact in Ireland. Urgency reflects regulatory maturity and the practical lead time required to respond. Scores support prioritisation; they do not replace legal interpretation.</p>
  </>;
}

function ScoreGauge({label,score}:{label:string;score:number}) { return <div className="score-gauge"><div className="flex items-center justify-between"><span>{label}</span><strong>{score}</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-[var(--purple)]" style={{width:`${score}%`}}/></div></div>; }

function Metric({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) { return <div className="rounded-xl border border-[var(--line)] bg-white p-4"><div className="flex items-center justify-between"><strong className="text-2xl">{value}</strong><span className="text-[var(--orange)]">{icon}</span></div><p className="mt-1 text-xs text-[var(--muted)]">{label}</p></div>; }

export async function PublishedSection({ view }: { view: View }) {
  const report = await latestReport();
  const page = copy[view];
  const allFindings = [...findings.ai, ...findings.regulation, ...findings.customer];
  const sectionFindings = view === "signals" || view === "sources" ? allFindings : view === "competitors" ? [] : findings[view];
  const uniqueSources = Array.from(new Map(allFindings.map(item => [item.sourceUrl, item])).values());

  return <SectionPage {...page}>
    <div className="report-context"><div><p className="label text-purple-200">LATEST PUBLISHED ASSESSMENT</p><p className="mt-2 max-w-4xl text-lg font-semibold text-white">{report?.executive_headline ?? reportMeta.headline}</p></div><div className="text-sm text-purple-100">{reportMeta.period}</div></div>
    {view === "competitors" ? <Competitors/> : view === "regulation" ? <RegulationRadar/> : view === "sources" ? <div className="mt-6 grid gap-4 md:grid-cols-2">{uniqueSources.map(item => <article className="rounded-xl border border-[var(--line)] p-5" key={item.sourceUrl}><p className="label">PRIMARY / OFFICIAL EVIDENCE</p><h2 className="mt-2 font-semibold">{item.sourceLabel}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Supports: {item.title}</p><Link className="source-link" href={item.sourceUrl} target="_blank" rel="noreferrer">Open source<ArrowUpRight size={14}/></Link></article>)}</div> : <div className="mt-6 space-y-4">{sectionFindings.map((item, index) => <FindingCard key={`${view}-${item.title}`} item={item} index={index}/>)}</div>}
    <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-[var(--line)] pt-5"><p className="mr-auto max-w-3xl text-sm text-[var(--muted)]">{report?.overall_assessment ?? reportMeta.assessment}</p>{report && <Link className="rounded-lg bg-[var(--purple)] px-4 py-2 text-sm font-semibold text-white" href={`/intelligence/reports/${report.slug}`}>Open full report</Link>}</div>
  </SectionPage>;
}
