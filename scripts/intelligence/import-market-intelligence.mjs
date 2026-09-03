import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { readMarketIntelligenceWorkbook } from "./workbook-registry.mjs";
import { emitRegistrySql } from "./registry-sql.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.file) fail("Usage: pnpm intelligence:import -- --file <workbook.xlsx> [--apply --confirm-project <project-ref>]");
const filePath = path.resolve(args.file);
const dataset = await readMarketIntelligenceWorkbook(filePath);
const workbookSha256 = createHash("sha256").update(await readFile(filePath)).digest("hex");
const summary = {
  mode: args.apply ? "apply" : "dry-run",
  workbook: path.basename(filePath),
  sha256: workbookSha256,
  ...dataset.counts,
  warnings: dataset.warnings,
  errors: dataset.errors,
};

if (dataset.errors.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} else if (!args.apply) {
  const emitted = args.emitSqlDir ? await emitRegistrySql({ dataset, outputDir: path.resolve(args.emitSqlDir), workbookName: path.basename(filePath), workbookSha256 }) : null;
  console.log(JSON.stringify({ ...summary, emittedSqlFiles: emitted?.files.length ?? 0, importKey: emitted?.importKey }, null, 2));
} else {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --apply.");
  const projectRef = new URL(url).hostname.split(".")[0];
  if (!args.confirmProject || args.confirmProject !== projectRef) {
    fail(`Refusing to write: --confirm-project must exactly match ${projectRef}.`);
  }
  const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const importKey = `workbook:${workbookSha256}`;
  await supabase.from("source_registry_imports").upsert({
    import_key: importKey,
    workbook_name: path.basename(filePath),
    workbook_sha256: workbookSha256,
    status: "running",
    dry_run: false,
    source_count: dataset.counts.sources,
    target_count: dataset.counts.targets,
    ready_count: dataset.counts.ready,
    discovery_count: dataset.counts.discovery,
    blocked_count: dataset.counts.blocked,
    validation_errors: [],
    started_at: new Date().toISOString(),
    completed_at: null,
  }, { onConflict: "import_key" }).throwOnError();

  try {
    const sourceIds = new Map();
    for (const batch of batches(dataset.sources, 200)) {
      const { data, error } = await supabase.from("sources").upsert(
        batch.map((entry) => entry.source),
        { onConflict: "source_key" },
      ).select("id,source_key");
      if (error) throw error;
      for (const row of data ?? []) sourceIds.set(row.source_key, row.id);
    }
    if (sourceIds.size !== dataset.counts.sources) throw new Error(`Expected ${dataset.counts.sources} source IDs, received ${sourceIds.size}.`);

    for (const batch of batches(dataset.sources, 200)) {
      const rows = batch.map((entry) => ({ ...entry.connector, source_id: sourceIds.get(entry.source.source_key) }));
      const { error } = await supabase.from("source_connectors").upsert(rows, { onConflict: "source_id" });
      if (error) throw error;
    }

    for (const batch of batches(dataset.referenceTargets, 300)) {
      const rows = batch.map(({ source_key: sourceKey, ...target }) => ({ ...target, source_id: sourceIds.get(sourceKey) }));
      const { error } = await supabase.from("reference_targets").upsert(rows, { onConflict: "reference_key" });
      if (error) throw error;
    }

    await supabase.from("source_registry_imports").update({ status: "completed", completed_at: new Date().toISOString() }).eq("import_key", importKey).throwOnError();
    console.log(JSON.stringify({ ...summary, importKey, applied: true }, null, 2));
  } catch (error) {
    await supabase.from("source_registry_imports").update({
      status: "failed",
      completed_at: new Date().toISOString(),
      validation_errors: [{ message: error instanceof Error ? error.message : String(error) }],
    }).eq("import_key", importKey);
    throw error;
  }
}

function parseArgs(values) {
  const parsed = { apply: false, file: "", confirmProject: "", emitSqlDir: "" };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--") continue;
    if (value === "--apply") parsed.apply = true;
    else if (value === "--file") parsed.file = values[++index] ?? "";
    else if (value === "--confirm-project") parsed.confirmProject = values[++index] ?? "";
    else if (value === "--emit-sql-dir") parsed.emitSqlDir = values[++index] ?? "";
    else fail(`Unknown argument: ${value}`);
  }
  return parsed;
}

function batches(values, size) { const result = []; for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size)); return result; }
function fail(message) { console.error(message); process.exit(1); }
