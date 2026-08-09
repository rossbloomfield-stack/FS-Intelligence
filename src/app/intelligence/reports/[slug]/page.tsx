import Link from "next/link";
import { z } from "zod";
import { Dashboard } from "@/components/intelligence/dashboard";
import { SectionPage } from "@/components/intelligence/section-page";
import { fixtureMode } from "@/config/env";
import { createClient } from "@/lib/supabase/server";
import { briefingSchema } from "@/schemas/agents";
import { findings } from "@/lib/market-report";

export const dynamic = "force-dynamic";

const baselineSchema = z.object({
  generationMode: z.literal("editorial_baseline"),
  periodStart: z.iso.date(),
  periodEnd: z.iso.date(),
  developments: z.array(
    z.object({
      title: z.string(),
      status: z.string(),
      eventDate: z.iso.date(),
      publicationDate: z.iso.date(),
      assessment: z.string(),
      irishReadAcross: z.string(),
      source: z.object({
        publisher: z.string(),
        url: z.url(),
        primary: z.boolean(),
      }),
    }),
  ),
  evidenceLimitations: z.array(z.string()),
});

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (fixtureMode) return <Dashboard />;

  const supabase = await createClient();
  const { data: report } = await supabase
    .from("reports")
    .select(
      "slug,title,executive_headline,overall_assessment,content,published_at,updated_at",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!report) {
    return (
      <SectionPage
        eyebrow="REPORT"
        title="Report unavailable"
        description={`No approved report exists at ${slug}.`}
      />
    );
  }

  const baseline = baselineSchema.safeParse(report.content);
  const briefing = briefingSchema.safeParse(report.content);
  const period = baseline.success ? `${baseline.data.periodStart} to ${baseline.data.periodEnd}` : "Current reporting period";
  const published = report.published_at ? new Intl.DateTimeFormat("en-IE", { dateStyle: "long" }).format(new Date(report.published_at)) : "Publication pending";
  const reportJsonLd = { "@context":"https://schema.org", "@type":"Report", headline:report.title, description:report.overall_assessment, datePublished:report.published_at, dateModified:report.updated_at, author:{"@type":"Person",name:"Ross Bloomfield"}, mainEntityOfPage:`https://www.rossbloomfield.com/intelligence/reports/${report.slug}` };

  return (
    <SectionPage
      eyebrow="PUBLISHED INTELLIGENCE"
      title={report.title}
      description={report.executive_headline}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reportJsonLd).replaceAll("<", "\\u003c") }} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ReportMetric label="Reporting period" value={period}/><ReportMetric label="Publication date" value={published}/><ReportMetric label="Board attention" value="High"/><ReportMetric label="Materiality" value={baseline.success ? `${baseline.data.developments.length} verified items` : "See assessment"}/><ReportMetric label="Evidence confidence" value={baseline.success && baseline.data.developments.every(item=>item.source.primary) ? "High" : "Medium"}/>
      </section>
      <p className="max-w-4xl leading-7 text-[var(--muted)]">
        {report.overall_assessment}
      </p>

      <section className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-6"><p className="label text-[var(--purple)]">THIS WEEK IN ONE MINUTE</p><div className="mt-4 grid gap-4 lg:grid-cols-2">{(baseline.success ? baseline.data.developments.slice(0,6).map(item=>({title:item.title,implication:item.irishReadAcross})) : findings.ai.slice(0,3).map(item=>({title:item.title,implication:item.implication}))).map(item=><article key={item.title}><h2 className="font-semibold">{item.title}</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.implication}</p></article>)}</div></section>

      <section className="mt-8"><p className="label text-[var(--orange)]">LEADERSHIP DECISIONS</p><h2 className="mt-2 text-2xl font-semibold">What leadership should do now</h2><div className="mt-4 grid gap-4 lg:grid-cols-3">{findings.actions.map((item,index)=><article className="rounded-2xl border border-[var(--line)] bg-white p-5" key={item.title}><span className="signal-pill">{["Accelerate","Defend","Prepare"][index]}</span><h3 className="mt-3 font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]"><strong>Decision required:</strong> {item.implication}</p><p className="mt-3 text-xs text-[var(--muted)]">Owner: {["CDIO / CRO","CEO / CCO","CRO / COO"][index]} · Timing: 30 days</p></article>)}</div></section>

      {baseline.success && (
        <>
          <p className="mt-5 text-sm font-semibold text-[var(--purple)]">
            Reporting period {baseline.data.periodStart} to{" "}
            {baseline.data.periodEnd}
          </p>
          <div className="mt-8 space-y-5">
            {baseline.data.developments.map((development) => (
              <article
                className="rounded-xl border border-[var(--line)] p-5"
                key={development.title}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--orange)]">
                  {development.status.replaceAll("_", " ")}
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  {development.title}
                </h2>
                <p className="mt-3 leading-7 text-[var(--muted)]">
                  {development.assessment}
                </p>
                <p className="mt-3 leading-7">
                  <strong>Irish read-across:</strong>{" "}
                  {development.irishReadAcross}
                </p>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  Event: {development.eventDate} · Publication:{" "}
                  {development.publicationDate}
                </p>
                <Link
                  className="mt-4 inline-flex text-sm font-semibold text-[var(--purple)] underline"
                  href={development.source.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {development.source.publisher} — primary source
                </Link>
              </article>
            ))}
          </div>
          <aside className="mt-8 rounded-xl bg-[var(--paper)] p-5">
            <h2 className="font-semibold">Evidence limitations</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
              {baseline.data.evidenceLimitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </aside>
        </>
      )}

      {briefing.success && (
        <div className="mt-8 space-y-5">
          {briefing.data.conclusions.map((conclusion) => (
            <article
              className="rounded-xl border border-[var(--line)] p-5"
              key={conclusion.whatChanged}
            >
              <h2 className="text-xl font-semibold">
                {conclusion.whatChanged}
              </h2>
              <p className="mt-3 leading-7 text-[var(--muted)]">
                {conclusion.whyItMatters}
              </p>
            </article>
          ))}
        </div>
      )}

      {!baseline.success && !briefing.success && (
        <p className="mt-8 rounded-xl bg-amber-50 p-5 text-sm text-amber-900">
          The report summary is available, but its detailed content does not
          match a supported published-report contract.
        </p>
      )}
    </SectionPage>
  );
}

function ReportMetric({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-[var(--line)] bg-white p-4"><p className="label text-[var(--purple)]">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>}
