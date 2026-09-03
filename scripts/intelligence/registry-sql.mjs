import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceColumns = [
  ["source_key", "text"], ["url", "text"], ["canonical_url", "text"], ["title", "text"], ["publisher", "text"],
  ["source_type", "text"], ["publication_date", "date"], ["primary_source", "boolean"], ["credibility_tier", "smallint"],
  ["evidence_classification", "text"], ["notes", "text"], ["approved_public", "boolean"], ["registry_kind", "text"],
  ["canonical_domain", "text"], ["source_class", "text"], ["categorisation", "text"], ["signal_type", "text"],
  ["geography", "text"], ["priority", "text"], ["source_weight", "numeric"], ["registry_status", "text"],
  ["registry_active", "boolean"], ["access_licensing_note", "text"], ["storage_policy", "text"], ["implementation_notes", "text"],
];

const connectorColumns = [
  ["source_key", "text"], ["ingestion_route", "text"], ["primary_endpoint_url", "text"], ["api_docs_url", "text"],
  ["reporting_archive_url", "text"], ["endpoint_status", "text"], ["candidate_sitemap_url", "text"], ["robots_url", "text"],
  ["expected_formats", "text[]"], ["recommended_cadence", "text"], ["historical_backfill", "text"], ["parser_strategy", "text"],
  ["deduplication_key", "text"], ["endpoint_verified", "boolean"], ["terms_review_required", "boolean"],
  ["approved_for_fetch", "boolean"], ["enabled", "boolean"],
];

const targetColumns = [
  ["reference_key", "text"], ["source_key", "text"], ["title", "text"], ["url", "text"], ["content_type", "text"],
  ["date_catalogued", "date"], ["categorisation", "text"], ["signal_type", "text"], ["geography", "text"], ["priority", "text"],
  ["reference_year", "integer"], ["reference_stream", "text"], ["record_type", "text"], ["resolution_status", "text"],
  ["ingestion_url", "text"], ["fetch_method", "text"], ["target_discovery_rule", "text"], ["connector_source_class", "text"],
  ["endpoint_status", "text"], ["expected_formats", "text[]"], ["parser_strategy", "text"], ["recommended_cadence", "text"],
  ["historical_backfill", "text"], ["access_licensing_note", "text"], ["storage_policy", "text"], ["ingestion_readiness", "text"],
  ["readiness_grade", "text"], ["readiness_reason", "text"], ["deduplication_key", "text"], ["reference_weight", "numeric"],
  ["publication_date_required", "boolean"], ["effective_date_required", "boolean"], ["approved_for_fetch", "boolean"],
  ["enabled", "boolean"], ["blocked_reason", "text"],
];

export async function emitRegistrySql({ dataset, outputDir, workbookName, workbookSha256 }) {
  await mkdir(outputDir, { recursive: true });
  const importKey = `workbook:${workbookSha256}`;
  const files = [];
  files.push(await writeSql(outputDir, "000-import-start.sql", importStartSql(importKey, workbookName, workbookSha256, dataset.counts)));
  for (const [index, batch] of batches(dataset.sources.map((entry) => entry.source), 100).entries()) {
    files.push(await writeSql(outputDir, numbered("100-sources", index), upsertSql({ table: "sources", rows: batch, columns: sourceColumns, conflict: "source_key" })));
  }
  for (const [index, batch] of batches(dataset.sources.map((entry) => ({ source_key: entry.source.source_key, ...entry.connector })), 100).entries()) {
    files.push(await writeSql(outputDir, numbered("200-connectors", index), connectorSql(batch)));
  }
  for (const [index, batch] of batches(dataset.referenceTargets, 200).entries()) {
    files.push(await writeSql(outputDir, numbered("300-targets", index), targetSql(batch)));
  }
  files.push(await writeSql(outputDir, "999-import-complete.sql", `update public.source_registry_imports set status='completed',completed_at=now() where import_key=${literal(importKey)};\n`));
  return { importKey, files };
}

function upsertSql({ table, rows, columns, conflict }) {
  const names = columns.map(([name]) => name);
  const updates = names.filter((name) => name !== conflict).map((name) => `${name}=excluded.${name}`).join(",\n  ");
  return `begin;\nwith payload as (\n  select * from jsonb_to_recordset(${jsonLiteral(rows)}::jsonb) as x(${definition(columns)})\n)\ninsert into public.${table} (${names.join(",")})\nselect ${names.join(",")} from payload\non conflict (${conflict}) do update set\n  ${updates};\ncommit;\n`;
}

function connectorSql(rows) {
  const targetNames = connectorColumns.map(([name]) => name).filter((name) => name !== "source_key");
  const updates = targetNames.map((name) => `${name}=excluded.${name}`).join(",\n  ");
  return `begin;\nwith payload as (\n  select * from jsonb_to_recordset(${jsonLiteral(rows)}::jsonb) as x(${definition(connectorColumns)})\n)\ninsert into public.source_connectors (source_id,${targetNames.join(",")})\nselect source.id,${targetNames.map((name) => `payload.${name}`).join(",")}\nfrom payload join public.sources source on source.source_key=payload.source_key\non conflict (source_id) do update set\n  ${updates};\ncommit;\n`;
}

function targetSql(rows) {
  const targetNames = targetColumns.map(([name]) => name).filter((name) => name !== "source_key");
  const updates = targetNames.filter((name) => name !== "reference_key").map((name) => `${name}=excluded.${name}`).join(",\n  ");
  return `begin;\nwith payload as (\n  select * from jsonb_to_recordset(${jsonLiteral(rows)}::jsonb) as x(${definition(targetColumns)})\n)\ninsert into public.reference_targets (source_id,${targetNames.join(",")})\nselect source.id,${targetNames.map((name) => `payload.${name}`).join(",")}\nfrom payload join public.sources source on source.source_key=payload.source_key\non conflict (reference_key) do update set\n  ${updates};\ncommit;\n`;
}

function importStartSql(importKey, workbookName, workbookSha256, counts) {
  return `insert into public.source_registry_imports (import_key,workbook_name,workbook_sha256,status,dry_run,source_count,target_count,ready_count,discovery_count,blocked_count,validation_errors,started_at,completed_at)\nvalues (${literal(importKey)},${literal(workbookName)},${literal(workbookSha256)},'running',false,${counts.sources},${counts.targets},${counts.ready},${counts.discovery},${counts.blocked},'[]'::jsonb,now(),null)\non conflict (import_key) do update set status='running',dry_run=false,source_count=excluded.source_count,target_count=excluded.target_count,ready_count=excluded.ready_count,discovery_count=excluded.discovery_count,blocked_count=excluded.blocked_count,validation_errors='[]'::jsonb,started_at=now(),completed_at=null;\n`;
}

async function writeSql(outputDir, fileName, sql) { const filePath = path.join(outputDir, fileName); await writeFile(filePath, sql, "utf8"); return filePath; }
function numbered(prefix, index) { return `${prefix}-${String(index + 1).padStart(3, "0")}.sql`; }
function definition(columns) { return columns.map(([name, type]) => `${name} ${type}`).join(","); }
function jsonLiteral(value) { return literal(JSON.stringify(value)); }
function literal(value) { return `'${String(value).replaceAll("'", "''")}'`; }
function batches(values, size) { const result = []; for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size)); return result; }
