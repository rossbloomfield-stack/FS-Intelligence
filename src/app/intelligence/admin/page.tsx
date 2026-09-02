import Link from "next/link";
import { IngestionOperations } from "@/components/intelligence/admin/ingestion-operations";
import { SectionPage } from "@/components/intelligence/section-page";
import { fixtureMode } from "@/config/env";
import { requireAdmin } from "@/lib/supabase/auth";
import { getIngestionOperationsStatus } from "@/lib/intelligence/ingestion/operations";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!fixtureMode) await requireAdmin();
  const ingestionStatus = await getIngestionOperationsStatus();
  return (
    <SectionPage
      eyebrow="ADMIN"
      title="Intelligence operations"
      description="Generate, monitor, review and approve intelligence and its supporting evidence."
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <AdminCard title="Generate report" body="Start the same durable workflow used by the weekly schedule." action="Generate report now" />
        <AdminCard title="Run progress" body="Agent and workflow status persists across retries and deployments." action="Open latest run" href="/intelligence/admin/runs/fixture" />
        <AdminCard title="Draft review" body="Publication remains blocked until QA passes and an administrator approves." action="Review draft" />
      </div>
      <IngestionOperations initialStatus={ingestionStatus} />
    </SectionPage>
  );
}

function AdminCard({ title, body, action, href }: { title: string; body: string; action: string; href?: string }) {
  const className = "mt-5 inline-flex min-h-11 items-center rounded-lg bg-[var(--purple)] px-4 py-2 text-sm font-semibold text-white";
  return (
    <article className="rounded-xl border border-[var(--line)] p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
      {href ? <Link className={className} href={href}>{action}</Link> : <button type="button" className={className}>{action}</button>}
    </article>
  );
}
