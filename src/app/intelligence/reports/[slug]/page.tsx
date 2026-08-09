import Link from "next/link";
import { z } from "zod";
import { Dashboard } from "@/components/intelligence/dashboard";
import { SectionPage } from "@/components/intelligence/section-page";
import { fixtureMode } from "@/config/env";
import { createClient } from "@/lib/supabase/server";
import { briefingSchema } from "@/schemas/agents";

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
      "slug,title,executive_headline,overall_assessment,content,published_at",
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

  return (
    <SectionPage
      eyebrow="PUBLISHED INTELLIGENCE"
      title={report.title}
      description={report.executive_headline}
    >
      <p className="max-w-4xl leading-7 text-[var(--muted)]">
        {report.overall_assessment}
      </p>

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
