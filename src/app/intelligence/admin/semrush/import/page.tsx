import { SectionPage } from "@/components/intelligence/section-page";
import { AiVisibilityImportForm } from "@/components/intelligence/admin/ai-visibility-import-form";
import { marketResearchFlags } from "@/config/market-research";
import { requireAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { VisibilityImport } from "@/lib/market-research/ai-visibility-import";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ conversationId?: string }> }) {
  const user = await requireAdmin();
  const { conversationId } = await searchParams;
  let saved: VisibilityImport | null = null;
  if (conversationId && /^[0-9a-f-]{36}$/i.test(conversationId)) {
    const db = await createClient();
    const { data: ownerConversation } = await db.from("conversations").select("id").eq("id", conversationId).eq("user_id", user.id).maybeSingle();
    if (ownerConversation) {
      const { data } = await db.from("conversation_messages").select("content").eq("conversation_id", conversationId).eq("user_id", user.id).eq("intent", "ai_visibility_import").order("created_at", { ascending: false }).limit(1).maybeSingle();
      const content = data?.content;
      if (content && typeof content === "object" && !Array.isArray(content) && (content as Record<string, unknown>).type === "ai_visibility_import") {
        const omitted = new Set(["type", "version", "reportName", "importedAt"]);
        const value = Object.fromEntries(Object.entries(content as Record<string, unknown>).filter(([key]) => !omitted.has(key)));
        saved = value as VisibilityImport;
      }
    }
  }
  return <SectionPage eyebrow="ADMIN · IMPORTS" title="AI visibility evidence" description="Retain provider-export observations with their original columns and declared comparison scope. Imported metrics remain separate from organic rankings and estimated AI referral traffic.">
    {!marketResearchFlags.aiVisibilityImports ? <p className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm">This import is currently disabled. Enable ENABLE_AI_VISIBILITY_IMPORTS in the server environment to accept files.</p> : <AiVisibilityImportForm initial={saved} />}
  </SectionPage>;
}
