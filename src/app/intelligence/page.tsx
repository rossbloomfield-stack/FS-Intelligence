import Link from "next/link";
import { Dashboard } from "@/components/intelligence/dashboard";
import { SectionPage } from "@/components/intelligence/section-page";
import { fixtureMode } from "@/config/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (fixtureMode) return <Dashboard />;

  const supabase = await createClient();
  const { data: report } = await supabase
    .from("reports")
    .select("slug,title,executive_headline,overall_assessment,published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!report) {
    return (
      <SectionPage
        eyebrow="INTELLIGENCE"
        title="No published report yet"
        description="The production dashboard will populate after the first research run passes QA and receives administrator approval."
      />
    );
  }

  return (
    <SectionPage
      eyebrow="LATEST INTELLIGENCE"
      title={report.title}
      description={report.executive_headline}
    >
      <p className="max-w-4xl leading-7 text-[var(--muted)]">
        {report.overall_assessment}
      </p>
      <Link
        className="mt-6 inline-flex rounded-lg bg-[var(--purple)] px-4 py-3 text-sm font-semibold text-white"
        href={`/intelligence/reports/${report.slug}`}
      >
        Open the full report
      </Link>
    </SectionPage>
  );
}
