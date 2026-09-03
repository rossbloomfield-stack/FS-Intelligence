import {
  extractHtmlLinks,
  normaliseCanonicalUrl,
  normaliseDate,
  stripHtml,
} from "@/lib/intelligence/ingestion/parser";
import type { SourceDiscoveryCandidate } from "@/schemas/source-discovery";

const strategicTerms = [
  "ai",
  "artificial intelligence",
  "customer",
  "digital",
  "insurance",
  "investment",
  "mortgage",
  "pension",
  "profit",
  "regulat",
  "results",
  "strategy",
  "technology",
  "wealth",
];

export function extractDiscoveryLinks(
  content: string,
  baseUrl: string,
  contentType: string,
) {
  if (
    /(?:application|text)\/(?:rss\+xml|atom\+xml|xml)/i.test(contentType) ||
    /<(?:rss|feed)\b/i.test(content)
  )
    return extractFeedLinks(content, baseUrl);
  return extractHtmlLinks(content, baseUrl).map((link) => ({
    canonicalUrl: link.href,
    title: link.label,
    publicationDate: inferPublicationDate(`${link.label} ${link.href}`),
  }));
}

export function selectDiscoveryCandidates(
  links: Array<{
    canonicalUrl: string;
    title: string;
    publicationDate: string | null;
  }>,
  options: {
    includePaths: string[];
    excludeTerms: string[];
    maxItems: number;
    discoveryDate: string;
  },
): SourceDiscoveryCandidate[] {
  const includes = options.includePaths.map((value) =>
    value.toLocaleLowerCase("en-IE"),
  );
  const excludes = options.excludeTerms.map((value) =>
    normaliseSearchText(value),
  );
  const unique = new Map<string, SourceDiscoveryCandidate>();
  for (const link of links) {
    let canonicalUrl: string;
    try {
      canonicalUrl = normaliseCanonicalUrl(link.canonicalUrl);
    } catch {
      continue;
    }
    const searchable = normaliseSearchText(
      `${link.title} ${decodeURIComponent(canonicalUrl)}`,
    );
    const urlText = canonicalUrl.toLocaleLowerCase("en-IE");
    if (!includes.some((path) => urlText.includes(path))) continue;
    if (excludes.some((term) => term && searchable.includes(term))) continue;
    const title = stripHtml(link.title)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
    if (title.length < 8) continue;
    const publicationDate =
      link.publicationDate ??
      inferPublicationDate(`${title} ${canonicalUrl}`, options.discoveryDate);
    const score = scoreCandidate(
      searchable,
      publicationDate,
      options.discoveryDate,
    );
    const candidate = { canonicalUrl, title, publicationDate, score };
    const existing = unique.get(canonicalUrl);
    if (!existing || candidate.score > existing.score)
      unique.set(canonicalUrl, candidate);
  }
  return [...unique.values()]
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.publicationDate ?? "").localeCompare(a.publicationDate ?? "") ||
        a.canonicalUrl.localeCompare(b.canonicalUrl),
    )
    .slice(0, Math.max(1, Math.min(options.maxItems, 40)));
}

function extractFeedLinks(xml: string, baseUrl: string) {
  const entries = [
    ...xml.matchAll(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi),
  ];
  return entries.flatMap((match) => {
    const entry = match[0];
    const title = decodeXml(textValue(entry, "title"));
    const rawLink =
      textValue(entry, "link") ||
      entry.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1] ||
      "";
    if (!title || !rawLink) return [];
    try {
      return [
        {
          canonicalUrl: normaliseCanonicalUrl(
            new URL(decodeXml(rawLink), baseUrl).toString(),
          ),
          title,
          publicationDate: normaliseFeedDate(
            textValue(entry, "pubDate") ||
              textValue(entry, "published") ||
              textValue(entry, "updated"),
          ),
        },
      ];
    } catch {
      return [];
    }
  });
}

function textValue(value: string, tag: string) {
  return (
    value
      .match(
        new RegExp(
          `<${tag}\\b[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
          `i`,
        ),
      )?.[1]
      ?.trim() ?? ""
  );
}
function decodeXml(value: string) {
  return stripHtml(value).replace(/\s+/g, " ").trim();
}

function normaliseFeedDate(value: string) {
  return (
    normaliseDate(value) ??
    normaliseDate(value.replace(/\s+-\s+(\d{1,2}:\d{2})$/, " $1"))
  );
}

function inferPublicationDate(value: string, referenceDate?: string) {
  const iso = value.match(
    /\b(20\d{2})[/.\-](0?[1-9]|1[0-2])[/.\-](0?[1-9]|[12]\d|3[01])\b/,
  );
  if (iso) return normaliseDate(`${iso[1]}-${iso[2]}-${iso[3]}`);
  const dayMonth = value.match(
    /\b(0?[1-9]|[12]\d|3[01])[/.\-](0?[1-9]|1[0-2])(?:[/.\-](20\d{2}|\d{2}))?\b/,
  );
  if (dayMonth) {
    const rawYear = dayMonth[3] ?? referenceDate?.slice(0, 4);
    const year = rawYear?.length === 2 ? `20${rawYear}` : rawYear;
    if (year) return normaliseDate(`${year}-${dayMonth[2]}-${dayMonth[1]}`);
  }
  const named = value.match(
    /\b(0?[1-9]|[12]\d|3[01])\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(20\d{2})\b/i,
  );
  if (named) {
    const month = monthNumber(named[2]);
    return normaliseDate(`${named[3]}-${month}-${named[1]}`);
  }
  return null;
}

function scoreCandidate(
  searchable: string,
  publicationDate: string | null,
  discoveryDate: string,
) {
  let score = strategicTerms.reduce(
    (total, term) => total + (searchable.includes(term) ? 2 : 0),
    0,
  );
  if (
    /press release|announcement|results|consultation|guidance/.test(searchable)
  )
    score += 3;
  if (publicationDate) {
    const ageDays =
      (Date.parse(`${discoveryDate}T12:00:00Z`) -
        Date.parse(`${publicationDate}T12:00:00Z`)) /
      86_400_000;
    if (ageDays >= -1 && ageDays <= 3) score += 14;
    else if (ageDays <= 14) score += 8;
    else if (ageDays <= 45) score += 3;
  }
  return score;
}

function normaliseSearchText(value: string) {
  return value
    .toLocaleLowerCase("en-IE")
    .replace(/[’']/g, "")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function monthNumber(value: string) {
  return String(
    [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ].indexOf(value.slice(0, 3).toLocaleLowerCase("en-IE")) + 1,
  ).padStart(2, "0");
}
