import { describe, expect, it } from "vitest";
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
});
