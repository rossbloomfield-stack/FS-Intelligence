import { SectionPage } from "@/components/intelligence/section-page";
import { GraphOperations } from "@/components/intelligence/admin/graph-operations";
import { fixtureMode } from "@/config/env";
import { requireAdmin } from "@/lib/supabase/auth";
import { getGraphOperationsStatus } from "@/lib/intelligence/graph/coverage";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!fixtureMode) await requireAdmin();
  const status = await getGraphOperationsStatus();
  return <SectionPage eyebrow="ADMIN · R4" title="Market graph and coverage" description="Inspect source breadth, entity resolution, evidence-grounded relationships and controlled production backfill."><GraphOperations initialStatus={status} /></SectionPage>;
}
