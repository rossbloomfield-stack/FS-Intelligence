import { createHash } from "node:crypto";
import { FatalError } from "workflow";
import { getDocumentProxy } from "unpdf";
import { fetchBoundedSource } from "@/lib/intelligence/ingestion/fetch-bounded";
import {
  assertAllowedIngestionUrl,
  buildAllowedHosts,
  chunkText,
  extractHtmlLinks,
  extractHtmlPublicationDate,
  extractHtmlTitle,
  normaliseCanonicalUrl,
  selectDocumentCandidate,
  selectEvidencePassages,
  stripHtml,
} from "@/lib/intelligence/ingestion/parser";
import type {
  ParsedSourceDocument,
  PersistedSourceDocument,
  SourceIngestionContext,
} from "@/schemas/source-ingestion";

// Annual reports are often image-heavy even when we retain only a bounded text
// subset. Keep the network ceiling finite while allowing the monitored banks'
// official reports to pass through the 160-page extraction boundary below.
const MAX_FETCH_BYTES = 48 * 1024 * 1024;
const MAX_PDF_PAGES = 160;
const MAX_PDF_EXTRACTION_MS = 45_000;
const organisationBySourceKey: Record<string, string> = {
  "SRC-0155": "canada-life",
  "SRC-0156": "zurich-ireland",
  "SRC-0167": "aib",
  "SRC-0168": "bank-of-ireland",
  "SRC-0192": "aviva-ireland",
};

export async function loadSourceIngestionContext(
  runId: string,
): Promise<SourceIngestionContext> {
  "use step";
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const db = createAdminClient();
  const { data: run, error: runError } = await db
    .from("source_ingestion_runs")
    .select("id,execution_key,connector_id,reference_target_id,status,metadata")
    .eq("id", runId)
    .single();
  if (runError || !run)
    throw new FatalError(`Ingestion run not found: ${runId}`);
  if (run.status !== "running")
    throw new FatalError(`Ingestion run is not claimed: ${run.status}`);
  if (!run.connector_id || !run.reference_target_id) {
    throw new FatalError("Ingestion run is missing its connector or target");
  }

  const [
    { data: connector, error: connectorError },
    { data: target, error: targetError },
  ] = await Promise.all([
    db
      .from("source_connectors")
      .select(
        "id,source_id,primary_endpoint_url,reporting_archive_url,enabled,approved_for_fetch",
      )
      .eq("id", run.connector_id)
      .single(),
    db
      .from("reference_targets")
      .select(
        "id,source_id,reference_key,title,url,ingestion_url,content_type,reference_year,publication_date_required,enabled,approved_for_fetch",
      )
      .eq("id", run.reference_target_id)
      .single(),
  ]);
  if (connectorError || !connector)
    throw new FatalError("Source connector is unavailable");
  if (targetError || !target)
    throw new FatalError("Reference target is unavailable");
  if (
    !connector.enabled ||
    !connector.approved_for_fetch ||
    !target.enabled ||
    !target.approved_for_fetch
  ) {
    throw new FatalError("Connector or target is not approved for fetch");
  }
  if (connector.source_id !== target.source_id) {
    throw new FatalError(
      "Connector and target belong to different parent sources",
    );
  }

  const { data: source, error: sourceError } = await db
    .from("sources")
    .select("id,source_key,title,source_class,canonical_domain,url")
    .eq("id", connector.source_id)
    .single();
  if (sourceError || !source?.source_key)
    throw new FatalError("Parent source is unavailable");
  const runMetadata = asRecord(run.metadata);
  const discoveredPublicationDate =
    typeof runMetadata.discoveredPublicationDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(runMetadata.discoveredPublicationDate)
      ? runMetadata.discoveredPublicationDate
      : null;

  return {
    runId: run.id,
    executionKey: run.execution_key,
    connectorId: connector.id,
    targetId: target.id,
    parentSourceId: source.id,
    sourceKey: source.source_key,
    sourceTitle: source.title,
    sourceClass: source.source_class,
    sourceCanonicalDomain: source.canonical_domain,
    sourceUrl: source.url,
    targetReferenceKey: target.reference_key,
    targetTitle: target.title,
    targetUrl: target.url,
    ingestionUrl: target.ingestion_url,
    contentType: target.content_type,
    referenceYear: target.reference_year,
    publicationDateRequired: target.publication_date_required,
    discoveredPublicationDate,
    primaryEndpointUrl: connector.primary_endpoint_url,
    reportingArchiveUrl: connector.reporting_archive_url,
  };
}

export async function fetchAndParseSource(
  context: SourceIngestionContext,
): Promise<ParsedSourceDocument> {
  "use step";
  const allowedHosts = buildAllowedHosts([
    context.sourceCanonicalDomain,
    context.sourceUrl,
    context.targetUrl,
    context.ingestionUrl,
    context.primaryEndpointUrl,
    context.reportingArchiveUrl,
  ]);
  const first = await fetchBoundedSource(context.ingestionUrl, allowedHosts, {
    maxBytes: MAX_FETCH_BYTES,
    timeoutMs: 45_000,
    accept: "text/html,application/pdf;q=0.9,*/*;q=0.5",
  });
  const firstType = contentType(first.response);
  let selected = first;
  let usedDiscoveryPage = false;

  if (firstType === "text/html") {
    const html = new TextDecoder().decode(first.body);
    if (looksLikeAccessChallenge(html)) {
      throw new FatalError(
        "The official source returned an access challenge instead of evidence",
      );
    }
    const allowedLinks = extractHtmlLinks(html, first.url).filter((link) => {
      try {
        assertAllowedIngestionUrl(link.href, allowedHosts);
        return true;
      } catch {
        return false;
      }
    });
    const candidate = selectDocumentCandidate(allowedLinks, {
      contentType: context.contentType,
      referenceYear: context.referenceYear,
      title: context.targetTitle,
    });
    if (candidate && candidate.href !== normaliseCanonicalUrl(first.url)) {
      selected = await fetchBoundedSource(candidate.href, allowedHosts, {
        maxBytes: MAX_FETCH_BYTES,
        timeoutMs: 45_000,
        accept: "text/html,application/pdf;q=0.9,*/*;q=0.5",
      });
      usedDiscoveryPage = true;
    }
  }

  const selectedType = contentType(selected.response);
  if (selectedType === "application/pdf") {
    const parsed = await parsePdf(selected.body, context);
    return {
      canonicalUrl: normaliseCanonicalUrl(selected.url),
      title: context.targetTitle,
      contentType: "application/pdf",
      publicationDate: context.discoveredPublicationDate,
      contentHash: sha256(selected.body),
      bytesFetched:
        first.body.byteLength +
        (selected === first ? 0 : selected.body.byteLength),
      pageCount: parsed.pageCount,
      pagesScanned: parsed.pagesScanned,
      extractionTruncated: parsed.extractionTruncated,
      usedDiscoveryPage,
      passages: finalisePassages(parsed.passages),
    };
  }

  if (selectedType !== "text/html") {
    throw new FatalError(
      `Unsupported response content type: ${selected.response.headers.get("content-type") ?? "unknown"}`,
    );
  }
  const html = new TextDecoder().decode(selected.body);
  if (looksLikeAccessChallenge(html)) {
    throw new FatalError(
      "The official source returned an access challenge instead of evidence",
    );
  }
  const text = stripHtml(html);
  const selectedPassages = selectEvidencePassages(
    chunkText(text, { sectionLabel: "Official web page" }),
    {
      title: context.targetTitle,
      contentType: context.contentType,
    },
  );
  if (!selectedPassages.length)
    throw new FatalError("No relevant evidence passages were extracted");
  return {
    canonicalUrl: normaliseCanonicalUrl(selected.url),
    title: extractHtmlTitle(html) ?? context.targetTitle,
    contentType: "text/html",
    publicationDate:
      extractHtmlPublicationDate(html) ?? context.discoveredPublicationDate,
    contentHash: sha256(selected.body),
    bytesFetched:
      first.body.byteLength +
      (selected === first ? 0 : selected.body.byteLength),
    pageCount: null,
    pagesScanned: null,
    extractionTruncated:
      text.length >
      selectedPassages.reduce(
        (sum, passage) => sum + passage.content.length,
        0,
      ),
    usedDiscoveryPage,
    passages: finalisePassages(selectedPassages),
  };
}

fetchAndParseSource.maxRetries = 2;

export async function persistParsedSource(
  context: SourceIngestionContext,
  document: ParsedSourceDocument,
): Promise<PersistedSourceDocument> {
  "use step";
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const db = createAdminClient();
  const release = context.executionKey.startsWith("r5.4:") ? "R5.4" : "R5.3";
  const evidenceClassification =
    context.sourceKey === "SRC-0001" ||
    /regulat/i.test(context.sourceClass ?? "")
      ? "primary_regulatory_source"
      : "primary_company_source";
  const itemKey = `r5.3:${sha256(document.canonicalUrl)}`;
  const { data: existing } = await db
    .from("source_items")
    .select("id,approved")
    .eq("item_key", itemKey)
    .maybeSingle();
  if (existing?.approved) {
    return {
      sourceItemId: existing.id,
      passageCount: document.passages.length,
      alreadyApproved: true,
    };
  }

  const { data: item, error: itemError } = await db
    .from("source_items")
    .upsert(
      {
        parent_source_id: context.parentSourceId,
        reference_target_id: context.targetId,
        item_key: itemKey,
        canonical_url: document.canonicalUrl,
        title: document.title,
        content_type: document.contentType,
        publication_date: document.publicationDate,
        factual_summary: null,
        extracted_facts: [],
        raw_storage_path: null,
        content_hash: document.contentHash,
        fetch_status: "parsed",
        rejection_reason: null,
        evidence_classification: evidenceClassification,
        approved: false,
        fetched_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
        metadata: {
          release,
          executionKey: context.executionKey,
          sourceKey: context.sourceKey,
          referenceKey: context.targetReferenceKey,
          pageCount: document.pageCount,
          pagesScanned: document.pagesScanned,
          extractionTruncated: document.extractionTruncated,
          usedDiscoveryPage: document.usedDiscoveryPage,
          publicationDateRequired: context.publicationDateRequired,
          discoveredPublicationDate: context.discoveredPublicationDate,
          approvalRequiredBeforeRetrieval: true,
        },
      },
      { onConflict: "item_key" },
    )
    .select("id")
    .single();
  if (itemError || !item)
    throw new Error(
      `Could not persist source item: ${itemError?.message ?? "unknown error"}`,
    );

  const { error: deleteError } = await db
    .from("source_chunks")
    .delete()
    .eq("source_item_id", item.id);
  if (deleteError)
    throw new Error(
      `Could not replace evidence passages: ${deleteError.message}`,
    );
  const { error: chunkError } = await db.from("source_chunks").insert(
    document.passages.map((passage, index) => ({
      source_item_id: item.id,
      chunk_index: index,
      content: passage.content,
      content_hash: passage.contentHash,
      token_count: passage.tokenCount,
      page_number: passage.pageNumber,
      section_label: passage.sectionLabel,
      claim_type: "bounded_extract",
      metadata: { release, relevanceScore: passage.relevanceScore },
    })),
  );
  if (chunkError)
    throw new Error(
      `Could not persist evidence passages: ${chunkError.message}`,
    );

  const organisationSlug = organisationBySourceKey[context.sourceKey];
  if (organisationSlug) {
    const { data: organisation } = await db
      .from("organisations")
      .select("id")
      .eq("slug", organisationSlug)
      .maybeSingle();
    if (organisation) {
      await db
        .from("source_item_organisations")
        .upsert({
          source_item_id: item.id,
          organisation_id: organisation.id,
          relationship: "subject",
        })
        .throwOnError();
    }
  }
  return {
    sourceItemId: item.id,
    passageCount: document.passages.length,
    alreadyApproved: false,
  };
}

export async function completeSourceIngestionRun(
  context: SourceIngestionContext,
  document: ParsedSourceDocument,
  persisted: PersistedSourceDocument,
) {
  "use step";
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const db = createAdminClient();
  const release = context.executionKey.startsWith("r5.4:") ? "R5.4" : "R5.3";
  const requiresDateReview =
    context.publicationDateRequired && !document.publicationDate;
  await db
    .from("source_ingestion_runs")
    .update({
      status: requiresDateReview ? "partial" : "completed",
      discovered_count: 1,
      fetched_count: 1,
      parsed_count: 1,
      error_count: 0,
      bytes_fetched: document.bytesFetched,
      completed_at: new Date().toISOString(),
      error_summary: requiresDateReview
        ? "Publication date requires human verification"
        : null,
      metadata: {
        release,
        sourceItemId: persisted.sourceItemId,
        passageCount: persisted.passageCount,
        alreadyApproved: persisted.alreadyApproved,
        approvalRequiredBeforeRetrieval: true,
        publicationDateRequired: context.publicationDateRequired,
        publicationDatePresent: Boolean(document.publicationDate),
        discoveredPublicationDate: context.discoveredPublicationDate,
        extractionTruncated: document.extractionTruncated,
      },
    })
    .eq("id", context.runId)
    .throwOnError();
  await db
    .from("source_connectors")
    .update({
      last_attempted_at: new Date().toISOString(),
      last_succeeded_at: new Date().toISOString(),
      consecutive_failures: 0,
    })
    .eq("id", context.connectorId)
    .throwOnError();
}

export async function failSourceIngestionRun(runId: string, message: string) {
  "use step";
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const db = createAdminClient();
  const { data: run } = await db
    .from("source_ingestion_runs")
    .select("connector_id,reference_target_id,metadata")
    .eq("id", runId)
    .maybeSingle();
  const blocked =
    /access challenge|not approved|not allowed|unsupported|not found|no relevant|exceeds the|HTTP (?:401|403|404)/i.test(
      message,
    );
  await db
    .from("source_ingestion_runs")
    .update({
      status: blocked ? "blocked" : "failed",
      error_count: 1,
      completed_at: new Date().toISOString(),
      error_summary: message.slice(0, 1_000),
      metadata: {
        ...asRecord(run?.metadata),
        release: asRecord(run?.metadata).release === "R5.4" ? "R5.4" : "R5.3",
        approvalRequiredBeforeRetrieval: true,
      },
    })
    .eq("id", runId)
    .throwOnError();
  await db.from("source_ingestion_failures").insert({
    run_id: runId,
    stage: "fetch_parse_persist",
    error_code: blocked ? "SOURCE_BLOCKED" : "INGESTION_FAILED",
    error_message: message.slice(0, 2_000),
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
        last_attempted_at: new Date().toISOString(),
        consecutive_failures: (connector?.consecutive_failures ?? 0) + 1,
      })
      .eq("id", run.connector_id);
  }
  if (blocked && run?.reference_target_id) {
    await db
      .from("reference_targets")
      .update({ blocked_reason: message.slice(0, 1_000) })
      .eq("id", run.reference_target_id);
  }
}

async function parsePdf(body: Uint8Array, context: SourceIngestionContext) {
  const pdf = await getDocumentProxy(body, {
    maxImageSize: 16_777_216,
    useSystemFonts: true,
  });
  const startedAt = Date.now();
  const pageCount = pdf.numPages;
  const maximumPages = Math.min(pageCount, MAX_PDF_PAGES);
  let pagesScanned = 0;
  const candidates = [];
  try {
    for (let pageNumber = 1; pageNumber <= maximumPages; pageNumber += 1) {
      if (Date.now() - startedAt > MAX_PDF_EXTRACTION_MS) break;
      const page = await pdf.getPage(pageNumber);
      const text = await page.getTextContent();
      const content = text.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      candidates.push(
        ...chunkText(content, {
          pageNumber,
          sectionLabel: `Page ${pageNumber}`,
        }),
      );
      page.cleanup();
      pagesScanned = pageNumber;
    }
  } finally {
    await pdf.cleanup();
  }
  const passages = selectEvidencePassages(candidates, {
    title: context.targetTitle,
    contentType: context.contentType,
  });
  if (!passages.length)
    throw new FatalError(
      "No relevant evidence passages were extracted from the PDF",
    );
  return {
    pageCount,
    pagesScanned,
    extractionTruncated:
      pageCount > pagesScanned ||
      Date.now() - startedAt > MAX_PDF_EXTRACTION_MS,
    passages,
  };
}

function finalisePassages(passages: ReturnType<typeof selectEvidencePassages>) {
  return passages.map((passage) => ({
    content: passage.content,
    pageNumber: passage.pageNumber,
    sectionLabel: passage.sectionLabel,
    contentHash: sha256(passage.content),
    tokenCount: Math.max(1, Math.ceil(passage.content.length / 4)),
    relevanceScore: passage.score ?? 0,
  }));
}

function contentType(response: Response) {
  const value = response.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLocaleLowerCase("en-IE");
  if (value === "application/pdf") return value;
  if (value === "text/html" || value === "application/xhtml+xml")
    return "text/html";
  return value ?? "unknown";
}

function looksLikeAccessChallenge(html: string) {
  const text = stripHtml(html);
  return (
    text.length < 300 ||
    /incapsula|access denied|reference error|captcha|verify you are human/i.test(
      text,
    )
  );
}

function sha256(value: Uint8Array | string) {
  return createHash("sha256").update(value).digest("hex");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
