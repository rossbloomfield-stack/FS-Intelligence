import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  assertAllowedIngestionUrl,
  buildAllowedHosts,
  chunkText,
  extractHtmlLinks,
  extractHtmlPublicationDate,
  selectDocumentCandidate,
  selectEvidencePassages,
} from "../src/lib/intelligence/ingestion/parser";

describe("R5.3 bounded source ingestion", () => {
  it("permits only explicitly registered HTTPS hosts", () => {
    const hosts = buildAllowedHosts(["https://www.aib.ie/results", "aib.ie"]);
    expect(assertAllowedIngestionUrl("https://www.aib.ie/report.pdf", hosts).hostname).toBe("www.aib.ie");
    expect(() => assertAllowedIngestionUrl("http://www.aib.ie/report.pdf", hosts)).toThrow(/HTTPS/);
    expect(() => assertAllowedIngestionUrl("https://127.0.0.1/report.pdf", hosts)).toThrow(/network/);
    expect(() => assertAllowedIngestionUrl("https://example.com/report.pdf", hosts)).toThrow(/not approved/);
  });

  it("discovers the strongest target-specific official document", () => {
    const html = `
      <a href="/reports/2025/aib-annual-report-2025.pdf">Annual report 2025</a>
      <a href="/reports/2025/aib-results-presentation.pdf">FY 2025 Results Presentation</a>
      <a href="/reports/2024/aib-results-presentation.pdf">FY 2024 Results Presentation</a>
    `;
    const links = extractHtmlLinks(html, "https://www.aib.ie/results/");
    const candidate = selectDocumentCandidate(links, {
      contentType: "Results presentation",
      referenceYear: 2025,
      title: "AIB — FY 2025 Results Presentation",
    });
    expect(candidate?.href).toContain("2025/aib-results-presentation.pdf");
  });

  it("extracts explicit publication metadata without inferring from a reporting year", () => {
    expect(
      extractHtmlPublicationDate('<meta property="article:published_time" content="2026-03-05T08:30:00Z">'),
    ).toBe("2026-03-05");
    expect(extractHtmlPublicationDate("<h1>Annual report 2025</h1>")).toBeNull();
  });

  it("retains a bounded set of strategy-relevant passages", () => {
    const candidates = [
      ...chunkText("Navigation contact cookies privacy policy accessibility statement ".repeat(10)),
      ...chunkText(
        "Our strategy is to deepen customer relationships through digital investment, wealth growth and technology transformation. ".repeat(20),
        { pageNumber: 8, sectionLabel: "Strategic report" },
      ),
      ...chunkText(
        "Capital strength and operating profit support investment in customer service and artificial intelligence. ".repeat(20),
        { pageNumber: 25, sectionLabel: "Performance" },
      ),
    ];
    const selected = selectEvidencePassages(candidates, {
      title: "Annual Report 2025",
      contentType: "Annual report",
      limit: 2,
    });
    expect(selected).toHaveLength(2);
    expect(selected.every((passage) => /strategy|capital/i.test(passage.content))).toBe(true);
  });

  it("fast-tracks only complete evidence from verified primary sources", () => {
    const migration = readFileSync(
      "supabase/migrations/20260908213000_r4_corpus_activation.sql",
      "utf8",
    );
    expect(migration).toContain("parent.primary_source");
    expect(migration).toContain("parent.credibility_tier <= 2");
    expect(migration).toContain("target.readiness_grade = 'A'");
    expect(migration).toContain("connector.endpoint_verified");
    expect(migration).toContain("not connector.terms_review_required");
    expect(migration).toContain("item.publication_date is not null");
    expect(migration).toContain("extractionTruncated");
    expect(migration).toContain("source_item_auto_approved");
  });

  it("keeps expanded ingestion bounded and service-role only", () => {
    const migration = readFileSync(
      "supabase/migrations/20260908213000_r4_corpus_activation.sql",
      "utf8",
    );
    expect(migration).toContain("least(coalesce(p_limit, 5), 20)");
    expect(migration).toContain("current_user <> 'service_role'");
    expect(migration).toContain(
      "revoke all on function public.promote_trusted_primary_source_items",
    );
  });

  it("accepts only substantial material passages from bounded official web pages", () => {
    const migration = readFileSync(
      "supabase/migrations/20260908214500_r4_trusted_bounded_web_evidence.sql",
      "utf8",
    );
    expect(migration).toContain("item.content_type = 'text/html'");
    expect(migration).toContain("material_chunk.token_count >= 250");
    expect(migration).toContain("relevanceScore");
    expect(migration).toContain(">= 20");
  });
});
