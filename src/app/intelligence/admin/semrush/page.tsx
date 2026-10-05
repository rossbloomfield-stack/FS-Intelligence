import { SectionPage } from "@/components/intelligence/section-page";
import { SemrushConnectionPanel } from "@/components/intelligence/admin/semrush-connection-panel";
import { getSemrushConnectionState, marketResearchFlags } from "@/config/market-research";
import { requireAdmin } from "@/lib/supabase/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function Page() {
  await requireAdmin();
  return (
    <SectionPage eyebrow="ADMIN · PROVIDERS" title="Semrush research" description="Check the app-owned, server-side connection and inspect only the read-only capabilities the provider exposes.">
      <SemrushConnectionPanel initialState={getSemrushConnectionState()} enabled={marketResearchFlags.semrushResearch} />
      <div className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-lg font-semibold">AI visibility export</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Import an authorised Semrush AI Visibility CSV/XLSX export with its brand, market, platform, reporting period and metric definition.</p>
        <Link className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[var(--purple)] px-4 py-2 text-sm font-semibold text-white" href="/intelligence/admin/semrush/import">Open import</Link>
        {!marketResearchFlags.aiVisibilityImports && <p className="mt-3 text-xs text-[var(--muted)]">The import is disabled until ENABLE_AI_VISIBILITY_IMPORTS is enabled in the server environment.</p>}
      </div>
    </SectionPage>
  );
}
