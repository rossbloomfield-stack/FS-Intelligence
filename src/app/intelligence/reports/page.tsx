import Link from "next/link";
import { ArrowUpRight, CalendarDays, CircleAlert, Gauge, Target } from "lucide-react";
import { z } from "zod";
import { SectionPage } from "@/components/intelligence/section-page";
import { findings, reportMeta } from "@/lib/market-report";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const baselineSchema = z.object({
  generationMode: z.literal("editorial_baseline"),
  periodStart: z.iso.date().optional(),
  periodEnd: z.iso.date().optional(),
  developments: z.array(z.object({
    title: z.string(), status: z.string(), eventDate: z.iso.date(), publicationDate: z.iso.date(),
    assessment: z.string(), irishReadAcross: z.string(),
    source: z.object({ publisher: z.string(), url: z.url(), primary: z.boolean() }),
  })),
});

type Highlight = {
  title: string; summary: string; implication: string; theme: string; score: number;
  scoreLabel: "Board priority" | "Executive priority" | "Monitor"; eventDate?: string;
  sourceLabel: string; sourceUrl: string; evidence: string;
};

const themes = [
  { pattern: /regulat|dora|resilien|supervis|compliance|directive|consumer protection/i, label: "Regulatory execution", weight: 8 },
  { pattern: /ai|artificial intelligence|automation|data|cloud|technology|digital/i, label: "AI & operating model", weight: 7 },
  { pattern: /customer|advice|afford|trust|fraud|service|experience/i, label: "Customer & distribution", weight: 6 },
  { pattern: /compet|market share|acqui|merger|partner|payment|platform/i, label: "Competitive movement", weight: 7 },
  { pattern: /cost|efficien|capital|revenue|margin|commercial/i, label: "Economics & productivity", weight: 6 },
];

function classify(text: string) {
  return themes.find(theme => theme.pattern.test(text)) ?? { label: "Strategic transformation", weight: 5 };
}

function scoreHighlight(input: { text: string; primary: boolean; irish: boolean; status: string }) {
  const theme = classify(input.text);
  const statusWeight = /final|effective|live|completed|implementation/i.test(input.status) ? 9 : /announc|consult|propos/i.test(input.status) ? 5 : 6;
  const total = Math.min(100, 58 + theme.weight + statusWeight + (input.primary ? 10 : 4) + (input.irish ? 8 : 3));
  return { score: total, theme: theme.label, scoreLabel: total >= 88 ? "Board priority" as const : total >= 76 ? "Executive priority" as const : "Monitor" as const };
}

function fallbackHighlights(): Highlight[] {
  return [...findings.regulation, ...findings.ai, ...findings.customer].map(item => {
    const scored = scoreHighlight({ text: `${item.title} ${item.interpretation}`, primary: true, irish: /Irish|Ireland/i.test(`${item.interpretation} ${item.implication}`), status: item.direction });
    return { title:item.title, summary:item.interpretation, implication:item.implication, ...scored, sourceLabel:item.sourceLabel, sourceUrl:item.sourceUrl, evidence:item.signalKind };
  }).sort((a,b) => b.score-a.score).slice(0,7);
}

export default async function Page() {
  let report:{slug:string;title:string;executive_headline:string;overall_assessment:string;content:unknown;published_at:string|null}|null=null;
  try{const db=await createClient();const result=await db.from("reports").select("slug,title,executive_headline,overall_assessment,content,published_at").eq("is_published",true).order("published_at",{ascending:false}).limit(1).maybeSingle();report=result.data}catch{/* Render the reviewed fallback when public database configuration is unavailable. */}
  const parsed = baselineSchema.safeParse(report?.content);
  const highlights: Highlight[] = parsed.success ? parsed.data.developments.map(item => {
    const text = `${item.title} ${item.assessment} ${item.irishReadAcross}`;
    const scored = scoreHighlight({ text, primary:item.source.primary, irish:/Irish|Ireland/i.test(text), status:item.status });
    return { title:item.title, summary:item.assessment, implication:item.irishReadAcross, ...scored, eventDate:item.eventDate, sourceLabel:item.source.publisher, sourceUrl:item.source.url, evidence:item.source.primary ? "Primary source" : "Supporting source" };
  }).sort((a,b) => b.score-a.score) : fallbackHighlights();
  const boardPriorities = highlights.filter(item => item.scoreLabel === "Board priority").length;
  const themeCount = new Set(highlights.map(item => item.theme)).size;

  return <SectionPage eyebrow="THIS WEEK" title="The developments that matter most" description="A CEO-prioritised view of this week’s market events—ranked by strategic relevance, evidence quality, immediacy and Irish read-across.">
    <section className="report-context"><div><p className="label text-purple-200">EXECUTIVE HEADLINE</p><h2 className="mt-2 max-w-4xl text-xl font-semibold text-white">{report?.executive_headline ?? reportMeta.headline}</h2><p className="mt-3 max-w-4xl text-sm leading-6 text-purple-100">{report?.overall_assessment ?? reportMeta.assessment}</p></div>{report && <Link className="inline-flex items-center gap-2 text-sm font-semibold text-orange-200" href={`/intelligence/reports/${report.slug}`}>Full evidence report <ArrowUpRight size={15}/></Link>}</section>
    <div className="grid gap-3 sm:grid-cols-3"><Metric icon={<CircleAlert size={18}/>} value={String(boardPriorities)} label="board-priority developments"/><Metric icon={<Target size={18}/>} value={String(themeCount)} label="strategic themes represented"/><Metric icon={<Gauge size={18}/>} value={`${highlights[0]?.score ?? 0}/100`} label="highest CEO relevance"/></div>
    <div className="mt-7 flex flex-wrap items-end justify-between gap-4"><div><p className="label text-[var(--purple)]">RANKED HIGHLIGHTS</p><h2 className="mt-2 text-2xl font-semibold">Important developments first</h2></div><p className="max-w-xl text-xs leading-5 text-[var(--muted)]">Score combines strategic-theme weight, event maturity, source quality and Irish relevance. It is a prioritisation aid—not a model-generated materiality total.</p></div>
    <div className="mt-4 space-y-4">{highlights.map((item,index) => <article className={`weekly-highlight ${index===0 ? "weekly-highlight-primary" : ""}`} key={item.title}>
      <div className="weekly-rank"><span>#{index+1}</span><strong>{item.score}</strong><small>CEO relevance</small></div>
      <div><div className="flex flex-wrap items-center gap-2"><span className="theme-pill">{item.theme}</span><span className={item.scoreLabel === "Board priority" ? "signal-pill signal-hard" : "signal-pill"}>{item.scoreLabel}</span><span className="signal-pill">{item.evidence}</span></div><h3 className="mt-3 text-xl font-semibold leading-snug">{item.title}</h3><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.summary}</p>{item.eventDate && <p className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]"><CalendarDays size={14}/> Event date {item.eventDate}</p>}</div>
      <div className="strategic-implication"><p className="label text-[var(--orange)]">STRATEGIC IMPLICATION</p><p className="mt-2 text-sm leading-6">{item.implication}</p><Link className="source-link" href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceLabel}<ArrowUpRight size={14}/></Link></div>
    </article>)}</div>
    <div className="mt-7 flex items-center justify-between rounded-xl border border-[var(--line)] bg-white p-5"><div><p className="font-semibold">Looking for prior weeks?</p><p className="mt-1 text-sm text-[var(--muted)]">Published reports remain permanently accessible and comparable.</p></div><Link className="text-sm font-semibold text-[var(--purple)]" href="/intelligence/archive">Open archive</Link></div>
  </SectionPage>;
}

function Metric({icon,value,label}:{icon:React.ReactNode;value:string;label:string}) { return <div className="rounded-xl border border-[var(--line)] bg-white p-4"><div className="flex items-center justify-between"><strong className="text-2xl">{value}</strong><span className="text-[var(--orange)]">{icon}</span></div><p className="mt-1 text-xs text-[var(--muted)]">{label}</p></div>; }
