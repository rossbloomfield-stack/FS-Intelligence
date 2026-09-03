import { describe, expect, it } from "vitest";
import {
  extractDiscoveryLinks,
  selectDiscoveryCandidates,
} from "@/lib/intelligence/ingestion/discovery";

describe("official-source discovery", () => {
  it("extracts RSS entries with their publication dates", () => {
    const feed = `
      <rss><channel><item>
        <title><![CDATA[Central Bank publishes consumer protection update]]></title>
        <link>https://www.centralbank.ie/news/article/consumer-protection-update</link>
        <pubDate>Wed, 02 Sep 2026 08:00:00 GMT</pubDate>
      </item></channel></rss>`;

    expect(
      extractDiscoveryLinks(
        feed,
        "https://www.centralbank.ie/feeds/news-media-feed",
        "application/rss+xml",
      ),
    ).toEqual([
      {
        canonicalUrl:
          "https://www.centralbank.ie/news/article/consumer-protection-update",
        title: "Central Bank publishes consumer protection update",
        publicationDate: "2026-09-02",
      },
    ]);
  });

  it("keeps only allowed, material links and excludes routine notices", () => {
    const html = `
      <a href="/content/dam/frontdoor/investorrelations/docs/se-announcements/2026/aib-interim-results-2026.pdf">
        AIB Interim Results 2026
      </a>
      <a href="/content/dam/frontdoor/investorrelations/docs/se-announcements/2026/transaction-own-shares.pdf">
        Transaction in own shares
      </a>
      <a href="https://example.com/other.pdf">Unapproved external report</a>`;
    const links = extractDiscoveryLinks(
      html,
      "https://www.aib.ie/investorrelations/stock-exchange-announcements/2026",
      "text/html",
    );

    expect(
      selectDiscoveryCandidates(links, {
        includePaths: [
          "/content/dam/frontdoor/investorrelations/docs/se-announcements/2026/",
        ],
        excludeTerms: ["transaction in own shares"],
        maxItems: 5,
        discoveryDate: "2026-09-03",
      }),
    ).toMatchObject([
      {
        canonicalUrl:
          "https://www.aib.ie/content/dam/frontdoor/investorrelations/docs/se-announcements/2026/aib-interim-results-2026.pdf",
        title: "AIB Interim Results 2026",
      },
    ]);
  });

  it("deduplicates URLs and respects the configured item ceiling", () => {
    const links = Array.from({ length: 15 }, (_, index) => ({
      canonicalUrl: `https://www.aviva.com/newsroom/news-and-research-overview/news-releases/2026/release-${index}`,
      title: `Aviva strategy release ${index}`,
      publicationDate: `2026-09-${String(Math.max(1, index + 1)).padStart(2, "0")}`,
    }));
    links.push(links[0]);

    const selected = selectDiscoveryCandidates(links, {
      includePaths: [
        "/newsroom/news-and-research-overview/news-releases/2026/",
      ],
      excludeTerms: [],
      maxItems: 4,
      discoveryDate: "2026-09-03",
    });

    expect(selected).toHaveLength(4);
    expect(new Set(selected.map((item) => item.canonicalUrl)).size).toBe(4);
  });
});
