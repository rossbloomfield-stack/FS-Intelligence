import { createHash } from "node:crypto";
import { FatalError } from "workflow";
import { start } from "workflow/api";
import {
  extractDiscoveryLinks,
  selectDiscoveryCandidates,
} from "@/lib/intelligence/ingestion/discovery";
import { fetchBoundedSource } from "@/lib/intelligence/ingestion/fetch-bounded";
import { buildAllowedHosts } from "@/lib/intelligence/ingestion/parser";
import type {
  SourceDiscoveryCandidate,
  SourceDiscoveryContext,
  SourceDiscoveryResult,
} from "@/schemas/source-discovery";
import { sourceIngestionWorkflow } from "@/workflows/source-ingestion";

const MAX_DISCOVERY_BYTES = 6 * 1024 * 1024;

export async function loadSourceDiscoveryContext(
  runId: string,
): Promise<SourceDiscoveryContext> {
  "use step";
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const db = createAdminClient();
  const { data: run, error: runError } = await db
    .from("source_ingestion_runs")
    .select("id,connector_id,run_type,status,metadata")
    .eq("id", runId)
    .single();
  if (runError || !run)
    throw new FatalError(`Discovery run not found: ${runId}`);
  if (
    run.run_type !== "connector" ||
    run.status !== "running" ||
    !run.connector_id
  )
    throw new FatalError("Discovery run is not claimed as a connector run");
  const { data: connector, error: connectorError } = await db
    .from("source_connectors")
    .select(
      "id,source_id,primary_endpoint_url,reporting_archive_url,candidate_sitemap_url,enabled,approved_for_fetch,endpoint_verified,terms_review_required,discovery_enabled,discovery_url,discovery_include_paths,discovery_exclude_terms,discovery_max_items",
    )
    .eq("id", run.connector_id)
    .single();
  if (connectorError || !connector)
    throw new FatalError("Discovery connector is unavailable");
  if (
    !connector.discovery_enabled ||
    !connector.enabled ||
    !connector.approved_for_fetch ||
    !connector.endpoint_verified ||
    connector.terms_review_required ||
    !connector.discovery_url
  )
    throw new FatalError("Connector is not approved for recurring discovery");
  const { data: source, error: sourceError } = await db
    .from("sources")
    .select(
      "id,source_key,title,url,canonical_domain,source_class,categorisation,signal_type,geography,priority,source_weight,access_licensing_note,storage_policy",
    )
    .eq("id", connector.source_id)
    .single();
  if (sourceError || !source?.source_key)
    throw new FatalError("Discovery parent source is unavailable");
  const metadata = asRecord(run.metadata);
  const discoveryDate =
    typeof metadata.discoveryDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(metadata.discoveryDate)
      ? metadata.discoveryDate
      : new Date().toISOString().slice(0, 10);
  return {
    runId,
    connectorId: connector.id,
    discoveryDate,
    discoveryUrl: connector.discovery_url,
    includePaths: connector.discovery_include_paths,
    excludeTerms: connector.discovery_exclude_terms,
    maxItems: connector.discovery_max_items,
    parentSourceId: source.id,
    sourceKey: source.source_key,
    sourceTitle: source.title,
    sourceUrl: source.url,
    sourceCanonicalDomain: source.canonical_domain,
    sourceClass: source.source_class,
    categorisation: source.categorisation,
    signalType: source.signal_type,
    geography: source.geography,
    priority: source.priority,
    sourceWeight:
      source.source_weight === null ? null : Number(source.source_weight),
    accessLicensingNote: source.access_licensing_note,
    storagePolicy: source.storage_policy,
    primaryEndpointUrl: connector.primary_endpoint_url,
    reportingArchiveUrl: connector.reporting_archive_url,
    candidateSitemapUrl: connector.candidate_sitemap_url,
  };
}

export async function discoverSourceCandidates(
  context: SourceDiscoveryContext,
) {
  "use step";
  const allowedHosts = buildAllowedHosts([
    context.sourceCanonicalDomain,
    context.sourceUrl,
    context.discoveryUrl,
    context.primaryEndpointUrl,
    context.reportingArchiveUrl,
    context.candidateSitemapUrl,
  ]);
  const fetched = await fetchBoundedSource(context.discoveryUrl, allowedHosts, {
    maxBytes: MAX_DISCOVERY_BYTES,
    timeoutMs: 30_000,
    accept:
      "application/rss+xml,application/atom+xml,application/xml,text/xml,text/html;q=0.9,*/*;q=0.2",
  });
  const type =
    fetched.response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLocaleLowerCase("en-IE") ?? "unknown";
  if (!/xml|html/.test(type))
    throw new FatalError(`Unsupported discovery content type: ${type}`);
  const content = new TextDecoder().decode(fetched.body);
  const links = extractDiscoveryLinks(content, fetched.url, type);
  const candidates = selectDiscoveryCandidates(links, {
    includePaths: context.includePaths,
    excludeTerms: context.excludeTerms,
    // Keep a wider bounded pool so previously seen top-ranked links do not
    // prevent a new publication lower in the official listing from reaching
    // the connector's daily new-item ceiling.
    maxItems: Math.min(context.maxItems * 4, 40),
    discoveryDate: context.discoveryDate,
  });
  return { candidates, bytesFetched: fetched.body.byteLength };
}

discoverSourceCandidates.maxRetries = 2;

export async function persistDiscoveredSources(
  context: SourceDiscoveryContext,
  candidates: SourceDiscoveryCandidate[],
  bytesFetched: number,
): Promise<SourceDiscoveryResult> {
  "use step";
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const db = createAdminClient();
  const urls = candidates.map((candidate) => candidate.canonicalUrl);
  const [targetsResult, itemsResult] = urls.length
    ? await Promise.all([
        db
          .from("reference_targets")
          .select("ingestion_url")
          .in("ingestion_url", urls),
        db
          .from("source_items")
          .select("canonical_url")
          .in("canonical_url", urls),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (targetsResult.error || itemsResult.error)
    throw new Error(
      `Could not deduplicate discovery candidates: ${targetsResult.error?.message ?? itemsResult.error?.message}`,
    );
  const existing = new Set([
    ...(targetsResult.data ?? []).map((item) => item.ingestion_url),
    ...(itemsResult.data ?? []).map((item) => item.canonical_url),
  ]);
  let queuedCount = 0;
  let duplicateCount = 0;
  for (const candidate of candidates) {
    if (existing.has(candidate.canonicalUrl)) {
      duplicateCount += 1;
      continue;
    }
    if (queuedCount >= context.maxItems) break;
    const digest = sha256(candidate.canonicalUrl);
    const referenceKey = `DISC-${context.sourceKey}-${digest.slice(0, 16).toUpperCase()}`;
    const format = candidate.canonicalUrl
      .toLocaleLowerCase("en-IE")
      .includes(".pdf")
      ? "PDF"
      : "HTML";
    const { data: target, error: targetError } = await db
      .from("reference_targets")
      .upsert(
        {
          reference_key: referenceKey,
          source_id: context.parentSourceId,
          title: candidate.title,
          url: candidate.canonicalUrl,
          content_type: "News release",
          date_catalogued: context.discoveryDate,
          categorisation: context.categorisation ?? "Strategy & performance",
          signal_type: context.signalType ?? "hard",
          geography: context.geography ?? "Ireland / international benchmark",
          priority: context.priority ?? "P1",
          reference_year: Number(
            (candidate.publicationDate ?? context.discoveryDate).slice(0, 4),
          ),
          reference_stream: "Daily official-source discovery",
          record_type: "Discovered official publication",
          resolution_status: "Resolved — approved official listing",
          ingestion_url: candidate.canonicalUrl,
          fetch_method: "HTTPS GET",
          target_discovery_rule:
            "R5.4 exact-host and configured-path discovery",
          connector_source_class: context.sourceClass,
          endpoint_status: "Verified",
          expected_formats: [format],
          parser_strategy:
            format === "PDF"
              ? "Bounded PDF text parser"
              : "Bounded HTML text parser",
          recommended_cadence: "One-time after daily discovery",
          historical_backfill: "Not applicable",
          access_licensing_note: context.accessLicensingNote,
          storage_policy: context.storagePolicy,
          ingestion_readiness: "Ready — discovered on an approved connector",
          readiness_grade: "A",
          readiness_reason:
            "Official same-host item discovered through an administrator-approved listing",
          deduplication_key: "canonical_url",
          reference_weight: context.sourceWeight ?? 0.9,
          publication_date_required: true,
          effective_date_required: false,
          approved_for_fetch: true,
          enabled: true,
          blocked_reason: null,
        },
        { onConflict: "reference_key" },
      )
      .select("id")
      .single();
    if (targetError || !target)
      throw new Error(
        `Could not persist discovered target: ${targetError?.message ?? "unknown error"}`,
      );
    const { error: runError } = await db.from("source_ingestion_runs").upsert(
      {
        execution_key: `r5.4:item:${digest}`,
        connector_id: context.connectorId,
        reference_target_id: target.id,
        run_type: "target",
        status: "queued",
        metadata: {
          release: "R5.4",
          scope: "daily official-source discovery",
          discoveryRunId: context.runId,
          discoveredPublicationDate: candidate.publicationDate,
          approvalRequiredBeforeRetrieval: true,
        },
      },
      { onConflict: "execution_key", ignoreDuplicates: true },
    );
    if (runError)
      throw new Error(`Could not queue discovered target: ${runError.message}`);
    queuedCount += 1;
    existing.add(candidate.canonicalUrl);
  }
  const now = new Date().toISOString();
  await db
    .from("source_ingestion_runs")
    .update({
      status: "completed",
      discovered_count: candidates.length,
      fetched_count: 1,
      parsed_count: queuedCount,
      rejected_count: duplicateCount,
      error_count: 0,
      bytes_fetched: bytesFetched,
      completed_at: now,
      error_summary: null,
      metadata: {
        release: "R5.4",
        scope: "daily official-source discovery",
        discoveryDate: context.discoveryDate,
        candidateCount: candidates.length,
        queuedCount,
        duplicateCount,
        approvalRequiredBeforeRetrieval: true,
      },
    })
    .eq("id", context.runId)
    .throwOnError();
  await db
    .from("source_connectors")
    .update({
      discovery_last_attempted_at: now,
      discovery_last_succeeded_at: now,
      consecutive_failures: 0,
    })
    .eq("id", context.connectorId)
    .throwOnError();
  return {
    candidateCount: candidates.length,
    queuedCount,
    duplicateCount,
    bytesFetched,
  };
}

export async function failSourceDiscoveryRun(runId: string, message: string) {
  "use step";
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const db = createAdminClient();
  const { data: run } = await db
    .from("source_ingestion_runs")
    .select("connector_id,metadata")
    .eq("id", runId)
    .maybeSingle();
  const blocked =
    /not approved|not allowed|unsupported|HTTP (?:401|403|404)|access challenge|exceeds the/i.test(
      message,
    );
  await db
    .from("source_ingestion_runs")
    .update({
      status: blocked ? "blocked" : "failed",
      error_count: 1,
      completed_at: new Date().toISOString(),
      error_summary: message.slice(0, 1000),
      metadata: {
        ...asRecord(run?.metadata),
        release: "R5.4",
        scope: "daily official-source discovery",
      },
    })
    .eq("id", runId)
    .throwOnError();
  await db.from("source_ingestion_failures").insert({
    run_id: runId,
    source_url: null,
    stage: "source_discovery",
    error_code: blocked ? "DISCOVERY_BLOCKED" : "DISCOVERY_FAILED",
    error_message: message.slice(0, 2000),
    retryable: !blocked,
  });
  if (run?.connector_id) {
    const { data: connector } = await db
      .from("source_connectors")
      .select("consecutive_failures")
      .eq("id", run.connector_id)
      .single();
    await db
      .from("source_connectors")
      .update({
        discovery_last_attempted_at: new Date().toISOString(),
        consecutive_failures: (connector?.consecutive_failures ?? 0) + 1,
      })
      .eq("id", run.connector_id);
  }
}

export async function startDiscoveredSourceIngestion(limit: number) {
  "use step";
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const db = createAdminClient();
  const { data: claimed, error } = await db.rpc("claim_source_ingestion_runs", {
    p_limit: Math.max(1, Math.min(limit, 5)),
  });
  if (error)
    throw new Error(`Could not claim discovered ingestion: ${error.message}`);
  const started: Array<{ runId: string; workflowRunId: string }> = [];
  const failures: Array<{ runId: string; error: string }> = [];
  for (const row of claimed ?? []) {
    try {
      const workflowRun = await start(sourceIngestionWorkflow, [row.id]);
      await db
        .from("source_ingestion_runs")
        .update({ workflow_run_id: workflowRun.runId })
        .eq("id", row.id)
        .throwOnError();
      started.push({ runId: row.id, workflowRunId: workflowRun.runId });
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Could not start discovered ingestion";
      await db
        .from("source_ingestion_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_summary: message.slice(0, 1000),
        })
        .eq("id", row.id);
      failures.push({ runId: row.id, error: message });
    }
  }
  return { claimed: (claimed ?? []).length, started, failures };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
