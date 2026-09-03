import readXlsxFile from "read-excel-file/node";

const connectorSheetName = "P1 Connector Config";
const targetSheetName = "P1 Ingestion Register";
const verifiedSheetName = "Verified Endpoints";

export async function readMarketIntelligenceWorkbook(filePath) {
  const workbookSheets = await readXlsxFile(filePath);
  const sheetData = (name) => workbookSheets.find((entry) => entry.sheet === name)?.data;
  const connectorValues = sheetData(connectorSheetName);
  const targetValues = sheetData(targetSheetName);
  const verifiedValues = sheetData(verifiedSheetName);
  const connectors = worksheetRows(connectorValues, connectorSheetName);
  const targets = worksheetRows(targetValues, targetSheetName);
  const verifiedEndpoints = worksheetRows(verifiedValues, verifiedSheetName);
  return buildRegistryDataset({ connectors, targets, verifiedEndpoints });
}

export function buildRegistryDataset({ connectors, targets, verifiedEndpoints = [] }) {
  const errors = [];
  const warnings = [];
  const seenSourceKeys = new Set();
  const seenCanonicalUrls = new Set();
  const seenReferenceKeys = new Set();
  const sourceKeys = new Set(connectors.map((row) => text(row["Source ID"])));
  const verifiedUrls = new Set(
    verifiedEndpoints
      .map((row) => normaliseUrl(row["Verified URL"]))
      .filter(Boolean),
  );

  const sources = connectors.map((row, index) => {
    const rowNumber = index + 2;
    const sourceKey = text(row["Source ID"]);
    const canonicalUrl = normaliseUrl(row["Canonical URL"]);
    requirePattern(sourceKey, /^SRC-\d{4}$/, `Connector row ${rowNumber}: invalid Source ID`, errors);
    requireUrl(canonicalUrl, `Connector row ${rowNumber}: invalid Canonical URL`, errors);
    uniqueValue(sourceKey, seenSourceKeys, `Connector row ${rowNumber}: duplicate Source ID`, errors);
    uniqueValue(canonicalUrl, seenCanonicalUrls, `Connector row ${rowNumber}: duplicate Canonical URL`, errors);
    const sourceWeight = decimal(row["Source Weight"]);
    requireRange(sourceWeight, 0, 1, `Connector row ${rowNumber}: invalid Source Weight`, errors);
    const signalType = enumText(row["Signal Type"], ["hard", "soft"]);
    if (!signalType) errors.push(`Connector row ${rowNumber}: Signal Type must be Hard or Soft`);
    const primaryEndpointUrl = normaliseUrl(row["Primary Endpoint URL"]);
    requireUrl(primaryEndpointUrl, `Connector row ${rowNumber}: invalid Primary Endpoint URL`, errors);
    const endpointStatus = text(row["Endpoint Status"]);
    const accessNote = text(row["Access / Licensing Note"]);
    const endpointVerified = /verified/i.test(endpointStatus) || verifiedUrls.has(primaryEndpointUrl);
    const termsReviewRequired = /review required|terms review|licen[cs]ing review/i.test(accessNote);
    return {
      source: {
        source_key: sourceKey,
        url: canonicalUrl,
        canonical_url: canonicalUrl,
        title: requiredText(row["Title"], `Connector row ${rowNumber}: Title is required`, errors),
        publisher: requiredText(row["Title"], `Connector row ${rowNumber}: Title is required`, errors),
        source_type: requiredText(row["Source Class"], `Connector row ${rowNumber}: Source Class is required`, errors),
        publication_date: null,
        primary_source: isPrimarySource(text(row["Source Class"])),
        credibility_tier: credibilityTier(sourceWeight),
        evidence_classification: "source_registry",
        notes: "Parent source registry record imported from the controlled market-intelligence workbook.",
        approved_public: false,
        registry_kind: "parent_source",
        canonical_domain: text(row["Canonical Domain"]),
        source_class: text(row["Source Class"]),
        categorisation: text(row["Categorisation"]),
        signal_type: signalType,
        geography: text(row["Geography"]),
        priority: text(row["Priority"]).toUpperCase(),
        source_weight: sourceWeight,
        registry_status: "catalogued",
        registry_active: false,
        access_licensing_note: accessNote || null,
        storage_policy: nullableText(row["Storage Policy"]),
        implementation_notes: nullableText(row["Implementation Notes"]),
      },
      connector: {
        ingestion_route: requiredText(row["Primary Ingestion Route"], `Connector row ${rowNumber}: Primary Ingestion Route is required`, errors),
        primary_endpoint_url: primaryEndpointUrl,
        api_docs_url: optionalUrl(row["API Base / Docs URL"], `Connector row ${rowNumber}: invalid API Base / Docs URL`, errors),
        reporting_archive_url: optionalUrl(row["Reporting / Archive URL"], `Connector row ${rowNumber}: invalid Reporting / Archive URL`, errors),
        endpoint_status: endpointStatus,
        candidate_sitemap_url: optionalUrl(row["Candidate Sitemap"], `Connector row ${rowNumber}: invalid Candidate Sitemap`, errors),
        robots_url: optionalUrl(row["Robots URL"], `Connector row ${rowNumber}: invalid Robots URL`, errors),
        expected_formats: list(row["Expected Formats"]),
        recommended_cadence: requiredText(row["Recommended Cadence"], `Connector row ${rowNumber}: Recommended Cadence is required`, errors),
        historical_backfill: nullableText(row["Historical Backfill"]),
        parser_strategy: requiredText(row["Parser Strategy"], `Connector row ${rowNumber}: Parser Strategy is required`, errors),
        deduplication_key: requiredText(row["Deduplication Key"], `Connector row ${rowNumber}: Deduplication Key is required`, errors),
        endpoint_verified: endpointVerified,
        terms_review_required: termsReviewRequired,
        approved_for_fetch: false,
        enabled: false,
      },
    };
  });

  const referenceTargets = targets.map((row, index) => {
    const rowNumber = index + 2;
    const referenceKey = text(row["Reference ID"]);
    const sourceKey = text(row["Parent Source ID"]);
    requirePattern(referenceKey, /^REF-\d{5}$/, `Target row ${rowNumber}: invalid Reference ID`, errors);
    uniqueValue(referenceKey, seenReferenceKeys, `Target row ${rowNumber}: duplicate Reference ID`, errors);
    if (!sourceKeys.has(sourceKey)) errors.push(`Target row ${rowNumber}: unknown Parent Source ID ${sourceKey || "(blank)"}`);
    const url = normaliseUrl(row.URL);
    const ingestionUrl = normaliseUrl(row["Ingestion URL"]);
    requireUrl(url, `Target row ${rowNumber}: invalid URL`, errors);
    requireUrl(ingestionUrl, `Target row ${rowNumber}: invalid Ingestion URL`, errors);
    const readiness = requiredText(row["Ingestion Readiness"], `Target row ${rowNumber}: Ingestion Readiness is required`, errors);
    const readinessGrade = readiness.match(/^([ABC])\b/)?.[1] ?? "";
    if (!readinessGrade) errors.push(`Target row ${rowNumber}: unsupported Ingestion Readiness ${readiness || "(blank)"}`);
    const weight = decimal(row["Reference Weight"]);
    requireRange(weight, 0, 1, `Target row ${rowNumber}: invalid Reference Weight`, errors);
    const signalType = enumText(row["Signal Type"], ["hard", "soft"]);
    if (!signalType) errors.push(`Target row ${rowNumber}: Signal Type must be Hard or Soft`);
    return {
      reference_key: referenceKey,
      source_key: sourceKey,
      title: requiredText(row.Title, `Target row ${rowNumber}: Title is required`, errors),
      url,
      content_type: requiredText(row["Content Type"], `Target row ${rowNumber}: Content Type is required`, errors),
      date_catalogued: dateValue(row["Date Catalogued"]),
      categorisation: requiredText(row.Categorisation, `Target row ${rowNumber}: Categorisation is required`, errors),
      signal_type: signalType,
      geography: requiredText(row.Geography, `Target row ${rowNumber}: Geography is required`, errors),
      priority: text(row.Priority).toUpperCase(),
      reference_year: integerOrNull(row["Reference Year"]),
      reference_stream: requiredText(row["Reference Stream"], `Target row ${rowNumber}: Reference Stream is required`, errors),
      record_type: requiredText(row["Record Type"], `Target row ${rowNumber}: Record Type is required`, errors),
      resolution_status: requiredText(row["Resolution Status"], `Target row ${rowNumber}: Resolution Status is required`, errors),
      ingestion_url: ingestionUrl,
      fetch_method: requiredText(row["Fetch Method"], `Target row ${rowNumber}: Fetch Method is required`, errors),
      target_discovery_rule: nullableText(row["Target Discovery Rule"]),
      connector_source_class: nullableText(row["Connector Source Class"]),
      endpoint_status: nullableText(row["Endpoint Status"]),
      expected_formats: list(row["Expected Formats"]),
      parser_strategy: nullableText(row["Parser Strategy"]),
      recommended_cadence: nullableText(row["Recommended Cadence"]),
      historical_backfill: nullableText(row["Historical Backfill"]),
      access_licensing_note: nullableText(row["Access / Licensing Note"]),
      storage_policy: nullableText(row["Storage Policy"]),
      ingestion_readiness: readiness,
      readiness_grade: readinessGrade,
      readiness_reason: nullableText(row["Readiness Reason"]),
      deduplication_key: requiredText(row["Deduplication Key"], `Target row ${rowNumber}: Deduplication Key is required`, errors),
      reference_weight: weight,
      publication_date_required: yesValue(row["Publication Date Required"]),
      effective_date_required: yesValue(row["Effective Date Required"]),
      approved_for_fetch: false,
      enabled: false,
      blocked_reason: readinessGrade === "C" ? readiness || "Approval required" : null,
    };
  });

  const duplicateIngestionUrls = duplicateGroups(referenceTargets, (row) => row.ingestion_url);
  if (duplicateIngestionUrls.length) warnings.push(`${duplicateIngestionUrls.length} shared ingestion URL groups retained as separate reference targets.`);
  const counts = {
    sources: sources.length,
    targets: referenceTargets.length,
    verifiedEndpoints: verifiedEndpoints.length,
    ready: referenceTargets.filter((row) => row.readiness_grade === "A").length,
    discovery: referenceTargets.filter((row) => row.readiness_grade === "B").length,
    blocked: referenceTargets.filter((row) => row.readiness_grade === "C").length,
    enabled: referenceTargets.filter((row) => row.enabled).length,
  };
  return { sources, referenceTargets, counts, errors, warnings };
}

function worksheetRows(values, name) {
  if (!values?.length) throw new Error(`Workbook is missing required sheet or data: ${name}`);
  const headers = values[0].map(text);
  return values.slice(1).flatMap((row) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null]).filter(([header]) => header));
    return Object.values(record).some((value) => text(value)) ? [record] : [];
  });
}

function text(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value) return String(value.text).trim();
    if ("result" in value) return text(value.result);
    if ("richText" in value) return value.richText.map((part) => part.text).join("").trim();
  }
  return String(value).trim();
}

function nullableText(value) { return text(value) || null; }
function requiredText(value, message, errors) { const result = text(value); if (!result) errors.push(message); return result; }
function decimal(value) { const result = Number(value); return Number.isFinite(result) ? result : Number.NaN; }
function integerOrNull(value) { const result = Number(value); return Number.isInteger(result) ? result : null; }
function enumText(value, allowed) { const result = text(value).toLocaleLowerCase("en-IE"); return allowed.includes(result) ? result : ""; }
function list(value) { return [...new Set(text(value).split(/[,;/|]+/).map((item) => item.trim()).filter(Boolean))]; }
function yesValue(value) { return /^(yes|true|when applicable)$/i.test(text(value)); }
function normaliseUrl(value) { const result = text(value); return result ? result.replace(/\/$/, "") : ""; }
function optionalUrl(value, message, errors) { const result = normaliseUrl(value); if (result) requireUrl(result, message, errors); return result || null; }
function requireUrl(value, message, errors) { try { const parsed = new URL(value); if (!["http:", "https:"].includes(parsed.protocol)) errors.push(message); } catch { errors.push(message); } }
function requirePattern(value, pattern, message, errors) { if (!pattern.test(value)) errors.push(message); }
function requireRange(value, min, max, message, errors) { if (!Number.isFinite(value) || value < min || value > max) errors.push(message); }
function uniqueValue(value, seen, message, errors) { if (seen.has(value)) errors.push(message); else seen.add(value); }
function credibilityTier(weight) { if (weight >= 0.95) return 1; if (weight >= 0.8) return 2; return 3; }
function isPrimarySource(sourceClass) { return ["Official / regulatory", "Data/API", "Financial-services provider"].includes(sourceClass); }
function duplicateGroups(rows, selector) { const values = new Map(); for (const row of rows) { const key = selector(row); values.set(key, (values.get(key) ?? 0) + 1); } return [...values].filter(([, count]) => count > 1); }

function dateValue(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + value * 86400000).toISOString().slice(0, 10);
  }
  const raw = text(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}
