import Link from "next/link";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { briefingSchema } from "@/schemas/agents";
import { SectionPage } from "./section-page";

const baselineSchema = z.object({
  generationMode: z.literal("editorial_baseline"),
  developments: z.array(z.object({
    title: z.string(), status: z.string(), eventDate: z.iso.date(), publicationDate: z.iso.date(),
    assessment: z.string(), irishReadAcross: z.string(),
    source: z.object({ publisher: z.string(), url: z.url(), primary: z.boolean() }),
  })),
  evidenceLimitations: z.array(z.string()),
});
type View = "competitors" | "ai" | "regulation" | "actions" | "sources";
const copy: Record<View,{eyebrow:string;title:string;description:string}> = {
  competitors:{eyebrow:"MARKET ACTIVITY",title:"Competitors",description:"Verified market context and competitor evidence from the latest published report."},
  ai:{eyebrow:"CAPABILITY TRACKER",title:"AI & Transformation",description:"Evidence on AI, digital capability and operational transformation."},
  regulation:{eyebrow:"REGULATORY RADAR",title:"Regulation",description:"Verified regulatory developments with status, dates and Irish implications."},
  actions:{eyebrow:"INTEGRATED GROUP",title:"Strategic Actions",description:"Board considerations derived explicitly from published evidence."},
  sources:{eyebrow:"EVIDENCE LIBRARY",title:"Sources",description:"Primary-source metadata used by the latest published report."},
};

export async function PublishedSection({view}:{view:View}) {
  const supabase=await createClient();
  const {data:report}=await supabase.from("reports").select("slug,title,executive_headline,overall_assessment,content,published_at").eq("is_published",true).order("published_at",{ascending:false}).limit(1).maybeSingle();
  const page=copy[view];
  if(!report)return <SectionPage {...page}><p className="text-sm text-[var(--muted)]">No approved report has been published.</p></SectionPage>;
  const baseline=baselineSchema.safeParse(report.content);const briefing=briefingSchema.safeParse(report.content);
  if(!baseline.success&&!briefing.success)return <SectionPage {...page}><p className="text-sm text-[var(--muted)]">The latest report does not contain a supported detail contract.</p></SectionPage>;
  if(baseline.success){const all=baseline.data.developments;const filtered=view==="ai"?all.filter(item=>/ai|digital|resilien|technology/i.test(`${item.title} ${item.assessment}`)):view==="regulation"?all.filter(item=>/regulat|implementation|supervis|solvency|dora|directive/i.test(`${item.status} ${item.title} ${item.assessment}`)):all;return <SectionPage {...page}><div className="rounded-xl bg-[var(--paper)] p-5"><p className="font-semibold">{report.executive_headline}</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{report.overall_assessment}</p></div>{view==="competitors"&&<p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">The latest report contains no verified competitor-specific event. The market context below is shown without attributing unverified competitor activity.</p>}<div className="mt-6 space-y-4">{(view==="sources"?all:filtered).map(item=><article className="rounded-xl border border-[var(--line)] p-5" key={`${view}-${item.title}`}>{view==="actions"?<><h2 className="font-semibold">Board consideration</h2><p className="mt-2 leading-7">{item.irishReadAcross}</p><p className="mt-3 text-sm text-[var(--muted)]">Evidence: {item.title}</p></>:view==="sources"?<><h2 className="font-semibold">{item.source.publisher}</h2><p className="mt-2 text-sm text-[var(--muted)]">Supports: {item.title}</p></>:<><p className="text-xs font-bold uppercase text-[var(--orange)]">{item.status.replaceAll("_"," ")}</p><h2 className="mt-2 text-lg font-semibold">{item.title}</h2><p className="mt-2 leading-7 text-[var(--muted)]">{item.assessment}</p><p className="mt-3 text-sm"><strong>Irish read-across:</strong> {item.irishReadAcross}</p><p className="mt-3 text-xs text-[var(--muted)]">Event {item.eventDate} · Publication {item.publicationDate}</p></>}<Link className="mt-4 inline-flex text-sm font-semibold text-[var(--purple)] underline" href={item.source.url} target="_blank" rel="noreferrer">{item.source.publisher} — primary source</Link></article>)}{filtered.length===0&&view!=="sources"&&<p className="text-sm text-[var(--muted)]">No evidence in this category met the latest report’s inclusion threshold.</p>}</div><Link className="mt-6 inline-flex rounded-lg bg-[var(--purple)] px-4 py-2 text-sm font-semibold text-white" href={`/intelligence/reports/${report.slug}`}>Open full report</Link></SectionPage>}
  return <SectionPage {...page}><div className="space-y-4">{briefing.data.conclusions.map(item=><article className="rounded-xl border border-[var(--line)] p-5" key={item.whatChanged}><h2 className="font-semibold">{item.whatChanged}</h2><p className="mt-2 text-[var(--muted)]">{item.whyItMatters}</p></article>)}</div><Link className="mt-6 inline-flex text-sm font-semibold text-[var(--purple)]" href={`/intelligence/reports/${report.slug}`}>Open full report</Link></SectionPage>;
}
