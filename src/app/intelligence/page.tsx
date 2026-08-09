import Link from "next/link";
import { ArrowRight, Building2, CircleGauge, Scale, Sparkles, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { competitorFocus, findings, reportMeta } from "@/lib/market-report";

export const dynamic = "force-dynamic";

const sections = [
  { label:"Signals & Indicators", href:"/intelligence/signals", icon:<CircleGauge size={19}/>, finding:"Production execution is separating from experimentation", detail:"9 report signals · hard and soft evidence" },
  { label:"Competitors", href:"/intelligence/competitors", icon:<Building2 size={19}/>, finding:`${competitorFocus.length} major firms mapped across Ireland and the UK`, detail:"Focus, maturity and Irish read-across" },
  { label:"AI & Transformation", href:"/intelligence/ai", icon:<Sparkles size={19}/>, finding:findings.ai[0].title, detail:"3 key findings" },
  { label:"Regulation", href:"/intelligence/regulation", icon:<Scale size={19}/>, finding:findings.regulation[0].title, detail:"3 priority movements" },
  { label:"Customer Signals", href:"/intelligence/customers", icon:<Users size={19}/>, finding:findings.customer[0].title, detail:"3 behavioural indicators" },
];

export default async function Page() {
  const supabase = await createClient();
  const { data: report } = await supabase.from("reports").select("slug,title,executive_headline,overall_assessment,published_at").eq("is_published", true).order("published_at", { ascending: false }).limit(1).maybeSingle();
  return <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
    <section className="overflow-hidden rounded-2xl bg-[var(--purple-dark)] p-6 text-white sm:p-9">
      <div className="grid gap-8 xl:grid-cols-[1.4fr_.6fr]"><div><p className="label text-orange-200">FINANCIAL SERVICES TRANSFORMATION INTELLIGENCE</p><h1 className="mt-3 max-w-5xl text-3xl font-semibold leading-tight sm:text-5xl">{report?.executive_headline ?? reportMeta.headline}</h1><p className="mt-5 max-w-4xl leading-7 text-purple-100">{report?.overall_assessment ?? reportMeta.assessment}</p></div><div className="self-end rounded-xl border border-white/15 bg-white/10 p-5"><p className="label text-purple-200">MARKET POSITION</p><p className="mt-2 font-semibold">{reportMeta.period}</p><p className="mt-4 text-sm leading-6 text-purple-100">Ireland first · UK leading indicators · claims linked to evidence</p>{report && <Link className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-orange-200" href={`/intelligence/reports/${report.slug}`}>Open published report <ArrowRight size={15}/></Link>}</div></div>
    </section>
    <section className="mt-7 grid gap-4 lg:grid-cols-5">{sections.map(section => <Link className="group rounded-2xl border border-[var(--line)] bg-white p-5 transition hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-sm" href={section.href} key={section.label}><div className="flex items-center justify-between text-[var(--purple)]"><span>{section.icon}</span><ArrowRight className="transition group-hover:translate-x-1" size={16}/></div><p className="label mt-5 text-[var(--orange)]">{section.label}</p><h2 className="mt-2 font-semibold leading-snug">{section.finding}</h2><p className="mt-4 text-xs text-[var(--muted)]">{section.detail}</p></Link>)}</section>
    <section className="mt-7 grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><div className="rounded-2xl border border-[var(--line)] bg-white p-6"><div className="flex items-end justify-between gap-4"><div><p className="label text-[var(--purple)]">KEY REPORT FINDINGS</p><h2 className="mt-2 text-2xl font-semibold">What changed—and why it matters</h2></div><Link className="text-sm font-semibold text-[var(--purple)]" href="/intelligence/signals">View all</Link></div><div className="mt-5 divide-y divide-[var(--line)]">{[findings.ai[0], findings.regulation[0], findings.customer[1]].map((item,index) => <article className="grid gap-3 py-5 sm:grid-cols-[36px_1fr_auto]" key={item.title}><span className="finding-number">{index+1}</span><div><div className="flex gap-2"><span className={item.signalKind === "Hard signal" ? "signal-pill signal-hard" : "signal-pill signal-soft"}>{item.signalKind}</span><span className="signal-pill">{item.direction}</span></div><h3 className="mt-3 font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.interpretation}</p></div><span className="h-fit rounded-lg bg-purple-50 px-3 py-2 text-xs font-bold text-[var(--purple)]">{item.strength}</span></article>)}</div></div><aside className="rounded-2xl border border-[var(--line)] bg-white p-6"><p className="label text-[var(--purple)]">EXECUTIVE RESPONSE</p><h2 className="mt-2 text-2xl font-semibold">Three moves to make now</h2><div className="mt-5 space-y-3">{findings.actions.map((item,index)=><Link href="/intelligence/actions" className="block rounded-xl bg-[var(--paper)] p-4" key={item.title}><span className="text-xs font-bold text-[var(--orange)]">0{index+1}</span><h3 className="mt-2 font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.implication}</p></Link>)}</div></aside></section>
  </div>;
}
