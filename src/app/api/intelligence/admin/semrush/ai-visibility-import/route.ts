import readXlsxFile from "read-excel-file/node";
import { createClient } from "@/lib/supabase/server";
import { marketResearchFlags } from "@/config/market-research";
import { aiVisibilityScopeSchema, normalizeVisibilityRows, parseCsv } from "@/lib/market-research/ai-visibility-import";

export const runtime = "nodejs";
export const maxDuration = 30;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  if (!marketResearchFlags.aiVisibilityImports) return Response.json({ error: "AI visibility imports are disabled." }, { status: 404 });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user?.email) return Response.json({ error: "Sign in is required." }, { status: 401 });
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return Response.json({ error: "Administrator access is required." }, { status: 403 });

  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "Choose a CSV or XLSX export and complete its scope." }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_FILE_BYTES) return Response.json({ error: "The file must be between 1 byte and 8 MB." }, { status: 400 });
  const scopeResult = aiVisibilityScopeSchema.safeParse({
    brand: form.get("brand"), platform: form.get("platform"), market: form.get("market"),
    periodStart: form.get("periodStart"), periodEnd: form.get("periodEnd"), metricDefinition: form.get("metricDefinition"),
  });
  if (!scopeResult.success) return Response.json({ error: "Brand, platform, market, dates and metric definition are required." }, { status: 400 });
  const scope = scopeResult.data;
  if (scope.periodStart > scope.periodEnd) return Response.json({ error: "The reporting period end must not precede its start." }, { status: 400 });

  const extension = file.name.toLocaleLowerCase("en-IE").split(".").pop();
  if (extension !== "csv" && extension !== "xlsx") return Response.json({ error: "Only CSV and XLSX exports are supported." }, { status: 415 });
  try {
    const matrix = extension === "csv"
      ? parseCsv(await file.text())
      : (await readXlsxFile(Buffer.from(await file.arrayBuffer())))[0]?.data ?? [];
    const serialisable = matrix.map((row) => row.map((cell) => cell instanceof Date ? cell.toISOString().slice(0, 10) : cell === null || cell === undefined ? "" : String(cell)));
    const result = normalizeVisibilityRows(serialisable, scope, extension);
    const conversationId = crypto.randomUUID();
    const now = new Date().toISOString();
    const title = `${scope.brand === "irish_life" ? "Irish Life" : "Unio"} AI visibility import · ${scope.periodStart}–${scope.periodEnd}`;
    const conversation = await db.from("conversations").insert({ id: conversationId, user_id: user.id, title, status: "active", updated_at: now, context: { importType: "ai_visibility", marketResearchImport: { scope, format: extension, headers: result.headers, unmatchedColumns: result.unmatchedColumns, rowCount: result.rows.length, errors: result.errors, importedAt: now } } });
    if (conversation.error) throw new Error("Could not save the import conversation.");
    const message = await db.from("conversation_messages").insert({ conversation_id: conversationId, user_id: user.id, role: "assistant", intent: "ai_visibility_import", confidence: result.errors.length ? "limited" : "unassessed", freshness: "user_supplied_export", content: { type: "ai_visibility_import", version: 1, reportName: file.name, importedAt: now, ...result } });
    if (message.error) throw new Error("The import could not be saved. No import was reported as complete.");
    return Response.json({ conversationId, saved: true, import: result }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The export could not be read." }, { status: 422 });
  }
}
