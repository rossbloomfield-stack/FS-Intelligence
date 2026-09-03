import { describe, expect, it } from "vitest";
// The operational importer is intentionally plain ESM so it can run directly under Node.
// @ts-expect-error The ESM operations module does not publish TypeScript declarations.
import { buildRegistryDataset } from "../scripts/intelligence/workbook-registry.mjs";
import { mergeApprovedEvidenceRows } from "../src/lib/intelligence/retriever";

const connector = {
  "Source ID": "SRC-0001",
  Title: "Central Bank of Ireland",
  "Source Class": "Official / regulatory",
  "Canonical URL": "https://www.centralbank.ie/",
  "Canonical Domain": "www.centralbank.ie",
  Categorisation: "Regulation & Policy > Ireland",
  "Signal Type": "Hard",
  Geography: "Ireland",
  Priority: "P1",
  "Primary Ingestion Route": "Official HTML/PDF publication discovery",
  "Primary Endpoint URL": "https://www.centralbank.ie/publications/",
  "Endpoint Status": "Verified official publications hub",
  "Expected Formats": "HTML, PDF",
  "Recommended Cadence": "Daily",
  "Historical Backfill": "5 years minimum",
  "Parser Strategy": "HTML discovery + PDF parser",
  "Access / Licensing Note": "Public official source; respect terms and robots.",
  "Storage Policy": "Store metadata and permitted extracts.",
  "Deduplication Key": "canonical_url + publication_date",
  "Source Weight": 1,
};

const target = {
  "Reference ID": "REF-00001",
  "Parent Source ID": "SRC-0001",
  Title: "2026 policy publications",
  URL: "https://www.centralbank.ie/publications/",
  "Content Type": "HTML/PDF",
  "Date Catalogued": new Date("2026-08-31T00:00:00.000Z"),
  Categorisation: "Regulation & Policy > Ireland",
  "Signal Type": "Hard",
  Geography: "Ireland",
  Priority: "P1",
  "Reference Year": 2026,
  "Reference Stream": "2026 Policy / Rule Updates",
  "Record Type": "Expanded reference stream",
  "Resolution Status": "Discovery endpoint",
  "Ingestion URL": "https://www.centralbank.ie/publications/",
  "Fetch Method": "HTML/sitemap discovery",
  "Target Discovery Rule": "Match 2026 publications",
  "Connector Source Class": "Official / regulatory",
  "Endpoint Status": "Verified official publications hub",
  "Expected Formats": "HTML, PDF",
  "Parser Strategy": "HTML discovery + PDF parser",
  "Recommended Cadence": "Daily",
  "Historical Backfill": "5 years minimum",
  "Access / Licensing Note": "Public official source",
  "Storage Policy": "Store metadata and permitted extracts.",
  "Ingestion Readiness": "A — Ready to implement",
  "Readiness Reason": "Official endpoint verified",
  "Deduplication Key": "canonical_url + publication_date",
  "Reference Weight": 1,
  "Publication Date Required": "Yes",
  "Effective Date Required": "When applicable",
};

describe("market-intelligence workbook registry", () => {
  it("normalises valid rows and keeps fetching disabled", () => {
    const result = buildRegistryDataset({
      connectors: [connector],
      targets: [target],
      verifiedEndpoints: [{ "Verified URL": "https://www.centralbank.ie/publications/" }],
    });
    expect(result.errors).toEqual([]);
    expect(result.counts).toMatchObject({ sources: 1, targets: 1, ready: 1, enabled: 0 });
    expect(result.sources[0].source).toMatchObject({
      source_key: "SRC-0001",
      canonical_url: "https://www.centralbank.ie",
      signal_type: "hard",
      registry_active: false,
    });
    expect(result.sources[0].connector).toMatchObject({ endpoint_verified: true, approved_for_fetch: false, enabled: false });
    expect(result.referenceTargets[0]).toMatchObject({
      reference_key: "REF-00001",
      readiness_grade: "A",
      date_catalogued: "2026-08-31",
      approved_for_fetch: false,
      enabled: false,
    });
  });

  it("blocks C-grade targets and rejects broken lineage", () => {
    const result = buildRegistryDataset({
      connectors: [connector],
      targets: [{
        ...target,
        "Reference ID": "REF-00002",
        "Parent Source ID": "SRC-9999",
        "Ingestion Readiness": "C — Terms review required",
      }],
    });
    expect(result.errors.some((error: string) => error.includes("unknown Parent Source ID SRC-9999"))).toBe(true);
    expect(result.referenceTargets[0]).toMatchObject({
      readiness_grade: "C",
      approved_for_fetch: false,
      enabled: false,
      blocked_reason: "C — Terms review required",
    });
  });

  it("rejects duplicate source and reference identifiers", () => {
    const result = buildRegistryDataset({
      connectors: [connector, connector],
      targets: [target, target],
    });
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining("duplicate Source ID"),
      expect.stringContaining("duplicate Canonical URL"),
      expect.stringContaining("duplicate Reference ID"),
    ]));
  });
});

describe("approved evidence retrieval", () => {
  it("merges approved chunks into their citation-ready source without duplicating references", () => {
    const rows=mergeApprovedEvidenceRows([{
      id:"source-1",title:"Annual report",publisher:"Bank",url:"https://bank.example/report",publication_date:"2025-12-31",
      source_type:"company_results",primary_source:true,credibility_tier:1,evidence_classification:"primary",notes:"Existing note",
    }],[{
      source_item_id:"item-1",
      evidence_source_id:"source-1",title:"Annual report",publisher:"Bank",url:"https://bank.example/report",publication_date:"2025-12-31",
      source_type:"company_results",primary_source:true,credibility_tier:1,evidence_classification:"primary",chunk_content:"Wealth assets increased.",section_label:"Strategy",page_number:12,organisation_names:["Bank"],relevance:0.75,
    }]);
    expect(rows).toHaveLength(1);
    expect(rows[0].notes).toContain("Existing note");
    expect(rows[0].notes).toContain("Wealth assets increased. (Strategy, page 12)");
    expect(rows[0].passages).toEqual([expect.objectContaining({content:"Wealth assets increased.",relevance:0.75})]);
    expect(rows[0].organisation_names).toEqual(["Bank"]);
  });
});
